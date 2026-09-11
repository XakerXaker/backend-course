import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { GqlContextType } from "@nestjs/graphql";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { Request } from "express";
import { ROLES_KEY } from "../decorators/roles.decorator";

// Второй, отдельный от JwtAuthGuard гвард — реализует авторизацию по ролям
// (см. https://docs.nestjs.com/security/authorization, на который ссылается
// задание): проверяет не факт аутентификации, а то, что роль пользователя
// входит в список, заданный декоратором @Roles(...). Подключён глобально
// вслед за JwtAuthGuard, поэтому request.user на этом этапе уже есть у
// любого запроса, прошедшего первый гвард.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType<GqlContextType>() === "graphql") {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Эндпоинт без @Roles(...) — доступен любому аутентифицированному
    // пользователю (сам факт аутентификации уже проверен JwtAuthGuard).
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (!request.user || !requiredRoles.includes(request.user.role)) {
      throw new ForbiddenException(
        "Недостаточно прав для выполнения этого действия",
      );
    }

    return true;
  }
}
