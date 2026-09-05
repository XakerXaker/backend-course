import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { paginatedComplexity } from "../graphql/complexity";
import { Paginated } from "../graphql/paginated.type";
import { PaginationArgs } from "../graphql/pagination.args";
import { CreateProductInput } from "./graphql/create-product.input";
import { ProductType } from "./graphql/product.type";
import { UpdateProductInput } from "./graphql/update-product.input";
import { ProductsService } from "./products.service";

const PaginatedProduct = Paginated(ProductType);

@Resolver(() => ProductType)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Query(() => PaginatedProduct, {
    name: "products",
    description: "Список товаров постранично",
    complexity: paginatedComplexity,
  })
  findAll(@Args() pagination: PaginationArgs) {
    return this.productsService.findAllPaginated(pagination.page, pagination.limit);
  }

  @Query(() => ProductType, { name: "product", description: "Товар по идентификатору" })
  findOne(@Args("id", { type: () => ID }) id: string) {
    return this.productsService.findOne(id);
  }

  @Mutation(() => ProductType, { description: "Добавить новый товар (остаток на складе — 0)" })
  createProduct(@Args("input") input: CreateProductInput) {
    return this.productsService.create(input);
  }

  @Mutation(() => ProductType, { description: "Изменить данные товара (кроме остатка на складе)" })
  updateProduct(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateProductInput,
  ) {
    return this.productsService.update(id, input);
  }

  @Mutation(() => ProductType, { description: "Удалить товар" })
  removeProduct(@Args("id", { type: () => ID }) id: string) {
    return this.productsService.remove(id);
  }

  @Mutation(() => ProductType, { description: "Пополнить остаток товара на складе" })
  restockProduct(
    @Args("id", { type: () => ID }) id: string,
    @Args("quantity", { type: () => Int }) quantity: number,
  ) {
    return this.productsService.restock(id, quantity);
  }

  @Mutation(() => ProductType, { description: "Списать товар со склада (продажа)" })
  sellProduct(
    @Args("id", { type: () => ID }) id: string,
    @Args("quantity", { type: () => Int }) quantity: number,
  ) {
    return this.productsService.sell(id, quantity);
  }
}
