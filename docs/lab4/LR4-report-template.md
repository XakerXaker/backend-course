# Лабораторная работа 4

## Тема

Разработка RESTful API и его спецификации.

## Цель работы

Разработать REST API для существующей модели данных приложения, обеспечить валидацию данных, централизованную обработку исключений, пагинацию, а также сформировать OpenAPI-спецификацию с помощью Swagger.

## Исходные данные

- Технологический стек: NestJS, Prisma, PostgreSQL, Handlebars.
- Предыдущая реализация (ЛР1-3): MVC-модули (entity, dto, service, MVC-контроллер) для пяти поддоменов — Trainer, Membership, Product, User, Review.

## Что было реализовано

### 1. API-контроллеры — по одному на каждый поддомен

Для всех пяти поддоменов рядом с MVC-контроллером создан отдельный REST-контроллер (вручную, не через `nest generate`, как и рекомендовано в задании). Маршрут API называется по имени сущности, а не по названию MVC-страницы — например, у `Membership` MVC-страница называется `/pricing`, а API смонтирован на `/api/memberships`; у `Product` — `/nutrition` и `/api/products` соответственно.

| Поддомен | MVC-маршрут | API-маршрут | Файл API-контроллера |
|---|---|---|---|
| Trainer | `/trainers` | `/api/trainers` | `src/trainers/trainers.api.controller.ts` |
| Membership | `/pricing` | `/api/memberships` | `src/memberships/memberships.api.controller.ts` |
| Product | `/nutrition` | `/api/products` | `src/products/products.api.controller.ts` |
| User | `/users` | `/api/users` | `src/users/users.api.controller.ts` |
| Review | `/reviews` | `/api/reviews` | `src/reviews/reviews.api.controller.ts` |

Каждый API-контроллер реализует стандартный набор:

- `GET /api/<resource>` — список с пагинацией;
- `GET /api/<resource>/:id` — одна сущность;
- `POST /api/<resource>` — создание;
- `PATCH /api/<resource>/:id` — частичное обновление;
- `DELETE /api/<resource>/:id` — удаление (`204 No Content`).

### 2. Дочерние сущности из родительской (связи между поддоменами)

Поскольку `Membership` и `User`, а также `User` и `Review` связаны (см. ЛР2/ЛР3), в API добавлена возможность получить дочернюю коллекцию из родительской — как всю коллекцию, так и конкретный элемент:

- `GET /api/memberships/:id/users` — все участники этого абонемента;
- `GET /api/memberships/:id/users/:userId` — конкретный участник (404, если он не найден или принадлежит другому абонементу);
- `GET /api/users/:id/reviews` — все отзывы этого участника;
- `GET /api/users/:id/reviews/:reviewId` — конкретный отзыв (аналогично, 404 при несоответствии).

Чтобы не заводить циклическую зависимость модулей (`MembershipsModule -> UsersModule -> MembershipsModule` и `ReviewsModule -> UsersModule -> ReviewsModule` уже существуют в обратную сторону, см. ЛР3), эти дочерние выборки в `MembershipsService`/`UsersService` обращаются к таблице потомка напрямую через `PrismaService`, а не через сервис соседнего модуля.

Файлы: `src/memberships/memberships.service.ts`, `src/users/users.service.ts`.

### 3. Валидация входных данных

- Глобальный `ValidationPipe` в `main.ts` (`whitelist`, `forbidNonWhitelisted`, `transform`, `enableImplicitConversion`) — общий для MVC и API.
- Правила валидации (`class-validator`) есть во всех `Create*Dto`/`Update*Dto` десяти модулей; `class-transformer` (`@Type`, `@Transform`) приводит строковые значения из форм/query к нужным типам.
- Дополнительно точечный `ParseUUIDPipe` на параметрах `:id` во всех API-контроллерах — некорректный формат идентификатора отсекается 400 ещё до обращения к БД.
- Общий `PaginationQueryDto` (`page`/`limit`) вынесен в `src/common/dto/pagination-query.dto.ts` и переиспользуется всеми пятью API-контроллерами.

Файлы: `src/main.ts`, `src/common/dto/pagination-query.dto.ts`, `src/*/dto/*.ts`.

### 4. Централизованная обработка исключений

- `AllExceptionsFilter` (`@Catch()`) ловит все исключения одним местом: для `/api/*` отдаёт JSON `{statusCode, message, timestamp, path}`, для остальных маршрутов рендерит `views/error.hbs` с тем же HTTP-статусом (в том числе `404` у HTML-страниц несуществующих сущностей).
- Ошибки Prisma переведены в осмысленные HTTP-статусы:
  - `P2025` (запись не найдена) → `404`;
  - `P2002` (нарушение уникальности, например повторный email участника) → `409 Conflict`;
  - `P2003` (нарушение внешнего ключа, например несуществующий `membershipId`/`authorId`) → `400 Bad Request`.
- В сервисах вместо ручного создания `HttpException` используются встроенные исключения Nest (`NotFoundException` и т.п.) — так они одинаково обрабатываются и в MVC, и в API без дублирования кода в контроллерах.

Файлы: `src/common/filters/all-exceptions.filter.ts`, `views/error.hbs`.

### 5. Пагинация и HATEOAS-элементы

- Пагинация (`findAllPaginated`) реализована в сервисе каждого поддомена одинаковым паттерном — `Prisma.$transaction([findMany, count])`, чтобы список и общее количество были согласованы (без гонки между двумя отдельными запросами).
- Общая логика построения заголовка `Link` (RFC 8288, `rel="prev"`/`rel="next"`) вынесена в `src/common/pagination.util.ts` и переиспользуется всеми API-контроллерами — раньше (когда API был только у Trainer) эта логика была приватными методами прямо в контроллере.
- Важное исправление в процессе: исходная реализация строила URL для заголовка `Link` через `request.baseUrl`, который у контроллеров Nest, зарегистрированных без под-роутера, всегда пуст — заголовок ссылался на `http://host/?page=2` без пути ресурса. Исправлено на `request.path`.

Файлы: `src/common/pagination.util.ts`, `src/*/*.service.ts` (`findAllPaginated`).

### 6. OpenAPI/Swagger

- Swagger UI подключён на `/api/docs` (`SwaggerModule.setup`), JSON-спецификация доступна на `/api/docs-json`.
- Один тег Swagger = один модуль: `Trainers API`, `Memberships API`, `Products API`, `Users API`, `Reviews API` — зарегистрированы через `DocumentBuilder.addTag(...)` в `main.ts` и `@ApiTags(...)` на каждом API-контроллере.
- У каждого DTO тела запроса (`Create*Dto`/`Update*Dto`) есть `@ApiProperty`/`@ApiPropertyOptional` с описанием, примером и ограничениями (min/max, длина, enum).
- Для каждого поддомена заведён отдельный `*-response.dto.ts` (структура успешного ответа) и `paginated-*-response.dto.ts` (структура ответа коллекции: `items`/`page`/`limit`/`total`/`totalPages`), плюс общий `ApiErrorResponseDto` для ошибок.
- У каждого эндпоинта задокументированы реальные возможные статусы, а не только 200/404: `@ApiOkResponse`/`@ApiCreatedResponse`/`@ApiNoContentResponse` + `@ApiBadRequestResponse`/`@ApiNotFoundResponse`/`@ApiConflictResponse` — с текстовым описанием, при каком условии каждый возвращается.

Файлы: `src/main.ts`, `src/*/dto/*-response.dto.ts`, `src/common/dto/api-error-response.dto.ts`, все `*.api.controller.ts`.

### 7. Безопасность ответа: пароль не покидает API

При разработке обнаружено и исправлено: `UsersService`/`ReviewsService` читали модель `User` целиком (включая `passwordHash`) и отдавали её как есть — на MVC-страницах это было незаметно (Handlebars рендерит только явно указанные в шаблоне поля), но JSON REST API отдавал бы хеш пароля в теле каждого ответа, где встречается участник (`/api/users`, вложенный `author` в `/api/reviews` и т.д.). Исправлено через явный Prisma `select`/`include.select`, исключающий `passwordHash`, применённый во всех точках чтения и записи `User` в обоих сервисах.

Файлы: `src/users/users.service.ts` (`SAFE_USER_SELECT`), `src/reviews/reviews.service.ts` (`AUTHOR_INCLUDE`).

### 8. Разделение MVC и API сохранено

- MVC-контроллеры (`*.controller.ts`) не изменены по поведению — работа многостраничного приложения не нарушена (проверено вручную, см. ниже).
- API-методы полностью в отдельных `*.api.controller.ts`, оба типа контроллеров одного поддомена используют один и тот же сервис — бизнес-логика не дублируется.

## Примеры запросов

Готовая JSON-коллекция для импорта в Postman/Insomnia:

- `docs/lab4/PowerGitGym-LR4.postman_collection.json`

Коллекция содержит по каждому из пяти поддоменов (папки `Trainers API`, `Memberships API`, `Products API`, `Users API`, `Reviews API`):

- позитивные сценарии CRUD, включая пагинацию;
- сценарий `400 Bad Request` (ошибка валидации);
- сценарий `404 Not Found`;
- для `Users API` — дополнительно `409 Conflict` (повторная регистрация того же email) и проверка отсутствия `passwordHash` в ответе;
- запросы дочерних коллекций (`Get Members Of Membership`, `Get Reviews Of User`);
- папку `Cleanup` с удалением связанных сущностей в правильном порядке (папки `Memberships API -> Users API -> Reviews API` зависят друг от друга через переменные коллекции `membershipId`/`userId`/`reviewId`, поэтому запускать их нужно по порядку).

## Инструкция по запуску

1. Установить зависимости (автоматически сгенерирует Prisma Client):
   `npm install`
2. Указать `DATABASE_URL` в `.env` и применить миграции:
   `npx prisma migrate deploy`
3. Запустить проект:
   `npm run start:dev`
4. Открыть Swagger UI:
   `http://localhost:3000/api/docs`

## Проверка результатов

- Проверить корректность CRUD-операций всех пяти поддоменов через Swagger или Postman.
- Убедиться, что:
  - невалидные запросы возвращают 400 (в том числе некорректный UUID в пути);
  - запрос несуществующей сущности возвращает 404 (и в API, и на HTML-странице);
  - повторная регистрация участника с тем же email возвращает 409;
  - создание участника/отзыва со ссылкой на несуществующий абонемент/автора возвращает 400;
  - в ответе списка присутствуют поля пагинации и заголовок `Link` с корректным путём ресурса;
  - ни в одном ответе `Users API`/`Reviews API` нет поля `passwordHash`;
  - дочерние коллекции (`/api/memberships/:id/users`, `/api/users/:id/reviews`) отдают только связанные записи;
  - многостраничное MVC-приложение (`/`, `/trainers`, `/pricing`, `/nutrition`, `/users`, `/reviews`) продолжает работать без изменений.

## Вывод

В ходе выполнения ЛР-4 REST API был реализован для всех пяти поддоменов приложения (Trainer, Membership, Product, User, Review), а не только для одного, как в первой итерации. Добавлены дочерние маршруты для связанных сущностей, централизованная обработка исключений расширена до различения `404`/`409`/`400` на основе кодов ошибок Prisma, устранена утечка хеша пароля через API, пагинация и HATEOAS-заголовок `Link` вынесены в общий переиспользуемый модуль (заодно исправлена обнаруженная в нём ошибка построения URL), а Swagger-документация охватывает все пять модулей отдельными тегами с полным описанием тел запросов, ответов и кодов статусов.

## Приложения

- Скриншот Swagger UI (`/api/docs`) со всеми пятью тегами
- Скриншоты успешных запросов (200/201/204) для каждого поддомена
- Скриншоты ошибок (400/404/409)
