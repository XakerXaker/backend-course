import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class RequireLoginMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      const redirectTo = encodeURIComponent(req.originalUrl);
      res.redirect(`/login?redirect=${redirectTo}`);
      return;
    }

    next();
  }
}
