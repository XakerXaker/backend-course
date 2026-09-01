import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 100)
  password: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  phone?: string;

  // Пустая опция "Без абонемента" в <select> приходит как "" — приводим её
  // к null, чтобы IsOptional пропустил проверку IsUUID, а сервис мог явно
  // сохранить "абонемент не выбран" вместо отсутствия поля.
  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsUUID()
  membershipId?: string | null;
}
