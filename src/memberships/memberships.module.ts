import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { RequireLoginMiddleware } from "../auth/middleware/require-login.middleware";
import { PrismaModule } from "../prisma/prisma.module";
import { MembershipsApiController } from "./memberships.api.controller";
import { MembershipsController } from "./memberships.controller";
import { MembershipsResolver } from "./memberships.resolver";
import { MembershipsService } from "./memberships.service";

@Module({
  imports: [PrismaModule],
  controllers: [MembershipsController, MembershipsApiController],
  providers: [MembershipsService, MembershipsResolver],
  // Экспортируется, чтобы UsersModule мог показать выбор абонемента
  // при регистрации пользователя — явная связь между поддоменами.
  exports: [MembershipsService],
})
export class MembershipsModule implements NestModule {
  // MiddlewareConsumer (ЛР7) — только на служебные (админские) страницы
  // управления абонементами, список ("/pricing") остаётся публичным.
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireLoginMiddleware)
      .forRoutes(
        { path: "pricing", method: RequestMethod.POST },
        { path: "pricing/add", method: RequestMethod.GET },
        { path: "pricing/:id/edit", method: RequestMethod.ALL },
        { path: "pricing/:id/delete", method: RequestMethod.POST },
      );
  }
}
