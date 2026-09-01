import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Min } from "class-validator";
import { Category } from "@prisma/client";

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: "Название товара",
    minLength: 2,
    maxLength: 120,
    example: "Сывороточный протеин",
  })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({
    description: "Категория товара",
    enum: Category,
    example: Category.PROTEIN,
  })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @ApiPropertyOptional({ description: "Цена, ₽", minimum: 0, example: 2400 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: "Описание товара",
    maxLength: 500,
    example: "Быстроусвояемый протеин, 900 г.",
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    description: "Остаток на складе, шт.",
    minimum: 0,
    example: 40,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;
}
