import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional({ description: "Email участника", example: "ivan@powergitgym.ru" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: "Новый пароль (необязательно)",
    minLength: 6,
    maxLength: 100,
    example: "newsecret123",
  })
  @IsOptional()
  @IsString()
  @Length(6, 100)
  password?: string;

  @ApiPropertyOptional({
    description: "Имя участника",
    minLength: 2,
    maxLength: 120,
    example: "Иван Иванов",
  })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({
    description: "Телефон",
    maxLength: 30,
    example: "+7 900 123-45-67",
  })
  @IsOptional()
  @IsString()
  @Length(0, 30)
  phone?: string;

  @ApiPropertyOptional({
    description:
      "Идентификатор абонемента (Membership.id). Пустая строка снимает текущий абонемент.",
    example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f",
  })
  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsUUID()
  membershipId?: string | null;
}
