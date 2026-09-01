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

1. Установите зависимости — это также автоматически сгенерирует Prisma
   Client из `prisma/schema.prisma` (скрипт `postinstall`):

   ```bash
   npm install
   ```

   Если по какой-то причине клиент не сгенерировался (например, вы
   меняли `schema.prisma` и не переустанавливали зависимости — тогда
   TypeScript будет ругаться на отсутствие типов вроде `Category` или
   `Product` в `@prisma/client`), перегенерируйте его вручную:

   ```bash
   npx prisma generate
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
├── app.controller.ts     # общие страницы, не относящиеся к поддоменам (главная, О нас, Оснащение, Контакты)
├── app.module.ts
├── common/                # общие DTO и глобальный exception filter
├── prisma/                # инфраструктурный слой доступа к БД (PrismaService/PrismaModule)
├── trainers/               # поддомен "Тренеры" ("/trainers"): entity, dto, service, MVC-контроллер, REST API-контроллер, SSE
├── memberships/            # поддомен "Абонементы" ("/pricing"): entity, dto, service, MVC-контроллер
├── products/               # поддомен "Питание" ("/nutrition"): entity, dto, service, MVC-контроллер
├── users/                  # поддомен "Участники" ("/users"): entity, dto, service, MVC-контроллер
└── reviews/                # поддомен "Отзывы" ("/reviews"): entity, dto, service, MVC-контроллер
views/
├── layouts/main.hbs        # общий layout страницы
└── partials/                # переиспользуемые части: head-assets, header, nav, session-info, footer, карточки
```

### Связи между поддоменами в коде

Каждый поддомен — отдельный `@Module`, но домен по ЛР2 не рассыпается на
изолированные острова: связи из ER-диаграммы выражены явными
NestJS-зависимостями между модулями, а не только полями в
`schema.prisma`:

```text
MembershipsModule  <───  UsersModule  <───  ReviewsModule
   (/pricing)             (/users)           (/reviews)
```

- **`UsersModule` импортирует `MembershipsModule`** и инжектирует
  `MembershipsService`, чтобы форма регистрации участника (`/users/add`)
  предложила выбрать один из существующих абонементов — это связь
  `User → Membership` из ЛР2, работающая в реальном запросе
  (`prisma.user.create({ data: { membershipId } })`), а не просто строка в
  схеме. `MembershipsService.findAll()` дополнительно возвращает
  `_count.users` — число участников на каждом абонементе, то есть обратная
  сторона той же связи видна на странице `/pricing`.
- **`ReviewsModule` импортирует `UsersModule`** и инжектирует
  `UsersService`, чтобы форма отзыва (`/reviews/add`) могла связать отзыв с
  реальным зарегистрированным участником (`Review.authorId`) — это связь
  `User → Review`. Если автор не выбран, отзыв всё равно сохраняется как
  гостевой (`authorName` без `authorId`). На странице участника
  (`/users/:id`) обратная сторона связи видна как список его отзывов
  (`prisma.user.findUnique({ include: { reviews: true } })`).
- **`AppController`** (корневой, без поддоменной логики) использует сразу
  четыре сервиса (`TrainersService`, `ReviewsService`, `MembershipsService`,
  `ProductsService`) только для того, чтобы собрать превью каждого раздела
  на главной странице — сам он не содержит бизнес-логики ни одного из
  поддоменов.

Таким образом в коде реализованы (и проверены вручную end-to-end) две из
связей ER-диаграммы: `User ↔ Membership` (опциональная, один ко многим) и
`User ↔ Review` (опциональная, один ко многим). Связка
`Product → OrderItem → Order → User` описана в `schema.prisma` и на
ER-диаграмме, но модуль `Order` (корзина/оформление заказа) не
реализован — это осознанно оставлено за рамками текущих лабораторных
работ, поскольку требует полноценной аутентификации пользователей.

## Доменная модель

В приложении выделено 7 сущностей, связанных между собой. Пять из них
доведены до полноценного поддомена (модуль + сервис + MVC-контроллер +
шаблоны), две (`Order`/`OrderItem`) пока существуют только в схеме и на
ER-диаграмме:

- **User** *(реализовано, `/users`)* — зарегистрированный посетитель зала: аккаунт, абонемент, авторство отзывов и заказов.
- **Membership** *(реализовано, `/pricing`)* — тип абонемента (цена, срок действия, набор привилегий); показывает число подписанных участников.
- **Trainer** *(реализовано, `/trainers`)* — тренер зала (специализация, стаж, биография); единственная сущность с SSE-оповещениями.
- **Product** *(реализовано, `/nutrition`)* — товар спортивного питания (категория, цена, остаток на складе).
- **Review** *(реализовано, `/reviews`)* — отзыв о зале; может быть оставлен как зарегистрированным пользователем (со связью на `User`), так и гостем — имя автора в любом случае фиксируется на момент публикации.
- **Order** / **OrderItem** *(только в схеме)* — заказ пользователя и позиции в нём (цена фиксируется на момент покупки); модуль не реализован, см. раздел «Связи между поддоменами» выше.

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
  - `trainer-card.hbs`, `review-card.hbs`, `membership-row.hbs` —
    повторяющиеся блоки (карточки тренеров/отзывов, строки таблицы
    абонементов).
- Для каждой страницы фронтенда добавлен контроллер/маршрут с `@Render(...)`
  и передачей модели представления (`AppController` и по одному
  MVC-контроллеру на поддомен: `TrainersController`, `MembershipsController`,
  `ProductsController`, `UsersController`, `ReviewsController`).

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
  `memberships`, `products`, `users`, `reviews`), а не свалены в одну общую
  папку.

### ЛР3. Интеграция шаблонов с бизнес-логикой и SSE

- Поддомены оформлены как отдельные модули NestJS (`TrainersModule`,
  `MembershipsModule`, `ProductsModule`, `UsersModule`, `ReviewsModule`),
  каждый со своими `entities/`, `dto/`, `service` и MVC-контроллером; в
  корневом `AppController` остались только общие страницы (главная, «О
  нас», «Оснащение», «Контакты») и сборка превью из чужих сервисов для
  главной страницы — никакой бизнес-логики поддоменов там нет. Публичные
  разделы «Цены» и «Питание» теперь обслуживаются не корневым
  контроллером, а `MembershipsController` (маршрут `/pricing`) и
  `ProductsController` (маршрут `/nutrition`) — так же, как `/trainers`
  одновременно является и публичной страницей, и панелью управления.
- Для всех пяти реализованных поддоменов (тренеры, абонементы, питание,
  участники, отзывы) сделан полноценный CRUD через MVC-контроллеры и
  сервисы (бизнес-логика вынесена из контроллеров в сервисы, работающие
  поверх `PrismaService`):
  - просмотр коллекции (`GET /trainers`, `GET /pricing`, `GET /nutrition`,
    `GET /users`, `GET /reviews`);
  - отдельная страница добавления (`.../add`);
  - отдельная страница редактирования (`.../:id/edit`);
  - создание, изменение и удаление через HTML-формы (`POST`), с редиректом
    обратно на страницу коллекции/сущности после операции.
  - Форма отзыва сохраняет данные не в `localStorage`, а в базу данных
    через `ReviewsService`/Prisma (раньше отзывы жили только в браузере).
- Связи между поддоменами, выявленные в ЛР2, выражены в коде явными
  зависимостями между модулями (`UsersModule` использует
  `MembershipsService`, `ReviewsModule` использует `UsersService`) — подробнее
  в разделе «Связи между поддоменами в коде» выше.
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
