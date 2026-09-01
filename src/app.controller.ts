import { Controller, Get, Query, Render } from "@nestjs/common";
import { ReviewsService } from "./reviews/reviews.service";
import { TrainersService } from "./trainers/trainers.service";

@Controller()
export class AppController {
  constructor(
    private readonly trainersService: TrainersService,
    private readonly reviewsService: ReviewsService,
  ) {}

  private pricing = [
    {
      name: "Базовый",
      price: "2000 руб/мес",
      features: "Посещение зала в дневное время",
    },
    {
      name: "Премиум",
      price: "3500 руб/мес",
      features: "24/7, групповые занятия",
    },
    {
      name: "VIP",
      price: "5000 руб/мес",
      features: "Персональные тренировки, питание",
    },
  ];

  private membership = [
    {
      type: "Базовый",
      period: "1 месяц",
      price: "2 000 ₽",
      benefits: "Тренажерный зал",
      promo: "-",
    },
    {
      type: "Премиум",
      period: "3 месяца",
      price: "5 000 ₽",
      benefits: "Зал + групповые занятия",
      promo: "Фитнес-браслет",
    },
    {
      type: "VIP",
      period: "6 месяцев",
      price: "9 000 ₽",
      benefits: "Все включено",
      promo: "2 персональные тренировки",
    },
    {
      type: "Годовой",
      period: "12 месяцев",
      price: "15 000 ₽",
      benefits: "Все включено + сейф",
      promo: "Месяц бесплатно",
    },
  ];

  private products = {
    proteins: [
      { name: "Сывороточный протеин", price: "от 2000 руб" },
      { name: "Казеин", price: "от 2200 руб" },
      { name: "Растительный протеин", price: "от 1800 руб" },
    ],
    amino: [
      { name: "BCAA", price: "от 1500 руб" },
      { name: "Глютамин", price: "от 800 руб" },
      { name: "Аргинин", price: "от 700 руб" },
    ],
    fatburners: [
      { name: "L-карнитин", price: "от 1000 руб" },
      { name: "Термогеники", price: "от 1200 руб" },
    ],
    vitamins: [
      { name: "Комплексные витамины", price: "от 500 руб" },
      { name: "Омега-3", price: "от 600 руб" },
    ],
  };

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

    return {
      title: "PowerGit Gym - Сила воли твой результат",
      activePage: "index",
      user: this.getUser(auth),
      auth,
      trainers,
      reviews,
      products: this.products,
      pricing: this.pricing,
      membership: this.membership,
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

  @Get("nutrition")
  @Render("nutrition")
  getNutritionPage(@Query("auth") auth: string) {
    return {
      title: "Питание - PowerGit Gym",
      activePage: "nutrition",
      user: this.getUser(auth),
      auth,
      products: this.products,
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

  @Get("pricing")
  @Render("pricing")
  getPricingPage(@Query("auth") auth: string) {
    return {
      title: "Цены - PowerGit Gym",
      activePage: "pricing",
      user: this.getUser(auth),
      auth,
      pricing: this.pricing,
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
