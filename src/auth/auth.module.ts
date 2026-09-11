import { DynamicModule, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { UsersModule } from "../users/users.module";
import { AuthApiController } from "./auth.api.controller";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from "./interfaces/auth-module-options.interface";
import { CurrentUserMiddleware } from "./middleware/current-user.middleware";

// Динамический модуль (см. https://docs.nestjs.com/modules#dynamic-modules,
// на который прямо ссылается задание ЛР7): конфигурация — секрет/срок
// жизни JWT, имя cookie — читается из переменных окружения один раз при
// старте приложения (см. AuthModule.register(...) в AppModule) и
// передаётся статическим методом, а не читается напрямую внутри
// AuthService/гвардов через process.env.
@Module({})
export class AuthModule implements NestModule {
  static register(options: AuthModuleOptions): DynamicModule {
    return {
      module: AuthModule,
      // global: true — req.user и AuthService должны быть доступны из
      // любого модуля приложения (гварды, другие поддомены), без того,
      // чтобы каждый из них явно импортировал AuthModule.
      global: true,
      imports: [
        UsersModule,
        JwtModule.register({
          secret: options.jwtSecret,
          // jsonwebtoken типизирует expiresIn узким литеральным типом
          // (branded string из пакета "ms"), а не произвольной строкой —
          // значение приходит из переменной окружения JWT_EXPIRES_IN, чей
          // тип на этапе компиляции сузить нельзя.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          signOptions: { expiresIn: options.jwtExpiresIn as any },
        }),
      ],
      controllers: [AuthController, AuthApiController],
      providers: [
        { provide: AUTH_MODULE_OPTIONS, useValue: options },
        AuthService,
        // Оба гварда — глобальные (APP_GUARD), порядок регистрации важен:
        // JwtAuthGuard проверяет сам факт аутентификации (пропускает
        // помеченные @PublicAccess()), RolesGuard — требуемую роль
        // (@Roles(...)) и рассчитывает на то, что request.user уже
        // провалидирован первым гвардом.
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
      exports: [AuthService, AUTH_MODULE_OPTIONS, JwtModule],
    };
  }

  // CurrentUserMiddleware подключён глобально ("*") — он нужен не только
  // гвардам на защищённых маршрутах, но и вьюшкам: шапка сайта показывает
  // состояние сессии ("Вы вошли как..." / "Войти") на КАЖДОЙ странице.
  // Middleware для редиректа на форму входа (RequireLoginMiddleware)
  // подключается точечно, через MiddlewareConsumer конкретных модулей —
  // см. TrainersModule/MembershipsModule/ProductsModule/UsersModule/
  // ReviewsModule.
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CurrentUserMiddleware).forRoutes("*");
  }
}
