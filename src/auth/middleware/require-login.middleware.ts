import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

// Middleware, о котором прямо говорится в задании ЛР7: обрабатывает
// сценарий "неаутентифицированный посетитель запросил страницу, доступную
// только после входа" — переадресует на форму логина, вместо того чтобы
// отдать JSON 401 (как это делает SessionAuthGuard для REST API).
//
// Подключается не глобально, а точечно — через MiddlewareConsumer в
// configure() тех модулей, чьи MVC-страницы требуют входа (см.
// TrainersModule/MembershipsModule/ProductsModule/UsersModule/
// ReviewsModule), как и предлагает документация NestJS про Middleware
// Consumer, на которую ссылается задание.
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
