import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Response } from "express";
import Session from "supertokens-node/recipe/session";
import { UserRoleClaim } from "supertokens-node/recipe/userroles";
import type { SessionRequest } from "supertokens-node/framework/express";
import { Role } from "@prisma/client";

@Injectable()
export class SessionInfoMiddleware implements NestMiddleware {
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
    } catch {
    }

    next();
  }
}
