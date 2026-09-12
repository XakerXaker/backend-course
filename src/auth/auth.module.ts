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

// Динамический модуль (см. https://docs.nestjs.com/modules#dynamic-modules,
// на который прямо ссылается задание ЛР7): конфигурация — connection URI,
// API-ключ, домены приложения — читается из переменных окружения один раз
// при старте (см. AuthModule.forRoot(...) в AppModule) и передаётся сюда
// статическим методом, а не читается напрямую внутри auth.module/config.
//
// supertokens.init(...) — глобальный побочный эффект самой библиотеки
// (SDK хранит конфигурацию в module-level синглтоне), поэтому выполняется
// синхронно прямо в forRoot(), на этапе регистрации модуля — раньше, чем
// поднимется контейнер Nest DI.
@Module({})
export class AuthModule implements NestModule, OnModuleInit {
  private static readonly logger = new Logger("AuthModule");

  static forRoot(options: SuperTokensModuleOptions): DynamicModule {
    // Отдельный экземпляр PrismaClient — только для override-хуков SDK
    // (см. supertokens.config.ts): на момент supertokens.init() обычный
    // @Inject(PrismaService) ещё недоступен, DI-контейнер не поднят.
    const prisma = new PrismaClient();

    supertokens.init(buildSuperTokensConfig(options, prisma));

    return {
      module: AuthModule,
      // global: true — RolesGuard/SessionAuthGuard и декораторы должны
      // работать в любом модуле приложения без явного импорта AuthModule.
      global: true,
      controllers: [AuthController, AuthApiController],
      providers: [
        // Оба гварда — глобальные (APP_GUARD), порядок регистрации важен:
        // SessionAuthGuard проверяет сам факт аутентификации (пропускает
        // помеченные @PublicAccess()), RolesGuard — требуемую роль
        // (@Roles(...)) и рассчитывает на то, что request.session уже
        // провалидирован первым гвардом.
        { provide: APP_GUARD, useClass: SessionAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    };
  }

  // SessionInfoMiddleware подключён глобально ("*") — он нужен не только
  // гвардам на защищённых маршрутах, но и вьюшкам: шапка сайта показывает
  // состояние сессии на КАЖДОЙ странице. Middleware для редиректа на форму
  // входа (RequireLoginMiddleware) подключается точечно, через
  // MiddlewareConsumer конкретных модулей — см. Trainers/Memberships/
  // Products/Reviews/UsersModule.
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionInfoMiddleware).forRoutes("*");
  }

  // Роли ("USER"/"ADMIN") должны существовать в SuperTokens ДО того, как
  // кто-то попробует их назначить (UserRoles.addRoleToUser упадёт с
  // UNKNOWN_ROLE_ERROR на несуществующей роли) — заводим их один раз при
  // старте приложения. Обращение к Core — сетевая операция, поэтому здесь,
  // а не синхронно в forRoot(); ошибку не считаем фатальной для всего
  // приложения (например, Core временно недоступен) — только логируем.
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
