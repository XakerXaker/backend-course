import { Body, Controller, Get, Param, Post, Query, Render, Res } from "@nestjs/common";
import { Response } from "express";
import { MembershipsService } from "../memberships/memberships.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    // Явная зависимость от поддомена "Абонементы": форма регистрации
    // пользователя должна предложить выбрать один из существующих
    // Membership — это и есть связь User -> Membership из ЛР2 в коде.
    private readonly membershipsService: MembershipsService,
  ) {}

  private getUser(auth: string) {
    if (auth === "true") {
      return { name: "Иван Иванов", email: "ivan@powergitgym.ru" };
    }
    return null;
  }

  @Get()
  @Render("users/list")
  async getCollectionPage(@Query("auth") auth: string) {
    const users = await this.usersService.findAll();

    return {
      title: "Участники - PowerGit Gym",
      activePage: "users",
      user: this.getUser(auth),
      auth,
      users,
    };
  }

  @Get("add")
  @Render("users/form")
  async getCreatePage(@Query("auth") auth: string) {
    const membershipOptions = await this.buildMembershipOptions();

    return {
      title: "Регистрация участника - PowerGit Gym",
      activePage: "users",
      user: this.getUser(auth),
      auth,
      formTitle: "Регистрация участника",
      formAction: `/users?auth=${auth || "false"}`,
      submitLabel: "Зарегистрировать",
      isEdit: false,
      membershipOptions,
      member: { email: "", name: "", phone: "" },
    };
  }

  @Get(":id")
  @Render("users/detail")
  async getEntityPage(@Param("id") id: string, @Query("auth") auth: string) {
    const member = await this.usersService.findOne(id);

    return {
      title: `${member.name ?? member.email} - Участник`,
      activePage: "users",
      user: this.getUser(auth),
      auth,
      member,
    };
  }

  @Get(":id/edit")
  @Render("users/form")
  async getUpdatePage(@Param("id") id: string, @Query("auth") auth: string) {
    const member = await this.usersService.findOne(id);
    const membershipOptions = await this.buildMembershipOptions(member.membershipId);

    return {
      title: "Редактировать участника - PowerGit Gym",
      activePage: "users",
      user: this.getUser(auth),
      auth,
      formTitle: "Редактирование участника",
      formAction: `/users/${id}/edit?auth=${auth || "false"}`,
      submitLabel: "Сохранить",
      isEdit: true,
      membershipOptions,
      member,
    };
  }

  @Post()
  async create(
    @Body() createUserDto: CreateUserDto,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    const member = await this.usersService.create(createUserDto);

    return res.redirect(`/users/${member.id}?auth=${auth || "false"}`);
  }

  @Post(":id/edit")
  async updateFromForm(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    const member = await this.usersService.update(id, updateUserDto);

    return res.redirect(`/users/${member.id}?auth=${auth || "false"}`);
  }

  @Post(":id/delete")
  async removeFromForm(
    @Param("id") id: string,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    await this.usersService.remove(id);

    return res.redirect(`/users?auth=${auth || "false"}`);
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
