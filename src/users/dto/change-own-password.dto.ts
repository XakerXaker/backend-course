import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

// Отличается от смены пароля администратором (UsersService.changePassword
// вызывается напрямую по id) тем, что требует подтвердить ТЕКУЩИЙ пароль —
// используется только на self-service странице "Мой профиль".
export class ChangeOwnPasswordDto {
  @ApiProperty({ description: "Текущий пароль" })
  @IsString()
  @Length(6, 100)
  currentPassword: string;

  @ApiProperty({ description: "Новый пароль", minLength: 6, maxLength: 100 })
  @IsString()
  @Length(6, 100)
  newPassword: string;
}
