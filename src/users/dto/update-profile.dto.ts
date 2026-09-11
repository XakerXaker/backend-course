import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Length } from "class-validator";

// Форма "Мой профиль" (см. ProfileController) — сознательно уже, чем
// UpdateUserDto: пользователь не может сам сменить себе абонемент
// (Membership) или роль — это остаётся операцией администратора
// (см. UsersController/UsersApiController, assignMembership/changeRole).
export class UpdateProfileDto {
  @ApiPropertyOptional({ description: "Email", example: "ivan@powergitgym.ru" })
  @IsOptional()
  @IsEmail()
  email?: string;

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
