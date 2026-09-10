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
- [GraphQL / Apollo Server](https://docs.nestjs.com/graphql/quick-start) — альтернативный API (code-first)
- [RxJS](https://rxjs.dev/) — перехватчики (`TimingInterceptor`, `EtagInterceptor`), SSE
- [@nestjs/cache-manager](https://docs.nestjs.com/techniques/caching) — серверное in-memory кэширование
- [AWS SDK для JavaScript (`@aws-sdk/client-s3`)](https://yandex.cloud/ru/docs/storage/tools/aws-sdk-js) — загрузка файлов в Yandex Object Storage

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

2. Скопируйте `.env.example` в `.env` и укажите строку подключения к БД
   (Internal/External Database URL от Render, либо строка подключения Aiven,
   либо локальный PostgreSQL):

   ```env
   DATABASE_URL="postgresql://user:password@host:5432/dbname"
   ```

   Переменные `S3_*` (Yandex Object Storage, загрузка фото тренеров —
   см. раздел «ЛР6») нужны только для эндпоинтов загрузки файлов; без них
   остальное приложение работает как обычно, а запрос на загрузку фото
   вернёт ошибку обращения к хранилищу.

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
├── common/                # общие DTO, глобальный exception filter, перехватчики (Timing/Etag)
├── prisma/                # инфраструктурный слой доступа к БД (PrismaService/PrismaModule)
├── storage/               # инфраструктурный слой объектного хранилища (StorageService/StorageModule, S3)
├── graphql/               # общие GraphQL-хелперы (пагинация, сложность запроса) — см. ЛР5
├── trainers/               # поддомен "Тренеры": MVC ("/trainers") + REST API ("/api/trainers") + SSE + загрузка фото
├── memberships/            # поддомен "Абонементы": MVC ("/pricing") + REST API ("/api/memberships")
├── products/               # поддомен "Питание": MVC ("/nutrition") + REST API ("/api/products")
├── users/                  # поддомен "Участники": MVC ("/users") + REST API ("/api/users")
└── reviews/                # поддомен "Отзывы": MVC ("/reviews") + REST API ("/api/reviews")
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
### ЛР4. RESTful API и его спецификация

- У каждого из пяти поддоменов рядом с MVC-контроллером появился отдельный
  REST-контроллер (`*.api.controller.ts`), использующий тот же сервис —
  бизнес-логика не дублируется между MVC и API. Маршрут API называется по
  имени сущности, а не по названию MVC-страницы (например, `Membership` —
  `/pricing` в MVC, но `/api/memberships` в API).
- Дочерние сущности из родительской: `GET /api/memberships/:id/users` и
  `GET /api/memberships/:id/users/:userId`, `GET /api/users/:id/reviews` и
  `GET /api/users/:id/reviews/:reviewId` — без циклических зависимостей
  модулей эти выборки обращаются к таблице потомка напрямую через
  `PrismaService`, а не через сервис соседнего модуля.
- `AllExceptionsFilter` расширен: коды ошибок Prisma `P2002` (нарушение
  уникальности, например повторный email участника) и `P2003` (нарушение
  внешнего ключа, например несуществующий `membershipId`) теперь
  превращаются в `409 Conflict` и `400 Bad Request` соответственно, а не в
  общий `500`.
- Пагинация (`findAllPaginated`, `Prisma.$transaction([findMany, count])`)
  реализована во всех пяти сервисах; общая логика HATEOAS-заголовка `Link`
  вынесена в `src/common/pagination.util.ts` — заодно исправлена
  найденная в процессе ошибка (`request.baseUrl` у контроллеров Nest
  всегда пуст, из-за чего `Link` указывал на `/` вместо пути ресурса).
- Swagger: один тег на модуль (`Trainers API`, `Memberships API`,
  `Products API`, `Users API`, `Reviews API`), `@ApiProperty` на всех
  DTO тела запроса, отдельные `*-response.dto.ts`/`paginated-*.dto.ts`
  для тел ответа, задокументированы реальные коды статусов (не только
  200/404, но и 400/409/204) — доступно на `/api/docs`.
- Попутно обнаружена и исправлена утечка `passwordHash` из `User` в JSON
  API (на MVC-страницах была незаметна, так как Handlebars рендерит
  только явно указанные в шаблоне поля) — оба сервиса (`UsersService`,
  `ReviewsService`) теперь используют явный Prisma `select` без этого
  поля.
- Подробный отчёт, Postman-коллекция на все пять поддоменов и инструкция
  по проверке — в [`docs/lab4`](./docs/lab4).

### ЛР5. Схема GraphQL

- Подключён GraphQL code-first (`@nestjs/graphql`, `@nestjs/apollo`,
  Apollo Server) — схема (`src/graphql/schema.gql`) собирается из
  декораторов `@ObjectType`/`@InputType`/`@Resolver`, песочница — Apollo
  Sandbox (не устаревший GraphQL Playground).
- Для каждого из пяти поддоменов — свой `*.resolver.ts` и подпапка
  `graphql/` рядом с `dto/`/`entities/`; `Update*Input` порождается из
  `Create*Input` через `PartialType`/`OmitType`, а не копированием полей.
- Доменные переходы состояния — отдельными мутациями, а не общим `update`:
  `restockProduct`/`sellProduct` (остаток товара),
  `changeUserPassword`, `assignMembership`/`cancelMembership`.
- Вложенные сущности — через field resolver (`Membership.users`,
  `User.membership`, `User.reviews`, `Review.author`), с постраничным
  дженериком `Paginated<T>` (`src/graphql/paginated.type.ts`).
- Подсчёт сложности запроса (`graphql-query-complexity`) и отклонение
  слишком тяжёлых запросов ещё до выполнения резолверов
  (`src/graphql/complexity.ts`, плагин Apollo в `src/app.module.ts`).
- Подробный отчёт и примеры запросов — в [`docs/lab5`](./docs/lab5).

### ЛР6. Возможности NestJS для BFF: время обработки, кэширование, файлы

**Измерение времени обработки запроса**

- `TimingInterceptor` (`src/common/interceptors/timing.interceptor.ts`) —
  реактивный перехватчик на RxJS (`tap`, без `async/await`), подключён
  глобально в `main.ts`. Логирует время каждого запроса и возвращает его
  клиенту двумя способами в зависимости от типа маршрута:
  - страница (`@Render(...)`) — время кладётся прямо в модель
    представления (`elapsedTimeMs`); `views/partials/footer.hbs` выводит
    его в `data`-атрибут, а `public/js/main.js` показывает его рядом со
    временем, измеренным в браузере (`performance.now()`), — единая
    строка вида «Время загрузки страницы: 42 мс (обработка на сервере:
    6 мс)»;
  - RESTful API и GraphQL — время уходит в заголовок ответа
    `X-Elapsed-Time`. Для GraphQL пришлось явно прокинуть объект ответа
    Express в контекст резолверов (`context: ({ req, res }) => ({ req, res
    })` в `GraphQLModule`, `src/app.module.ts`) — по умолчанию
    `@nestjs/apollo` кладёт в контекст только `req`.

**Кэширование ответов**

- Клиент: `EtagInterceptor` (`src/common/interceptors/etag.interceptor.ts`)
  считает SHA-1 от тела GET-ответов REST API и выставляет заголовок
  `ETag`; дальше условный `GET` (`If-None-Match`) целиком обрабатывает сам
  Express (модуль `fresh`, используется внутри `res.json()`/`res.send()`)
  — перехватчику не нужно вручную обрывать поток и отдавать `304`.
  `Cache-Control` (`private, max-age=60, must-revalidate`) проставлен
  декоратором `@Header(...)` на все "читающие" эндпоинты пяти
  `*.api.controller.ts` — сочетание обоих заголовков позволяет браузеру
  не ходить на сервер целую минуту, а после этого — получить пустой `304`,
  если данные не изменились.
- Сервер: стандартный `CacheModule` (`@nestjs/cache-manager`, in-memory
  стор по умолчанию) подключён только в `TrainersModule` — тренеры
  выбраны как самая часто читаемая сущность приложения (используются на
  главной странице, странице контактов и в собственном разделе с SSE).
  `GET /api/trainers` и `GET /api/trainers/:id`
  (`src/trainers/trainers.api.controller.ts`) обёрнуты в
  `@UseInterceptors(CacheInterceptor)` с `@CacheTTL(5000)` — пять секунд
  осознанно выбраны короткими, чтобы не заниматься ручной инвалидацией
  при создании/редактировании тренера. Проверено вручную: подряд
  отправленные запросы после создания тренера первые ~5 секунд
  возвращают старый список (`X-Elapsed-Time: 0`), затем автоматически
  подхватывают изменение.
- Порядок глобальных перехватчиков в `main.ts` важен:
  `TimingInterceptor` — снаружи, чтобы измерить весь конвейер, включая
  попадание в серверный кэш, `EtagInterceptor` — внутри него.

**Загрузка файлов в объектное хранилище**

- Инфраструктурный модуль `StorageModule`/`StorageService`
  (`src/storage`) — та же роль, что у `PrismaService` для базы данных:
  инкапсулирует AWS SDK (`@aws-sdk/client-s3`) и настройки конкретного
  провайдера (Yandex Object Storage, S3-совместимый API) за одним
  сервисом с методом `uploadFile()`, а не размазывает клиент S3 по
  контроллерам. Настройки — переменные окружения `S3_*` (см.
  `.env.example`).
- Фото тренера (`Trainer.photoUrl`) — единственное поле с файлом в
  домене — теперь реально загружается в хранилище, а не вводится
  вручную как ссылка:
  - MVC-форма (`views/trainers/form.hbs`, добавление и редактирование
    тренера) — вместо текстового поля "URL фотографии" теперь `<input
    type="file">`, форма отправляется как `multipart/form-data`
    (`TrainersController.create`/`updateFromForm`,
    `FileInterceptor('photo')`); если файл не передан при
    редактировании — текущее фото не трогается.
  - REST API — отдельный эндпоинт `POST /api/trainers/:id/photo`
    (`TrainersApiController.uploadPhoto`), тоже `multipart/form-data`,
    поле `photo`.
  - Валидация файла по документации NestJS —
    `ParseFilePipeBuilder().addFileTypeValidator(...).addMaxSizeValidator(...)`:
    только `image/jpeg|png|webp|gif`, не более 5 МБ.

Подробный отчёт с примерами проверки (`curl`) — в [`docs/lab6`](./docs/lab6).
