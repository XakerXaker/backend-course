import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from "class-validator";

export class UpdateMembershipDto {
  @ApiPropertyOptional({
    description: "Название абонемента",
    minLength: 2,
    maxLength: 80,
    example: "VIP",
  })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @ApiPropertyOptional({ description: "Цена, ₽", minimum: 0, example: 5500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: "Срок действия, месяцев",
    minimum: 1,
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({
    description: "Список преимуществ",
    type: [String],
    example: ["24/7", "Персональные тренировки", "Фитнес-браслет"],
  })
  @IsOptional()
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
  features?: string[];
}
