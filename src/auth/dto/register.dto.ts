import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Length } from "class-validator";

// Публичная самостоятельная регистрация посетителя (см. AuthController) —
// сознательно не даёт выбрать абонемент или роль, в отличие от
// UsersController/UsersApiController ("Участники"), которыми пользуется
// только администратор для полноценного управления учётными записями.
export class RegisterDto {
  @ApiProperty({ description: "Email", example: "ivan@powergitgym.ru" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Пароль", minLength: 6, maxLength: 100, example: "secret123" })
  @IsString()
  @Length(6, 100)
  password: string;

  @ApiPropertyOptional({ description: "Имя", example: "Иван Иванов" })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({ description: "Телефон", example: "+7 900 123-45-67" })
  @IsOptional()
  @IsString()
  @Length(0, 30)
  phone?: string;
}
