import { Field, Float, InputType } from "@nestjs/graphql";
import { IsEnum, IsNumber, IsOptional, IsString, Length, Min } from "class-validator";
import { Category } from "@prisma/client";
import { ProductCategory } from "./product-category.enum";

@InputType()
export class CreateProductInput {
  @Field({ description: "Название товара" })
  @IsString()
  @Length(2, 120)
  name: string;

  @Field(() => ProductCategory, { description: "Категория товара" })
  @IsEnum(Category)
  category: Category;

  @Field(() => Float, { description: "Цена, ₽" })
  @IsNumber()
  @Min(0)
  price: number;

  @Field({ nullable: true, description: "Описание товара" })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
