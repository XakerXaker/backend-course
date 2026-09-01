# PowerGit Gym

Серверная часть учебного проекта «PowerGit Gym» — многостраничное веб-приложение
тренажёрного зала на **NestJS**, с шаблонизацией **Handlebars (hbs)** и слоем
данных на **PostgreSQL + Prisma ORM**. Фронтенд, разработанный в лабораторных
работах прошлого семестра, встроен в приложение и отдаётся как статика/шаблоны
самого сервера.

**Автор:** Darmanov Khantemir (darmanovhantemir@gmail.com)

**Развёрнутое приложение:** _добавьте сюда ссылку на инстанс, созданный на
[Render](https://render.com/) — `https://<ваш-сервис>.onrender.com`_

## Стек технологий

- [NestJS](https://nestjs.com/) (Express platform)
- [Handlebars (hbs)](https://github.com/pillarjs/hbs) — шаблонизатор представлений
- [PostgreSQL](https://www.postgresql.org/) — реляционная СУБД
- [Prisma ORM](https://www.prisma.io/) — доступ к данным и миграции
- [class-validator / class-transformer](https://github.com/typestack/class-validator) — валидация DTO
- [Swagger (OpenAPI)](https://docs.nestjs.com/openapi/introduction) — спецификация REST API

## Запуск локально

1. Установите зависимости:

   ```bash
   npm install
   ```

2. Создайте файл `.env` в корне проекта и укажите строку подключения к БД
   (Internal/External Database URL от Render, либо строка подключения Aiven,
   либо локальный PostgreSQL):

   ```env
   DATABASE_URL="postgresql://user:password@host:5432/dbname"
   ```

3. Примените миграции Prisma к базе данных:

   ```bash
   npx prisma migrate deploy
   ```

4. Запустите приложение в режиме разработки (перезапуск при изменениях):

   ```bash
   npm run start:dev
   ```

   Приложение слушает порт из переменной окружения `PORT`, а если она не
   задана — порт `3000` по умолчанию, т.е. http://localhost:3000.

Для production-сборки: `npm run build && npm run start:prod`.

## Структура приложения

Приложение построено по принципу MVC поверх модулей NestJS, каждый модуль
отвечает за свой поддомен (DDD-подход):

```text
src/
├── app.controller.ts     # общие страницы, не относящиеся к поддоменам (главная, О нас, ...)
├── app.module.ts
├── common/                # общие DTO и глобальный exception filter
├── prisma/                # инфраструктурный слой доступа к БД (PrismaService/PrismaModule)
├── trainers/               # поддомен "Тренеры": entity, dto, service, MVC-контроллер, REST API-контроллер, SSE
└── reviews/                # поддомен "Отзывы": entity, dto, service, MVC-контроллер
views/
├── layouts/main.hbs        # общий layout страницы
└── partials/                # переиспользуемые части: head-assets, header, nav, session-info, footer, карточки
```

## Доменная модель

В приложении выделено 7 сущностей, связанных между собой:

- **User** — зарегистрированный посетитель зала (аккаунт, абонемент, авторство отзывов и заказов).
- **Membership** — тип абонемента (цена, срок действия, набор привилегий).
- **Trainer** — тренер зала (специализация, стаж, биография).
- **Review** — отзыв о зале; может быть оставлен как зарегистрированным пользователем, так и гостем (связь с `User` необязательная, но имя автора фиксируется на момент публикации).
- **Product** — товар спортивного питания (категория, цена, остаток на складе).
- **Order** / **OrderItem** — заказ пользователя и позиции в нём (цена фиксируется на момент покупки).

Взаимосвязи между этими сущностями отображены на следующей ER-диаграмме:

```mermaid
erDiagram
    User ||--o| Membership : "has (optional)"
    User ||--o{ Review : "writes (optional)"
    User ||--o{ Order : "makes"

    Order ||--|{ OrderItem : "contains"
    Product ||--o{ OrderItem : "included in"

    User {
        String id PK
        String email UK
        String passwordHash
        String name
        String phone
        DateTime createdAt
        String membershipId FK
    }

    Membership {
        String id PK
        String name
        Decimal price
        Int duration
        String[] features
    }

    Trainer {
        String id PK
        String name
        String specialization
        Int experience
        String photoUrl
        String bio
    }

    Review {
        String id PK
        String authorName
        String text
        Int rating
        DateTime createdAt
        String authorId FK "nullable"
    }

    Product {
        String id PK
        String name
        Enum category
        Decimal price
        Int stock
    }

    Order {
        String id PK
        Decimal total
        Enum status
        DateTime createdAt
        String userId FK
    }

    OrderItem {
        String id PK
        Int quantity
        Decimal price
        String orderId FK
        String productId FK
    }
```

Схема описана в [`prisma/schema.prisma`](./prisma/schema.prisma), история
изменений — в [`prisma/migrations`](./prisma/migrations).

## Что сделано по лабораторным работам

### ЛР1. Деплой на Render и шаблонизация страниц

- Порт приложения читается из переменной окружения `PORT` (`src/main.ts`), с
  запасным значением `3000` для локальной разработки — без этого сборка на
  Render не смогла бы принимать соединения на выданном хостингом порту.
- Подключён шаблонизатор `hbs` (`app.setViewEngine('hbs')`), статические
  ресурсы (фронтенд прошлых лабораторных — CSS, JS, изображения) отдаются из
  папки `public` через `app.useStaticAssets`.
- Общая разметка вынесена в layout `views/layouts/main.hbs` и partial-блоки в
  `views/partials/`:
  - `head-assets.hbs` — общие стили и подключаемые скрипты;
  - `header.hbs` — заголовок сайта;
  - `nav.hbs` — пункты меню с подсветкой активной страницы;
  - `session-info.hbs` — блок информации о сессии («Вы вошли как …» /
    «Войти»), переключается запросом вида `?auth=true` / `?auth=false`;
  - `footer.hbs` — подвал;
  - `trainer-card.hbs`, `review-card.hbs`, `membership-row.hbs`,
    `pricing-row.hbs` — повторяющиеся блоки (карточки тренеров/отзывов,
    строки таблиц тарифов и абонементов).
- Для каждой страницы фронтенда добавлен контроллер/маршрут с `@Render(...)`
  и передачей модели представления (`AppController`, `TrainersController`,
  `ReviewsController`).

### ЛР2. Доменная модель

- В качестве СУБД используется PostgreSQL, подключение настраивается через
  переменную окружения `DATABASE_URL` (Render Postgres или Aiven — для
  прода, любой Postgres — локально).
- В качестве ORM выбрана **Prisma**: схема данных описана в
  `prisma/schema.prisma`, эволюция схемы отслеживается миграциями в
  `prisma/migrations`. Доступ к клиенту Prisma инкапсулирован в
  инфраструктурном сервисе `PrismaService` (`src/prisma`), подключённом как
  глобальный модуль, — рецепт из документации Nest.js для инфраструктурного
  слоя DDD.
- Выделено 7 сущностей домена (см. раздел «Доменная модель» выше и
  ER-диаграмму), сгруппированных по смыслу в отдельные модули (`trainers`,
  `reviews`), а не свалены в одну общую папку.

### ЛР3. Интеграция шаблонов с бизнес-логикой и SSE

- Поддомены оформлены как отдельные модули NestJS (`TrainersModule`,
  `ReviewsModule`), каждый со своими `entities/`, `dto/`, `service` и
  MVC-контроллером; в корневом `AppController` остались только общие
  страницы (главная, «О нас», «Питание», «Оснащение», «Цены», «Контакты»),
  не относящиеся к конкретному поддомену.
- Для тренеров (`/trainers`) и отзывов (`/reviews`) реализован полноценный
  CRUD через MVC-контроллеры и сервисы (бизнес-логика вынесена из
  контроллеров в сервисы, работающие поверх `PrismaService`):
  - просмотр коллекции (`GET /trainers`, `GET /reviews`);
  - отдельная страница добавления (`GET /trainers/add`, `GET /reviews/add`);
  - отдельная страница редактирования (`GET /trainers/:id/edit`,
    `GET /reviews/:id/edit`);
  - создание, изменение и удаление через HTML-формы (`POST`), с редиректом
    обратно на страницу коллекции/сущности после операции.
  - Форма отзыва теперь сохраняет данные не в `localStorage`, а в базу
    данных через `ReviewsService`/Prisma.
- Server-sent events: коллекция тренеров оповещает открытые страницы об
  изменениях в реальном времени. Эндпоинт `GET /trainers/events`
  (`@Sse()` в `TrainersController`) отдаёт `Observable`-поток на основе RxJS
  `Subject`, в который `TrainersService` публикует событие при создании,
  обновлении и удалении тренера. На клиенте (`public/js/trainers-sse.js`)
  поток читается через `EventSource`, а всплывающие уведомления об
  изменениях показываются прямо на странице `/trainers`.
- Дополнительно (вне обязательного минимума ЛР1-3) в проекте уже подключены
  REST API поверх тех же сервисов (`/api/trainers`), валидация DTO,
  централизованная обработка ошибок и Swagger-документация — см.
  `docs/lab4` для деталей соответствующей лабораторной работы.
