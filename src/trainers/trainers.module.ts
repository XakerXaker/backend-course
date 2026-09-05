import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TrainersApiController } from "./trainers.api.controller";
import { TrainersController } from "./trainers.controller";
import { TrainersResolver } from "./trainers.resolver";
import { TrainersService } from "./trainers.service";

@Module({
  imports: [PrismaModule],
  controllers: [TrainersController, TrainersApiController],
  providers: [TrainersService, TrainersResolver],
  exports: [TrainersService],
})
export class TrainersModule {}
