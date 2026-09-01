import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(6, 100)
  password?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsUUID()
  membershipId?: string | null;
}
