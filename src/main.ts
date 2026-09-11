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
import * as cookieParser from "cookie-parser";
import { join } from "path";
import { readdirSync, readFileSync } from "fs";
import * as hbs from "hbs";

import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { EtagInterceptor } from "./common/interceptors/etag.interceptor";
import { TimingInterceptor } from "./common/interceptors/timing.interceptor";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ЛР7: JWT читается из httpOnly-cookie (см. CurrentUserMiddleware) —
  // без cookie-parser Express не разбирает заголовок Cookie в req.cookies.
  app.use(cookieParser());

  // ЛР7: клиент (браузер) должен получать/отправлять cookie с токеном при
  // запросах на другой origin — без credentials: true браузер не станет
  // прикладывать httpOnly-cookie к cross-origin запросу, а без явного
  // списка origin (вместо "*") сам браузер не разрешит credentialed CORS.
  app.enableCors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
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
    // ЛР7: схема авторизации — JWT в httpOnly cookie (см. AuthApiController,
    // CurrentUserMiddleware). Декорированные @ApiCookieAuth() методы
    // получают в Swagger UI иконку замка (см. docs.nestjs.com/openapi/security).
    .addCookieAuth(process.env.AUTH_COOKIE_NAME ?? "access_token", {
      type: "apiKey",
      in: "cookie",
      description: "JWT access-токен, выдаётся через POST /api/auth/login или /api/auth/register",
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
