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
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.use(superTokensMiddleware());
  app.use(superTokensErrorHandler());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new TimingInterceptor(reflector),
    new EtagInterceptor(reflector),
  );

  app.useStaticAssets(join(__dirname, "..", "public"));

  app.setBaseViewsDir(join(__dirname, "..", "views"));

  app.setViewEngine("hbs");
  app.set("view options", { layout: "layouts/main" });

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

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);

  console.log(`Application is running on port ${port}`);
}

bootstrap();
