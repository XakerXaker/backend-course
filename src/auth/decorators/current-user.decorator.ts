import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";

// Достаёт текущего пользователя из request.user, куда его кладёт
// SessionInfoMiddleware. Используется в контроллерах для проверок вида
// "свой профиль" (см. ProfileController) — там, где одного Guard'а с ролью
// недостаточно, потому что доступ зависит ещё и от :id из маршрута.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
