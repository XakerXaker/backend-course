// Должен быть первым импортом: подгружает .env в process.env ДО того, как
// начнётся сборка модулей Nest — иначе PrismaClient (создаётся при
// инициализации PrismaModule) не найдёт DATABASE_URL и упадёт с
// PrismaClientInitializationError. На хостинге (Render) переменные и так
// приходят из окружения, поэтому наличие/отсутствие .env там не влияет.
import "dotenv/config";

import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as express from "express";
import { join } from "path";
import { readdirSync, readFileSync } from "fs";
import * as hbs from "hbs";
import supertokens from "supertokens-node";
import { errorHandler as superTokensErrorHandler, middleware as superTokensMiddleware } from "supertokens-node/framework/express";

import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { EtagInterceptor } from "./common/interceptors/etag.interceptor";
import { TimingInterceptor } from "./common/interceptors/timing.interceptor";

async function bootstrap() {
  // bodyParser: false — SuperTokens сам разбирает тело запроса для своих
  // маршрутов (/auth/signup, /auth/signin и т.д., см. supertokensMiddleware
  // ниже); стандартный body-parser Nest'а подключаем вручную ПОСЛЕ него —
  // иначе тело запроса будет уже "съедено" к моменту, когда до него
  // доберётся SuperTokens.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // ЛР7: маршруты аутентификации (/auth/signup, /auth/signin, /auth/signout,
  // /auth/session/refresh и т.д.) генерирует сам SDK — этот middleware их
  // обслуживает; для всех остальных путей просто вызывает next().
  app.use(superTokensMiddleware());
  app.use(superTokensErrorHandler());

  // Обычный body-parser для ВСЕХ ОСТАЛЬНЫХ маршрутов приложения (наши REST
  // API, MVC-формы) — подключается уже после SuperTokens, см. комментарий
  // про bodyParser: false выше.
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ЛР7: клиент (браузер) должен получать/отправлять cookie с сессией при
  // запросах на другой origin — без credentials: true браузер не станет
  // прикладывать httpOnly-cookie к cross-origin запросу, а без явного
  // списка origin (вместо "*") сам браузер не разрешит credentialed CORS.
  // allowedHeaders дополнен заголовками, которых требует протокол
  // SuperTokens (антифрод/refresh-flow — см. supertokens.getAllCORSHeaders()).
  app.enableCors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Порядок важен: TimingInterceptor должен быть внешним, чтобы измерить
  // весь конвейер обработки запроса (включая работу EtagInterceptor и
  // серверного кэша ниже по цепочке), а не только код контроллера.
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new TimingInterceptor(reflector),
    new EtagInterceptor(reflector),
  );

  app.useStaticAssets(join(__dirname, "..", "public"));

  app.setBaseViewsDir(join(__dirname, "..", "views"));

  app.setViewEngine("hbs");
  app.set("view options", { layout: "layouts/main" });

  // Ручная регистрация partials — читаем каждый .hbs файл и регистрируем
  const partialsDir = join(__dirname, "..", "views", "partials");
  const partialFiles = readdirSync(partialsDir).filter((f) =>
    f.endsWith(".hbs"),
  );

  partialFiles.forEach((file) => {
    const name = file.replace(".hbs", "");
    const content = readFileSync(join(partialsDir, file), "utf8");
    hbs.registerPartial(name, content);
    console.log(`  Partial registered: ${name}`);
  });

  hbs.registerHelper("eq", function (a: string, b: string) {
    return a === b;
  });

  hbs.registerHelper("formatDate", function (date: Date | string) {
    return new Date(date).toLocaleDateString("ru-RU");
  });

  // Первая буква имени — используется как заглушка на месте фото тренера,
  // если photoUrl не задан.
  hbs.registerHelper("initial", function (name: string) {
    return typeof name === "string" && name.length > 0
      ? name.charAt(0).toUpperCase()
      : "?";
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("PowerGit Gym API")
    .setDescription("REST API для управления сущностями PowerGit Gym")
    .setVersion("1.0")
    .addTag("Auth API", "Регистрация, вход и текущая сессия")
    .addTag("Trainers API", "Операции с тренерами")
    .addTag("Memberships API", "Операции с абонементами и их участниками")
    .addTag("Products API", "Операции с товарами спортивного питания")
    .addTag("Users API", "Операции с зарегистрированными участниками и их отзывами")
    .addTag("Reviews API", "Операции с отзывами")
    // ЛР7: схема авторизации — сессия SuperTokens в httpOnly cookie
    // "sAccessToken" (см. AuthModule, SessionInfoMiddleware). Декорированные
    // @ApiCookieAuth() методы получают в Swagger UI иконку замка
    // (см. docs.nestjs.com/openapi/security).
    .addCookieAuth("sAccessToken", {
      type: "apiKey",
      in: "cookie",
      description:
        "Access-токен сессии SuperTokens, выдаётся через POST /auth/signup или /auth/signin",
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  // Хостинг (например, Render) передаёт порт через переменную окружения PORT.
  // Локально, если она не задана, используем 3000 по умолчанию.
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
