import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlContextType } from "@nestjs/graphql";
import { Response } from "express";
import Session from "supertokens-node/recipe/session";
import type { SessionRequest } from "supertokens-node/framework/express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
      request.session = await Session.getSession(request, response, { sessionRequired: false });
    } catch (error) {
      if (!Session.Error.isErrorFromSuperTokens(error)) {
        throw error;
      }

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
