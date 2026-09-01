import { Body, Controller, Get, Param, Post, Query, Render, Res } from "@nestjs/common";
import { Category } from "@prisma/client";
import { Response } from "express";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CATEGORY_LABELS, ProductsService } from "./products.service";

// Контроллер обслуживает публичный маршрут "/nutrition" (пункт меню "Питание").
@Controller("nutrition")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  private getUser(auth: string) {
    if (auth === "true") {
      return { name: "Иван Иванов", email: "ivan@powergitgym.ru" };
    }
    return null;
  }

  @Get()
  @Render("products/list")
  async getCollectionPage(@Query("auth") auth: string) {
    const categories = await this.productsService.findCategorized();

    return {
      title: "Питание - PowerGit Gym",
      activePage: "nutrition",
      user: this.getUser(auth),
      auth,
      categories,
    };
  }

  @Get("add")
  @Render("products/form")
  getCreatePage(@Query("auth") auth: string) {
    return {
      title: "Добавить товар - PowerGit Gym",
      activePage: "nutrition",
      user: this.getUser(auth),
      auth,
      formTitle: "Добавление товара",
      formAction: `/nutrition?auth=${auth || "false"}`,
      submitLabel: "Создать",
      isEdit: false,
      categoryOptions: this.buildCategoryOptions(),
      product: { name: "", category: "PROTEIN", price: 0, stock: 0, description: "" },
    };
  }

  @Get(":id/edit")
  @Render("products/form")
  async getUpdatePage(@Param("id") id: string, @Query("auth") auth: string) {
    const product = await this.productsService.findOne(id);

    return {
      title: "Редактировать товар - PowerGit Gym",
      activePage: "nutrition",
      user: this.getUser(auth),
      auth,
      formTitle: "Редактирование товара",
      formAction: `/nutrition/${id}/edit?auth=${auth || "false"}`,
      submitLabel: "Сохранить",
      isEdit: true,
      categoryOptions: this.buildCategoryOptions(product.category),
      product,
    };
  }

  @Post()
  async create(
    @Body() createProductDto: CreateProductDto,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    await this.productsService.create(createProductDto);

    return res.redirect(`/nutrition?auth=${auth || "false"}`);
  }

  @Post(":id/edit")
  async updateFromForm(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    await this.productsService.update(id, updateProductDto);

    return res.redirect(`/nutrition?auth=${auth || "false"}`);
  }

  @Post(":id/delete")
  async removeFromForm(
    @Param("id") id: string,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    await this.productsService.remove(id);

    return res.redirect(`/nutrition?auth=${auth || "false"}`);
  }

  private buildCategoryOptions(selected?: Category) {
    return Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
      value,
      label,
      selected: value === selected,
    }));
  }
}
