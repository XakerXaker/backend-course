import {
  DynamicModule,
  Logger,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PrismaClient } from "@prisma/client";
import supertokens from "supertokens-node";
import { AuthApiController } from "./auth.api.controller";
import { AuthController } from "./auth.controller";
import { buildSuperTokensConfig, ensureRolesExist } from "./config/supertokens.config";
import { RolesGuard } from "./guards/roles.guard";
import { SessionAuthGuard } from "./guards/session-auth.guard";
import { SuperTokensModuleOptions } from "./interfaces/supertokens-module-options.interface";
import { SessionInfoMiddleware } from "./middleware/session-info.middleware";

@Module({})
export class AuthModule implements NestModule, OnModuleInit {
  private static readonly logger = new Logger("AuthModule");

  static forRoot(options: SuperTokensModuleOptions): DynamicModule {
    const prisma = new PrismaClient();

    supertokens.init(buildSuperTokensConfig(options, prisma));

    return {
      module: AuthModule,
      global: true,
      controllers: [AuthController, AuthApiController],
      providers: [
        { provide: APP_GUARD, useClass: SessionAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionInfoMiddleware).forRoutes("*");
  }

  async onModuleInit() {
    try {
      await ensureRolesExist();
    } catch (error) {
      AuthModule.logger.warn(
        `Не удалось создать роли в SuperTokens при старте (проверьте SUPERTOKENS_CONNECTION_URI/SUPERTOKENS_API_KEY): ${
          (error as Error).message
        }`,
      );
    }
  }
}
