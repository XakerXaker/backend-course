import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { TrainersModule } from "./trainers/trainers.module";

@Module({
  imports: [PrismaModule, TrainersModule, ReviewsModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
