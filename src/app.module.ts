import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { MembershipsModule } from "./memberships/memberships.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { TrainersModule } from "./trainers/trainers.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    PrismaModule,
    TrainersModule,
    MembershipsModule,
    ProductsModule,
    UsersModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
