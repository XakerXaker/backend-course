import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Min } from "class-validator";
import { Category } from "@prisma/client";

export class CreateProductDto {
  @ApiProperty({
    description: "Название товара",
    minLength: 2,
    maxLength: 120,
    example: "Сывороточный протеин",
  })
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiProperty({
    description: "Категория товара",
    enum: Category,
    example: Category.PROTEIN,
  })
  @IsEnum(Category)
  category: Category;

  @ApiProperty({ description: "Цена, ₽", minimum: 0, example: 2200 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

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
    description: "Остаток на складе, шт. По умолчанию 0.",
    minimum: 0,
    default: 0,
    example: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;
}
