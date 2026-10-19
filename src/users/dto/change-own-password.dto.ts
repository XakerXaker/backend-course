import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class ChangeOwnPasswordDto {
  @ApiProperty({ description: "Текущий пароль" })
  @IsString()
  @Length(8, 100)
  currentPassword: string;

  @ApiProperty({ description: "Новый пароль", minLength: 8, maxLength: 100 })
  @IsString()
  @Length(8, 100)
  newPassword: string;
}
