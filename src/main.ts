// Должен быть первым импортом: подгружает .env в process.env ДО того, как
// начнётся сборка модулей Nest — иначе PrismaClient (создаётся при
// инициализации PrismaModule) не найдёт DATABASE_URL и упадёт с
// PrismaClientInitializationError. На хостинге (Render) переменные и так
// приходят из окружения, поэтому наличие/отсутствие .env там не влияет.
import "dotenv/config";

import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { join } from "path";
import { readdirSync, readFileSync } from "fs";
import * as hbs from "hbs";

import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle("PowerGit Gym API")
    .setDescription("REST API для управления сущностями PowerGit Gym")
    .setVersion("1.0")
    .addTag("Trainers API", "Операции с тренерами")
    .addTag("Memberships API", "Операции с абонементами и их участниками")
    .addTag("Products API", "Операции с товарами спортивного питания")
    .addTag("Users API", "Операции с зарегистрированными участниками и их отзывами")
    .addTag("Reviews API", "Операции с отзывами")
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
