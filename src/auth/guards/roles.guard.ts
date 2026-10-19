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

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<SessionRequest>();

    if (!request.session) {
      throw new ForbiddenException("Недостаточно прав для выполнения этого действия");
    }

    let roles = await request.session.getClaimValue(UserRoleClaim);

    if (!roles) {
      await request.session.fetchAndSetClaim(UserRoleClaim);
      roles = await request.session.getClaimValue(UserRoleClaim);
    }

    if (!roles || !requiredRoles.some((role) => roles!.includes(role))) {
      throw new ForbiddenException("Недостаточно прав для выполнения этого действия");
    }

    return true;
  }
}
