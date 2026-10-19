import { Controller, Get } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { ApiErrorResponseDto } from "../common/dto/api-error-response.dto";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthenticatedUser } from "./interfaces/authenticated-user.interface";

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
