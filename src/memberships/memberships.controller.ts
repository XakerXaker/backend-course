import { Body, Controller, Get, Param, Post, Query, Render, Res } from "@nestjs/common";
import { Response } from "express";
import { CreateMembershipDto } from "./dto/create-membership.dto";
import { UpdateMembershipDto } from "./dto/update-membership.dto";
import { MembershipsService } from "./memberships.service";

// Контроллер обслуживает публичный маршрут "/pricing" (пункт меню "Цены"),
// как и TrainersController совмещает публичную страницу с CRUD-управлением.
@Controller("pricing")
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  private getUser(auth: string) {
    if (auth === "true") {
      return { name: "Иван Иванов", email: "ivan@powergitgym.ru" };
    }
    return null;
  }

  @Get()
  @Render("memberships/list")
  async getCollectionPage(@Query("auth") auth: string) {
    const memberships = await this.membershipsService.findAll();

    return {
      title: "Цены - PowerGit Gym",
      activePage: "pricing",
      user: this.getUser(auth),
      auth,
      memberships,
    };
  }

  @Get("add")
  @Render("memberships/form")
  getCreatePage(@Query("auth") auth: string) {
    return {
      title: "Добавить абонемент - PowerGit Gym",
      activePage: "pricing",
      user: this.getUser(auth),
      auth,
      formTitle: "Добавление абонемента",
      formAction: `/pricing?auth=${auth || "false"}`,
      submitLabel: "Создать",
      isEdit: false,
      // price/duration — пустая строка, а не число, иначе в
      // <input type="number"> остаётся "0"/"1" и печатать приходится
      // поверх него.
      membership: { name: "", price: "", duration: "", features: [] },
    };
  }

  @Get(":id/edit")
  @Render("memberships/form")
  async getUpdatePage(@Param("id") id: string, @Query("auth") auth: string) {
    const membership = await this.membershipsService.findOne(id);

    return {
      title: "Редактировать абонемент - PowerGit Gym",
      activePage: "pricing",
      user: this.getUser(auth),
      auth,
      formTitle: "Редактирование абонемента",
      formAction: `/pricing/${id}/edit?auth=${auth || "false"}`,
      submitLabel: "Сохранить",
      isEdit: true,
      membership: {
        ...membership,
        features: membership.features.join("\n"),
      },
    };
  }

  @Post()
  async create(
    @Body() createMembershipDto: CreateMembershipDto,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    await this.membershipsService.create(createMembershipDto);

    return res.redirect(`/pricing?auth=${auth || "false"}`);
  }

  @Post(":id/edit")
  async updateFromForm(
    @Param("id") id: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    await this.membershipsService.update(id, updateMembershipDto);

    return res.redirect(`/pricing?auth=${auth || "false"}`);
  }

  @Post(":id/delete")
  async removeFromForm(
    @Param("id") id: string,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    await this.membershipsService.remove(id);

    return res.redirect(`/pricing?auth=${auth || "false"}`);
  }
}
