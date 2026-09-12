import { Controller, Get, Query, Render, Req } from "@nestjs/common";
import { Request } from "express";
import { PublicAccess } from "./decorators/public.decorator";

// MVC-часть модуля аутентификации: страницы форм входа/регистрации.
// Сама отправка формы, выдача сессии и выход выполняются на клиенте через
// fetch к маршрутам, которые генерирует сам SuperTokens SDK
// (POST /auth/signup, /auth/signin, /auth/signout — см. AuthModule,
// buildSuperTokensConfig) — см. public/js/auth-forms.js. Здесь остаются
// только страницы, которые нужно отрендерить (GET).
@Controller()
export class AuthController {
  @Get("login")
  @PublicAccess()
  @Render("auth/login")
  getLoginPage(@Req() req: Request, @Query("redirect") redirect?: string) {
    return {
      title: "Вход - PowerGit Gym",
      activePage: "login",
      user: req.user,
      redirect: redirect ?? "/",
    };
  }

  @Get("register")
  @PublicAccess()
  @Render("auth/register")
  getRegisterPage(@Req() req: Request) {
    return {
      title: "Регистрация - PowerGit Gym",
      activePage: "register",
      user: req.user,
    };
  }
}
