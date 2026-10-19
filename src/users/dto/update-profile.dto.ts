import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Length } from "class-validator";

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
