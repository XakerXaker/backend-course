import { Body, Controller, Get, Param, Post, Render, Req, Res } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Request, Response } from "express";
import { PublicAccess } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { UsersService } from "../users/users.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";
import { ReviewsService } from "./reviews.service";

// Список отзывов и форма добавления — публичные (гостевой отзыв, см.
// домен Review из ЛР2); редактирование/удаление — модерация, доступна
// только администратору (ЛР7).
@Controller("reviews")
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    // Связь Review -> User: форма отзыва предлагает выбрать существующего
    // зарегистрированного участника вместо (или вместе с) свободного имени.
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @PublicAccess()
  @Render("reviews/list")
  async getCollectionPage(@Req() req: Request) {
    const reviews = await this.reviewsService.findAll();

    return {
      title: "Отзывы - PowerGit Gym",
      activePage: "reviews",
      user: req.user,
      isAdmin: req.user?.isAdmin ?? false,
      reviews,
    };
  }

  @Get("add")
  @PublicAccess()
  @Render("reviews/form")
  async getCreatePage(@Req() req: Request) {
    return {
      title: "Оставить отзыв - PowerGit Gym",
      activePage: "reviews",
      user: req.user,
      formTitle: "Оставить отзыв",
      formAction: "/reviews",
      submitLabel: "Опубликовать",
      isEdit: false,
      authorOptions: await this.buildAuthorOptions(),
      review: { authorName: "", text: "", rating: 5 },
    };
  }

  @Get(":id/edit")
  @Roles(Role.ADMIN)
  @Render("reviews/form")
  async getUpdatePage(@Param("id") id: string, @Req() req: Request) {
    const review = await this.reviewsService.findOne(id);

    return {
      title: "Редактировать отзыв - PowerGit Gym",
      activePage: "reviews",
      user: req.user,
      formTitle: "Редактирование отзыва",
      formAction: `/reviews/${id}/edit`,
      submitLabel: "Сохранить",
      isEdit: true,
      authorOptions: await this.buildAuthorOptions(review.authorId),
      review,
    };
  }

  @Post()
  @PublicAccess()
  async create(@Body() createReviewDto: CreateReviewDto, @Res() res: Response) {
    await this.reviewsService.create(createReviewDto);

    return res.redirect("/reviews");
  }

  @Post(":id/edit")
  @Roles(Role.ADMIN)
  async updateFromForm(
    @Param("id") id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Res() res: Response,
  ) {
    await this.reviewsService.update(id, updateReviewDto);

    return res.redirect("/reviews");
  }

  @Post(":id/delete")
  @Roles(Role.ADMIN)
  async removeFromForm(@Param("id") id: string, @Res() res: Response) {
    await this.reviewsService.remove(id);

    return res.redirect("/reviews");
  }

  private async buildAuthorOptions(selectedId?: string | null) {
    const users = await this.usersService.findAll();

    return users.map((registeredUser) => ({
      id: registeredUser.id,
      label: registeredUser.name ?? registeredUser.email,
      selected: registeredUser.id === selectedId,
    }));
  }
}
