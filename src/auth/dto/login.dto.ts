import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Length } from "class-validator";

export class LoginDto {
  @ApiProperty({ description: "Email участника", example: "ivan@powergitgym.ru" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Пароль", example: "secret123" })
  @IsString()
  @Length(6, 100)
  password: string;
}
