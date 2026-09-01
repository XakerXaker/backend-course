import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MembershipsApiController } from "./memberships.api.controller";
import { MembershipsController } from "./memberships.controller";
import { MembershipsService } from "./memberships.service";

@Module({
  imports: [PrismaModule],
  controllers: [MembershipsController, MembershipsApiController],
  providers: [MembershipsService],
  // Экспортируется, чтобы UsersModule мог показать выбор абонемента
  // при регистрации пользователя — явная связь между поддоменами.
  exports: [MembershipsService],
})
export class MembershipsModule {}
