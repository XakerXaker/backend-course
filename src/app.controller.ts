import { Controller, Get, Query, Render } from "@nestjs/common";
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

  private getUser(auth: string) {
    if (auth === "true") {
      return { name: "Иван Иванов", email: "ivan@powergitgym.ru" };
    }
    return null;
  }

  @Get()
  @Render("index")
  async getIndexPage(@Query("auth") auth: string) {
    const trainers = await this.trainersService.findAll();
    const reviews = await this.reviewsService.findAll(3);
    const memberships = await this.membershipsService.findAll();
    const categories = await this.productsService.findCategorized();

    return {
      title: "PowerGit Gym - Сила воли твой результат",
      activePage: "index",
      user: this.getUser(auth),
      auth,
      trainers,
      reviews,
      categories,
      memberships,
    };
  }

  @Get("about")
  @Render("about")
  getAboutPage(@Query("auth") auth: string) {
    return {
      title: "О нас - PowerGit Gym",
      activePage: "about",
      user: this.getUser(auth),
      auth,
    };
  }

  @Get("facilities")
  @Render("facilities")
  getFacilitiesPage(@Query("auth") auth: string) {
    return {
      title: "Оснащение - PowerGit Gym",
      activePage: "facilities",
      user: this.getUser(auth),
      auth,
    };
  }

  @Get("contact")
  @Render("contact")
  async getContactPage(@Query("auth") auth: string) {
    const trainers = await this.trainersService.findAll();

    return {
      title: "Контакты - PowerGit Gym",
      activePage: "contact",
      user: this.getUser(auth),
      auth,
      trainers,
    };
  }
}
