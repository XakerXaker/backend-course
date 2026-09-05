import { Field, Float, ID, Int, ObjectType } from "@nestjs/graphql";
import { ProductCategory } from "./product-category.enum";

@ObjectType("Product", { description: "Товар спортивного питания" })
export class ProductType {
  @Field(() => ID, { description: "Идентификатор товара" })
  id: string;

  @Field({ description: "Название товара" })
  name: string;

  @Field(() => ProductCategory, { description: "Категория товара" })
  category: ProductCategory;

  @Field(() => Float, { description: "Цена, ₽" })
  price: number;

  @Field({ nullable: true, description: "Описание товара" })
  description?: string | null;

  @Field(() => Int, { description: "Остаток на складе, шт." })
  stock: number;

  @Field({ description: "Дата создания записи" })
  createdAt: Date;

  @Field({ description: "Дата последнего обновления записи" })
  updatedAt: Date;
}
