import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedUser } from "../interfaces/jwt-payload.interface";

// Достаёт текущего пользователя из request.user, куда его кладёт
// CurrentUserMiddleware. Используется в контроллерах для проверок вида
// "автор или администратор" внутри самого обработчика (см.
// UsersController/UsersApiController) — там, где одного Guard'а с ролью
// недостаточно, потому что доступ зависит ещё и от :id из маршрута.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
