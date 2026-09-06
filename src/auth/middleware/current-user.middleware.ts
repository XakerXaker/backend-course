import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { NextFunction, Request, Response } from "express";
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from "../interfaces/auth-module-options.interface";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

// Middleware — то самое место, которое, согласно документации NestJS
// (процитированной в задании ЛР7), отвечает за аутентификацию: читает
// токен и прикрепляет свойство к объекту request. Guards ниже по цепочке
// уже просто смотрят на req.user, не занимаясь самой проверкой токена.
//
// Подключается глобально (см. AppModule.configure()), поэтому req.user
// доступен на КАЖДОЙ странице/эндпоинте — это нужно не только гвардам, но
// и вьюшкам (шапка сайта показывает "Вы вошли как ..." везде, а не только
// на защищённых страницах).
@Injectable()
export class CurrentUserMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(AUTH_MODULE_OPTIONS) private readonly options: AuthModuleOptions,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const token = this.extractToken(req);

    if (token) {
      try {
        req.user = this.jwtService.verify<JwtPayload>(token, {
          secret: this.options.jwtSecret,
        });
      } catch {
        // Просроченный/битый/поддельный токен — не блокируем запрос здесь,
        // это не ответственность middleware (см. JwtAuthGuard): просто
        // оставляем req.user незаполненным, дальше решает гвард.
      }
    }

    next();
  }

  private extractToken(req: Request): string | undefined {
    const cookieToken = req.cookies?.[this.options.cookieName];

    if (cookieToken) {
      return cookieToken;
    }

    // Дополнительно поддерживаем заголовок Authorization: Bearer <token> —
    // удобно для проверки REST API через Postman/curl без работы с cookie
    // (см. скриншоты в задании про проверку через Postman).
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice("Bearer ".length);
    }

    return undefined;
  }
}
