import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
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
    // Тренеры — самая часто читаемая сущность (см. TrainersApiController),
    // поэтому только для неё включено серверное in-memory кэширование
    // (стандартный CacheModule из документации NestJS, стор по умолчанию —
    // в памяти процесса). TTL нарочно короткий (5 секунд): этого достаточно,
    // чтобы под нагрузкой (например, утилитой `hey`) увидеть в логах резкое
    // падение времени ответа, но кэш не успевает "протухнуть" настолько,
    // чтобы стать проблемой при создании/редактировании тренера — ручная
    // инвалидация не реализована сознательно, как и предлагается в задании.
    CacheModule.register({ ttl: 5000 }),
  ],
  controllers: [TrainersController, TrainersApiController],
  providers: [TrainersService, TrainersResolver],
  exports: [TrainersService],
})
export class TrainersModule {}
