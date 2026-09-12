import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlContextType } from "@nestjs/graphql";
import { Role } from "@prisma/client";
import { UserRoleClaim } from "supertokens-node/recipe/userroles";
import type { SessionRequest } from "supertokens-node/framework/express";
import { ROLES_KEY } from "../decorators/roles.decorator";

// Второй, отдельный от SessionAuthGuard гвард — реализует авторизацию по
// ролям (см. https://docs.nestjs.com/security/authorization, на который
// ссылается задание): проверяет не факт аутентификации, а то, что роль
// пользователя (клейм UserRoleClaim recipe UserRoles) входит в список,
// заданный декоратором @Roles(...). Подключён глобально вслед за
// SessionAuthGuard, поэтому request.session на этом этапе уже провален
// (см. @PublicAccess()) или гарантированно есть.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType<GqlContextType>() === "graphql") {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Эндпоинт без @Roles(...) — доступен любому аутентифицированному
    // пользователю (сам факт аутентификации уже проверен SessionAuthGuard).
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<SessionRequest>();

    if (!request.session) {
      throw new ForbiddenException("Недостаточно прав для выполнения этого действия");
    }

    let roles = await request.session.getClaimValue(UserRoleClaim);

    if (!roles) {
      // Клеймы читаются из уже провалидированного токена без обращения к
      // Core — но если роль назначили ПОСЛЕ выпуска текущей сессии, клейма
      // в токене ещё может не быть. Донабираем его явно перед отказом.
      await request.session.fetchAndSetClaim(UserRoleClaim);
      roles = await request.session.getClaimValue(UserRoleClaim);
    }

    if (!roles || !requiredRoles.some((role) => roles!.includes(role))) {
      throw new ForbiddenException("Недостаточно прав для выполнения этого действия");
    }

    return true;
  }
}
