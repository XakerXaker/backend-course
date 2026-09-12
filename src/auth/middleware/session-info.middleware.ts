import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Response } from "express";
import Session from "supertokens-node/recipe/session";
import { UserRoleClaim } from "supertokens-node/recipe/userroles";
import type { SessionRequest } from "supertokens-node/framework/express";
import { Role } from "@prisma/client";

// Middleware — то самое место, которое, согласно документации NestJS
// (процитированной в задании ЛР7), отвечает за аутентификацию: пытается
// прочитать и проверить сессию и прикрепляет к request упрощённые данные о
// пользователе. Guards ниже по цепочке уже просто смотрят на
// request.session/request.user, не занимаясь самой проверкой токена.
//
// Подключается глобально (см. AuthModule.configure()), поэтому и
// request.session, и request.user доступны на КАЖДОЙ странице/эндпоинте —
// это нужно не только гвардам, но и вьюшкам (шапка сайта показывает
// "Вы вошли как ..." везде, а не только на защищённых страницах).
@Injectable()
export class SessionInfoMiddleware implements NestMiddleware {
  private readonly logger = new Logger("SessionInfoMiddleware");

  async use(req: SessionRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await Session.getSession(req, res, { sessionRequired: false });

      if (session) {
        req.session = session;

        const payload = session.getAccessTokenPayload() ?? {};
        const roles = (await session.getClaimValue(UserRoleClaim)) ?? [];

        req.user = {
          id: session.getUserId(),
          email: typeof payload.email === "string" ? payload.email : null,
          name: typeof payload.name === "string" ? payload.name : null,
          isAdmin: roles.includes(Role.ADMIN),
        };
      }
    } catch (error) {
      // Просроченный/битый/поддельный токен — ожидаемо и не блокирует
      // запрос (не ответственность middleware, см. SessionAuthGuard),
      // но НЕИЗВЕСТНАЯ ошибка (например, cookie есть, а Core недоступен
      // для проверки клеймов) раньше проглатывалась молча — теперь хотя бы
      // видно в логе сервера, что реально происходит.
      if (!Session.Error.isErrorFromSuperTokens(error)) {
        this.logger.warn(`Не удалось прочитать сессию: ${(error as Error).message}`);
      }
    }

    next();
  }
}
