import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TrainersApiController } from "./trainers.api.controller";
import { TrainersController } from "./trainers.controller";
import { TrainersService } from "./trainers.service";

@Module({
  imports: [PrismaModule],
  controllers: [TrainersController, TrainersApiController],
  providers: [TrainersService],
  exports: [TrainersService],
})
export class TrainersModule {}
