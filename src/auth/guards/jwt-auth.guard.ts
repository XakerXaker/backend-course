import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { GqlContextType } from "@nestjs/graphql";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

// Единственная ответственность гварда (см. документацию NestJS про Guards,
// на которую ссылается задание ЛР7): решить, будет ли запрос передан
// обработчику маршрута, или нет — само распознавание токена и заполнение
// req.user выполняет CurrentUserMiddleware, отдельно от гварда, как и
// рекомендуется в задании ("аутентификация... обрабатывается через
// middleware... guard'ы определяют, будет ли запрос обработан").
//
// Подключён глобально (см. AppModule, APP_GUARD) — по умолчанию требует
// аутентификации для ЛЮБОГО REST/MVC-эндпоинта; чтобы разрешить анонимный
// доступ, эндпоинт нужно явно пометить декоратором @PublicAccess().
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // GraphQL-резолверы (ЛР5) в эту лабораторную не входят — там нет ни
    // @PublicAccess(), ни @Roles(), поэтому глобальный гвард их не трогает.
    if (context.getType<GqlContextType>() === "graphql") {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (!request.user) {
      throw new UnauthorizedException(
        "Для доступа к этому ресурсу необходимо войти в систему",
      );
    }

    return true;
  }
}
