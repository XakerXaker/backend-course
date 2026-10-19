# PowerGit Gym

Серверная часть веб-приложения тренажёрного зала «PowerGit Gym»: многостраничный
сайт с серверным рендерингом и REST/GraphQL API.

**Развёрнутое приложение:** https://m3314-darmanov-backend.onrender.com

## Технологии

- [NestJS](https://nestjs.com/) (Express) и TypeScript
- [Handlebars (hbs)](https://github.com/pillarjs/hbs) — серверные шаблоны страниц
- [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM](https://www.prisma.io/) — данные и миграции
- [class-validator / class-transformer](https://github.com/typestack/class-validator) — валидация DTO
- [Swagger (OpenAPI)](https://docs.nestjs.com/openapi/introduction) — документация REST API
- [GraphQL / Apollo Server](https://docs.nestjs.com/graphql/quick-start) — альтернативный API
- [SuperTokens](https://supertokens.com/) — аутентификация и роли
- S3-совместимое объектное хранилище — загрузка фотографий
- RxJS — перехватчики и SSE

## Что реализовано

- Страницы сайта (главная, о нас, залы, контакты) и CRUD-страницы для тренеров,
  абонементов, товаров, пользователей и отзывов
- REST API со Swagger-документацией (`/api/docs`)
- GraphQL API
- Регистрация, вход, сессии и разграничение доступа по ролям
- Обновление списка тренеров в реальном времени через SSE
- Замер времени обработки запросов, ETag-кэширование
- Загрузка фотографий тренеров в объектное хранилище
- Пагинация, единый формат ошибок

## Запуск локально

1. Установите зависимости (Prisma Client генерируется автоматически):

   ```bash
   npm install
   ```

2. Скопируйте `.env.example` в `.env` и заполните переменные:

   - `DATABASE_URL` — строка подключения к PostgreSQL
   - `PORT` — порт приложения (необязательно)
   - `SUPERTOKENS_CONNECTION_URI`, `SUPERTOKENS_API_KEY`, `APP_NAME`,
     `API_DOMAIN`, `WEBSITE_DOMAIN` — настройки аутентификации
   - `CORS_ORIGIN` — разрешённые origin через запятую
   - `S3_*` — настройки объектного хранилища (нужны только для загрузки фото)

3. Примените миграции:

   ```bash
   npx prisma migrate deploy
   ```

4. Запустите приложение:

   ```bash
   npm run start:dev
   ```

Production-сборка: `npm run build && npm run start:prod`.
