import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { ReviewsApiController } from "./reviews.api.controller";
import { ReviewsController } from "./reviews.controller";
import { ReviewsResolver } from "./reviews.resolver";
import { ReviewsService } from "./reviews.service";

@Module({
  // Импорт UsersModule — поддомен "Отзывы" зависит от поддомена
  // "Участники", чтобы связывать отзыв с реальным автором (User.reviews).
  imports: [PrismaModule, UsersModule],
  controllers: [ReviewsController, ReviewsApiController],
  providers: [ReviewsService, ReviewsResolver],
  exports: [ReviewsService],
})
export class ReviewsModule {}
