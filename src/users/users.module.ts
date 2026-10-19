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
  imports: [PrismaModule, MembershipsModule],
  controllers: [UsersController, UsersApiController, ProfileController],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule implements NestModule {
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
