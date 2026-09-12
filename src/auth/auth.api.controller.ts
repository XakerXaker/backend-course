import { Controller, Get } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { ApiErrorResponseDto } from "../common/dto/api-error-response.dto";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthenticatedUser } from "./interfaces/authenticated-user.interface";

// Регистрация/вход/выход теперь обслуживает сам SuperTokens SDK —
// POST /auth/signup, /auth/signin, /auth/signout, /auth/session/refresh
// (см. AuthModule, buildSuperTokensConfig) генерируются автоматически, их
// не нужно (и не имеет смысла) дублировать здесь. Единственный собственный
// REST-эндпоинт аутентификации — "кто я сейчас" (SuperTokens его "из
// коробки" не даёт: сессия — не то же самое, что профиль пользователя).
@ApiTags("Auth API")
@Controller("api/auth")
export class AuthApiController {
  @Get("me")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Получить профиль текущего аутентифицированного пользователя" })
  @ApiOkResponse({ description: "Текущий пользователь" })
  @ApiUnauthorizedResponse({ description: "Не аутентифицирован", type: ApiErrorResponseDto })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
