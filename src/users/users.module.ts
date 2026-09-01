import { Module } from "@nestjs/common";
import { MembershipsModule } from "../memberships/memberships.module";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  // Импорт MembershipsModule — поддомен "Участники" зависит от поддомена
  // "Абонементы" (User.membershipId), а не дублирует его данные.
  imports: [PrismaModule, MembershipsModule],
  controllers: [UsersController],
  providers: [UsersService],
  // Экспортируется, чтобы ReviewsModule мог связывать отзыв с реальным
  // зарегистрированным автором — связь User -> Review из ЛР2.
  exports: [UsersService],
})
export class UsersModule {}
