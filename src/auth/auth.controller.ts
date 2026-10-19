import { Controller, Get, Query, Render, Req } from "@nestjs/common";
import { Request } from "express";
import { PublicAccess } from "./decorators/public.decorator";

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
