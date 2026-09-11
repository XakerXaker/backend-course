import { Body, Controller, Get, HttpCode, Post, Res } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { Response } from "express";
import { ApiErrorResponseDto } from "../common/dto/api-error-response.dto";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { PublicAccess } from "./decorators/public.decorator";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AuthenticatedUser } from "./interfaces/jwt-payload.interface";

@ApiTags("Auth API")
@Controller("api/auth")
export class AuthApiController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @PublicAccess()
  @ApiOperation({ summary: "Зарегистрироваться (публичная самостоятельная регистрация)" })
  @ApiCreatedResponse({ description: "Учётная запись создана, выдан токен", type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(dto);
    response.cookie(this.authService.cookieName, result.accessToken, this.authService.cookieOptions);

    return result;
  }

  @Post("login")
  @PublicAccess()
  @HttpCode(200)
  @ApiOperation({ summary: "Войти по email и паролю" })
  @ApiOkResponse({ description: "Вход выполнен, выдан токен", type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "Неверный email или пароль", type: ApiErrorResponseDto })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto);
    response.cookie(this.authService.cookieName, result.accessToken, this.authService.cookieOptions);

    return result;
  }

  @Post("logout")
  @PublicAccess()
  @HttpCode(204)
  @ApiOperation({ summary: "Выйти (сбросить cookie с токеном)" })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(this.authService.cookieName, { path: "/" });
  }

  @Get("me")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Получить профиль текущего аутентифицированного пользователя" })
  @ApiOkResponse({ description: "Текущий пользователь" })
  @ApiUnauthorizedResponse({ description: "Не аутентифицирован", type: ApiErrorResponseDto })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
