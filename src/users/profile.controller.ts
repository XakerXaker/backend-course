import { Body, ConflictException, Controller, Get, Post, Render, Res } from "@nestjs/common";
import { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { ChangeOwnPasswordDto } from "./dto/change-own-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

// Самостоятельное управление собственной учётной записью — именно то, что
// описано в задании ЛР7 как "доступ к изменению настроек своей учётной
// записи... паролей" после прохождения аутентификации. Доступен любому
// аутентифицированному пользователю (нет ни @PublicAccess(), ни @Roles()),
// в отличие от административной панели UsersController/UsersApiController.
@Controller("profile")
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Render("users/profile")
  async getProfilePage(@CurrentUser() currentUser: AuthenticatedUser) {
    const member = await this.usersService.findOne(currentUser.id);

    return {
      title: "Мой профиль - PowerGit Gym",
      activePage: "profile",
      user: currentUser,
      member,
      error: null,
      passwordError: null,
    };
  }

  @Post()
  async updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
    @Res() res: Response,
  ) {
    try {
      await this.usersService.update(currentUser.id, dto);

      return res.redirect("/profile");
    } catch (error) {
      const member = await this.usersService.findOne(currentUser.id);
      const message =
        error instanceof ConflictException
          ? "Пользователь с таким email уже зарегистрирован"
          : "Не удалось сохранить изменения";

      return res.status(409).render("users/profile", {
        title: "Мой профиль - PowerGit Gym",
        activePage: "profile",
        user: currentUser,
        member: { ...member, ...dto },
        error: message,
        passwordError: null,
      });
    }
  }

  @Post("password")
  async changePassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ChangeOwnPasswordDto,
    @Res() res: Response,
  ) {
    const isCurrentPasswordValid = await this.usersService.verifyCurrentPassword(
      currentUser.email,
      dto.currentPassword,
    );

    if (!isCurrentPasswordValid) {
      const member = await this.usersService.findOne(currentUser.id);

      return res.status(400).render("users/profile", {
        title: "Мой профиль - PowerGit Gym",
        activePage: "profile",
        user: currentUser,
        member,
        error: null,
        passwordError: "Текущий пароль указан неверно",
      });
    }

    await this.usersService.changePassword(currentUser.id, dto.newPassword);

    return res.redirect("/profile");
  }
}
