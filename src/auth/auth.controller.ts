import { Body, Controller, Get, Post, Query, Render, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { PublicAccess } from "./decorators/public.decorator";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

// MVC-часть модуля аутентификации: страницы формы входа/регистрации и
// обработчики их отправки. Сама выдача/проверка токена — в AuthService,
// общем с AuthApiController (REST), логика не дублируется между ними.
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("login")
  @PublicAccess()
  @Render("auth/login")
  getLoginPage(@Req() req: Request, @Query("redirect") redirect?: string) {
    return {
      title: "Вход - PowerGit Gym",
      activePage: "login",
      user: req.user,
      redirect: redirect ?? "/",
      error: null,
    };
  }

  @Post("login")
  @PublicAccess()
  async login(
    @Body() dto: LoginDto,
    @Query("redirect") redirect: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.login(dto);
      res.cookie(this.authService.cookieName, result.accessToken, this.authService.cookieOptions);

      return res.redirect(redirect || "/");
    } catch {
      return res.status(401).render("auth/login", {
        title: "Вход - PowerGit Gym",
        activePage: "login",
        user: null,
        redirect: redirect ?? "/",
        error: "Неверный email или пароль",
        email: dto.email,
      });
    }
  }

  @Get("register")
  @PublicAccess()
  @Render("auth/register")
  getRegisterPage(@Req() req: Request) {
    return {
      title: "Регистрация - PowerGit Gym",
      activePage: "register",
      user: req.user,
      error: null,
    };
  }

  @Post("register")
  @PublicAccess()
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    try {
      const result = await this.authService.register(dto);
      res.cookie(this.authService.cookieName, result.accessToken, this.authService.cookieOptions);

      return res.redirect("/");
    } catch (error) {
      const message =
        (error as { code?: string })?.code === "P2002"
          ? "Пользователь с таким email уже зарегистрирован"
          : "Не удалось зарегистрироваться";

      return res.status(409).render("auth/register", {
        title: "Регистрация - PowerGit Gym",
        activePage: "register",
        user: null,
        error: message,
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
      });
    }
  }

  @Post("logout")
  @PublicAccess()
  logout(@Res() res: Response) {
    res.clearCookie(this.authService.cookieName, { path: "/" });

    return res.redirect("/");
  }
}
