import { Body, Controller, Get, Param, Post, Render, Req, Res } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Request, Response } from "express";
import { PublicAccess } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CreateMembershipDto } from "./dto/create-membership.dto";
import { UpdateMembershipDto } from "./dto/update-membership.dto";
import { MembershipsService } from "./memberships.service";

// Контроллер обслуживает публичный маршрут "/pricing" (пункт меню "Цены"),
// как и TrainersController совмещает публичную страницу с CRUD-управлением
// (add/edit/delete — только для администратора, см. ЛР7).
@Controller("pricing")
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @PublicAccess()
  @Render("memberships/list")
  async getCollectionPage(@Req() req: Request) {
    const memberships = await this.membershipsService.findAll();

    return {
      title: "Цены - PowerGit Gym",
      activePage: "pricing",
      user: req.user,
      isAdmin: req.user?.role === Role.ADMIN,
      memberships,
    };
  }

  @Get("add")
  @Roles(Role.ADMIN)
  @Render("memberships/form")
  getCreatePage(@Req() req: Request) {
    return {
      title: "Добавить абонемент - PowerGit Gym",
      activePage: "pricing",
      user: req.user,
      formTitle: "Добавление абонемента",
      formAction: "/pricing",
      submitLabel: "Создать",
      isEdit: false,
      // price/duration — пустая строка, а не число, иначе в
      // <input type="number"> остаётся "0"/"1" и печатать приходится
      // поверх него.
      membership: { name: "", price: "", duration: "", features: [] },
    };
  }

  @Get(":id/edit")
  @Roles(Role.ADMIN)
  @Render("memberships/form")
  async getUpdatePage(@Param("id") id: string, @Req() req: Request) {
    const membership = await this.membershipsService.findOne(id);

    return {
      title: "Редактировать абонемент - PowerGit Gym",
      activePage: "pricing",
      user: req.user,
      formTitle: "Редактирование абонемента",
      formAction: `/pricing/${id}/edit`,
      submitLabel: "Сохранить",
      isEdit: true,
      membership: {
        ...membership,
        features: membership.features.join("\n"),
      },
    };
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() createMembershipDto: CreateMembershipDto, @Res() res: Response) {
    await this.membershipsService.create(createMembershipDto);

    return res.redirect("/pricing");
  }

  @Post(":id/edit")
  @Roles(Role.ADMIN)
  async updateFromForm(
    @Param("id") id: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
    @Res() res: Response,
  ) {
    await this.membershipsService.update(id, updateMembershipDto);

    return res.redirect("/pricing");
  }

  @Post(":id/delete")
  @Roles(Role.ADMIN)
  async removeFromForm(@Param("id") id: string, @Res() res: Response) {
    await this.membershipsService.remove(id);

    return res.redirect("/pricing");
  }
}
