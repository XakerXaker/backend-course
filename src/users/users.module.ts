import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { RequireLoginMiddleware } from "../auth/middleware/require-login.middleware";
import { MembershipsModule } from "../memberships/memberships.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ProfileController } from "./profile.controller";
import { UsersApiController } from "./users.api.controller";
import { UsersController } from "./users.controller";
import { UsersResolver } from "./users.resolver";
import { UsersService } from "./users.service";

@Module({
  // Импорт MembershipsModule — поддомен "Участники" зависит от поддомена
  // "Абонементы" (User.membershipId), а не дублирует его данные.
  imports: [PrismaModule, MembershipsModule],
  controllers: [UsersController, UsersApiController, ProfileController],
  providers: [UsersService, UsersResolver],
  // Экспортируется, чтобы ReviewsModule мог связывать отзыв с реальным
  // зарегистрированным автором — связь User -> Review из ЛР2.
  exports: [UsersService],
})
export class UsersModule implements NestModule {
  // MiddlewareConsumer (ЛР7): неаутентифицированного посетителя, зашедшего
  // на служебные страницы ("/users/...") или в свой профиль ("/profile"),
  // переадресуем на форму входа — вместо того чтобы просто отдать ему
  // 401/403 от гварда (см. RequireLoginMiddleware).
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireLoginMiddleware)
      .forRoutes(
        { path: "users", method: RequestMethod.ALL },
        { path: "users/add", method: RequestMethod.ALL },
        { path: "users/:id", method: RequestMethod.ALL },
        { path: "users/:id/edit", method: RequestMethod.ALL },
        { path: "users/:id/delete", method: RequestMethod.ALL },
        { path: "users/:id/role", method: RequestMethod.ALL },
        { path: "profile", method: RequestMethod.ALL },
        { path: "profile/password", method: RequestMethod.ALL },
      );
  }
}
