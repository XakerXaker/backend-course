import { Controller, Get, Render, Req } from "@nestjs/common";
import { Request } from "express";
import { PublicAccess } from "./auth/decorators/public.decorator";
import { MembershipsService } from "./memberships/memberships.service";
import { ProductsService } from "./products/products.service";
import { ReviewsService } from "./reviews/reviews.service";
import { TrainersService } from "./trainers/trainers.service";

// Здесь остаются только общие страницы, не привязанные к конкретному
// поддомену (главная, "О нас", "Оснащение", "Контакты"). Цены/абонементы,
// питание, тренеры и отзывы обслуживаются собственными модулями —
// см. MembershipsController ("/pricing"), ProductsController ("/nutrition"),
// TrainersController, ReviewsController.
@Controller()
export class AppController {
  constructor(
    private readonly trainersService: TrainersService,
    private readonly reviewsService: ReviewsService,
    private readonly membershipsService: MembershipsService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  @PublicAccess()
  @Render("index")
  async getIndexPage(@Req() req: Request) {
    const trainers = await this.trainersService.findAll();
    const reviews = await this.reviewsService.findAll(3);
    const memberships = await this.membershipsService.findAll();
    const categories = await this.productsService.findCategorized();

    return {
      title: "PowerGit Gym - Сила воли твой результат",
      activePage: "index",
      user: req.user,
      trainers,
      reviews,
      categories,
      memberships,
    };
  }

  @Get("about")
  @PublicAccess()
  @Render("about")
  getAboutPage(@Req() req: Request) {
    return {
      title: "О нас - PowerGit Gym",
      activePage: "about",
      user: req.user,
    };
  }

  @Get("facilities")
  @PublicAccess()
  @Render("facilities")
  getFacilitiesPage(@Req() req: Request) {
    return {
      title: "Оснащение - PowerGit Gym",
      activePage: "facilities",
      user: req.user,
    };
  }

  @Get("contact")
  @PublicAccess()
  @Render("contact")
  async getContactPage(@Req() req: Request) {
    const trainers = await this.trainersService.findAll();

    return {
      title: "Контакты - PowerGit Gym",
      activePage: "contact",
      user: req.user,
      trainers,
    };
  }
}
