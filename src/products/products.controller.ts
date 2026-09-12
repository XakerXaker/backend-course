import { Body, Controller, Get, Param, Post, Render, Req, Res } from "@nestjs/common";
import { Category, Role } from "@prisma/client";
import { Request, Response } from "express";
import { PublicAccess } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CATEGORY_LABELS, ProductsService } from "./products.service";

// Контроллер обслуживает публичный маршрут "/nutrition" (пункт меню
// "Питание"); add/edit/delete — только для администратора (см. ЛР7).
@Controller("nutrition")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @PublicAccess()
  @Render("products/list")
  async getCollectionPage(@Req() req: Request) {
    const categories = await this.productsService.findCategorized();

    return {
      title: "Питание - PowerGit Gym",
      activePage: "nutrition",
      user: req.user,
      isAdmin: req.user?.isAdmin ?? false,
      categories,
    };
  }

  @Get("add")
  @Roles(Role.ADMIN)
  @Render("products/form")
  getCreatePage(@Req() req: Request) {
    return {
      title: "Добавить товар - PowerGit Gym",
      activePage: "nutrition",
      user: req.user,
      formTitle: "Добавление товара",
      formAction: "/nutrition",
      submitLabel: "Создать",
      isEdit: false,
      categoryOptions: this.buildCategoryOptions(),
      // price/stock — пустая строка, а не число, иначе в
      // <input type="number"> остаётся "0" и печатать приходится поверх него.
      product: { name: "", category: "PROTEIN", price: "", stock: "", description: "" },
    };
  }

  @Get(":id/edit")
  @Roles(Role.ADMIN)
  @Render("products/form")
  async getUpdatePage(@Param("id") id: string, @Req() req: Request) {
    const product = await this.productsService.findOne(id);

    return {
      title: "Редактировать товар - PowerGit Gym",
      activePage: "nutrition",
      user: req.user,
      formTitle: "Редактирование товара",
      formAction: `/nutrition/${id}/edit`,
      submitLabel: "Сохранить",
      isEdit: true,
      categoryOptions: this.buildCategoryOptions(product.category),
      product,
    };
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() createProductDto: CreateProductDto, @Res() res: Response) {
    await this.productsService.create(createProductDto);

    return res.redirect("/nutrition");
  }

  @Post(":id/edit")
  @Roles(Role.ADMIN)
  async updateFromForm(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Res() res: Response,
  ) {
    await this.productsService.update(id, updateProductDto);

    return res.redirect("/nutrition");
  }

  @Post(":id/delete")
  @Roles(Role.ADMIN)
  async removeFromForm(@Param("id") id: string, @Res() res: Response) {
    await this.productsService.remove(id);

    return res.redirect("/nutrition");
  }

  private buildCategoryOptions(selected?: Category) {
    return Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
      value,
      label,
      selected: value === selected,
    }));
  }
}
