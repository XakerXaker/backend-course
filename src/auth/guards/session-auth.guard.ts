import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlContextType } from "@nestjs/graphql";
import { Response } from "express";
import Session from "supertokens-node/recipe/session";
import type { SessionRequest } from "supertokens-node/framework/express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

// Единственная ответственность гварда (см. документацию NestJS про Guards,
// на которую ссылается задание ЛР7): решить, будет ли запрос передан
// обработчику маршрута, или нет — саму проверку токена и заполнение
// request.session выполняет SuperTokens (Session.getSession), а не гвард.
//
// Подключён глобально (см. AuthModule, APP_GUARD) — по умолчанию требует
// аутентификации для ЛЮБОГО REST/MVC-эндпоинта; чтобы разрешить анонимный
// доступ, эндпоинт нужно явно пометить декоратором @PublicAccess().
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // GraphQL-резолверы (ЛР5) в эту лабораторную не входят — там нет ни
    // @PublicAccess(), ни @Roles(), поэтому глобальный гвард их не трогает.
    if (context.getType<GqlContextType>() === "graphql") {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<SessionRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      // sessionRequired: false — сам по себе не бросает исключение для
      // гостя (просто вернёт undefined); нужен ли вход решает НАША
      // метаданная @PublicAccess() ниже, а не настройки SuperTokens.
      request.session = await Session.getSession(request, response, { sessionRequired: false });
    } catch (error) {
      if (!Session.Error.isErrorFromSuperTokens(error)) {
        throw error;
      }

      // Просроченный/битый/поддельный токен — не блокируем запрос здесь,
      // просто считаем, что сессии нет; решение — ниже.
      request.session = undefined;
    }

    if (isPublic) {
      return true;
    }

    if (!request.session) {
      throw new UnauthorizedException(
        "Для доступа к этому ресурсу необходимо войти в систему",
      );
    }

    return true;
  }
}
