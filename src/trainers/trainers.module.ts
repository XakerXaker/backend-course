import { CacheModule } from "@nestjs/cache-manager";
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { RequireLoginMiddleware } from "../auth/middleware/require-login.middleware";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { TrainersApiController } from "./trainers.api.controller";
import { TrainersController } from "./trainers.controller";
import { TrainersResolver } from "./trainers.resolver";
import { TrainersService } from "./trainers.service";

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    CacheModule.register({ ttl: 5000 }),
  ],
  controllers: [TrainersController, TrainersApiController],
  providers: [TrainersService, TrainersResolver],
  exports: [TrainersService],
})
export class TrainersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireLoginMiddleware)
      .forRoutes(
        { path: "trainers", method: RequestMethod.POST },
        { path: "trainers/add", method: RequestMethod.GET },
        { path: "trainers/:id/edit", method: RequestMethod.ALL },
        { path: "trainers/:id/delete", method: RequestMethod.POST },
      );
  }
}
