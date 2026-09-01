import { Transform, Type } from "class-transformer";
import { IsArray, IsInt, IsNumber, IsString, Length, Min } from "class-validator";

export class CreateMembershipDto {
  @IsString()
  @Length(2, 80)
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration: number;

  // HTML-форма присылает список преимуществ построчно в textarea,
  // здесь превращаем его в массив строк для Prisma (String[]).
  @Transform(({ value }) =>
    typeof value === "string"
      ? value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsString({ each: true })
  features: string[];
}
