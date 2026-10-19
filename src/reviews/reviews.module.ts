import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { RequireLoginMiddleware } from "../auth/middleware/require-login.middleware";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { ReviewsApiController } from "./reviews.api.controller";
import { ReviewsController } from "./reviews.controller";
import { ReviewsResolver } from "./reviews.resolver";
import { ReviewsService } from "./reviews.service";

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [ReviewsController, ReviewsApiController],
  providers: [ReviewsService, ReviewsResolver],
  exports: [ReviewsService],
})
export class ReviewsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireLoginMiddleware)
      .forRoutes(
        { path: "reviews/:id/edit", method: RequestMethod.ALL },
        { path: "reviews/:id/delete", method: RequestMethod.POST },
      );
  }
}
