import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "@prisma/client";

class AuthenticatedUserDto {
  @ApiProperty({ example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f" })
  id: string;

  @ApiProperty({ example: "ivan@powergitgym.ru" })
  email: string;

  @ApiPropertyOptional({ example: "Иван Иванов" })
  name?: string | null;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;
}

// Ответ на вход/регистрацию: сам токен ставится ещё и в httpOnly cookie
// (см. AuthApiController) — так его получит браузер. В теле ответа токен
// продублирован для клиентов, которым неудобно читать httpOnly cookie
// напрямую (curl/Postman без cookie jar, мобильный клиент), — ровно тот
// сценарий проверки через Postman, который описан в задании ЛР7.
export class AuthResponseDto {
  @ApiProperty({
    description: "JWT access-токен (тот же, что уходит в cookie)",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;

  @ApiProperty({ type: AuthenticatedUserDto })
  user: AuthenticatedUserDto;
}
