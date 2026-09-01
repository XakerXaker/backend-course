import { Body, Controller, Get, Param, Post, Query, Render, Res } from "@nestjs/common";
import { Response } from "express";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";
import { ReviewsService } from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  private getUser(auth: string) {
    if (auth === "true") {
      return { name: "Иван Иванов", email: "ivan@powergitgym.ru" };
    }
    return null;
  }

  @Get()
  @Render("reviews/list")
  async getCollectionPage(@Query("auth") auth: string) {
    const reviews = await this.reviewsService.findAll();

    return {
      title: "Отзывы - PowerGit Gym",
      activePage: "reviews",
      user: this.getUser(auth),
      auth,
      reviews,
    };
  }

  @Get("add")
  @Render("reviews/form")
  getCreatePage(@Query("auth") auth: string) {
    return {
      title: "Оставить отзыв - PowerGit Gym",
      activePage: "reviews",
      user: this.getUser(auth),
      auth,
      formTitle: "Оставить отзыв",
      formAction: `/reviews?auth=${auth || "false"}`,
      submitLabel: "Опубликовать",
      isEdit: false,
      review: { authorName: "", text: "", rating: 5 },
    };
  }

  @Get(":id/edit")
  @Render("reviews/form")
  async getUpdatePage(@Param("id") id: string, @Query("auth") auth: string) {
    const review = await this.reviewsService.findOne(id);

    return {
      title: "Редактировать отзыв - PowerGit Gym",
      activePage: "reviews",
      user: this.getUser(auth),
      auth,
      formTitle: "Редактирование отзыва",
      formAction: `/reviews/${id}/edit?auth=${auth || "false"}`,
      submitLabel: "Сохранить",
      isEdit: true,
      review,
    };
  }

  @Post()
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    await this.reviewsService.create(createReviewDto);

    return res.redirect(`/reviews?auth=${auth || "false"}`);
  }

  @Post(":id/edit")
  async updateFromForm(
    @Param("id") id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    await this.reviewsService.update(id, updateReviewDto);

    return res.redirect(`/reviews?auth=${auth || "false"}`);
  }

  @Post(":id/delete")
  async removeFromForm(
    @Param("id") id: string,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    await this.reviewsService.remove(id);

    return res.redirect(`/reviews?auth=${auth || "false"}`);
  }
}
