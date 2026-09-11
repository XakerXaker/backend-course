import { Body, Controller, Get, Param, Post, Render, Req, Res } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Request, Response } from "express";
import { Roles } from "../auth/decorators/roles.decorator";
import { MembershipsService } from "../memberships/memberships.service";
import { ChangeRoleDto } from "./dto/change-role.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

// Панель управления учётными записями — служебные страницы, доступные
// ТОЛЬКО администратору (ЛР7): посетитель регистрируется сам через публичную
// форму /register (см. AuthController), а редактирует свои данные через
// /profile (см. ProfileController) — обе страницы не пересекаются с этим
// контроллером.
@Controller("users")
@Roles(Role.ADMIN)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    // Явная зависимость от поддомена "Абонементы": форма регистрации
    // пользователя должна предложить выбрать один из существующих
    // Membership — это и есть связь User -> Membership из ЛР2 в коде.
    private readonly membershipsService: MembershipsService,
  ) {}

  @Get()
  @Render("users/list")
  async getCollectionPage(@Req() req: Request) {
    const users = await this.usersService.findAll();

    return {
      title: "Участники - PowerGit Gym",
      activePage: "users",
      user: req.user,
      users,
    };
  }

  @Get("add")
  @Render("users/form")
  async getCreatePage(@Req() req: Request) {
    const membershipOptions = await this.buildMembershipOptions();

    return {
      title: "Регистрация участника - PowerGit Gym",
      activePage: "users",
      user: req.user,
      formTitle: "Регистрация участника",
      formAction: "/users",
      submitLabel: "Зарегистрировать",
      isEdit: false,
      membershipOptions,
      member: { email: "", name: "", phone: "" },
    };
  }

  @Get(":id")
  @Render("users/detail")
  async getEntityPage(@Param("id") id: string, @Req() req: Request) {
    const member = await this.usersService.findOne(id);

    return {
      title: `${member.name ?? member.email} - Участник`,
      activePage: "users",
      user: req.user,
      member,
    };
  }

  @Get(":id/edit")
  @Render("users/form")
  async getUpdatePage(@Param("id") id: string, @Req() req: Request) {
    const member = await this.usersService.findOne(id);
    const membershipOptions = await this.buildMembershipOptions(member.membershipId);

    return {
      title: "Редактировать участника - PowerGit Gym",
      activePage: "users",
      user: req.user,
      formTitle: "Редактирование участника",
      formAction: `/users/${id}/edit`,
      submitLabel: "Сохранить",
      isEdit: true,
      membershipOptions,
      member,
    };
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
    const member = await this.usersService.create(createUserDto);

    return res.redirect(`/users/${member.id}`);
  }

  @Post(":id/edit")
  async updateFromForm(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Res() res: Response,
  ) {
    const member = await this.usersService.update(id, updateUserDto);

    return res.redirect(`/users/${member.id}`);
  }

  @Post(":id/delete")
  async removeFromForm(@Param("id") id: string, @Res() res: Response) {
    await this.usersService.remove(id);

    return res.redirect("/users");
  }

  // MVC-обёртка над доменной операцией UsersService.changeRole (тот же
  // сервисный метод, что использует PATCH /api/users/:id/role) — форма на
  // странице участника (см. views/users/detail.hbs), а не поле в общей
  // форме редактирования.
  @Post(":id/role")
  async changeRoleFromForm(
    @Param("id") id: string,
    @Body() dto: ChangeRoleDto,
    @Res() res: Response,
  ) {
    await this.usersService.changeRole(id, dto.role);

    return res.redirect(`/users/${id}`);
  }

  private async buildMembershipOptions(selectedId?: string | null) {
    const memberships = await this.membershipsService.findAll();

    return memberships.map((membership) => ({
      id: membership.id,
      name: membership.name,
      selected: membership.id === selectedId,
    }));
  }
}
