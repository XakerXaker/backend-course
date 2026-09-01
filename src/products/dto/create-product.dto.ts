import { Type } from "class-transformer";
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Min } from "class-validator";
import { Category } from "@prisma/client";

export class CreateProductDto {
  @IsString()
  @Length(2, 120)
  name: string;

  @IsEnum(Category)
  category: Category;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;
}
