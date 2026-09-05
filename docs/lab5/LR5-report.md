# Лабораторная работа 5

## Тема

Разработка схемы GraphQL.

## Цель работы

Получить готовую GraphQL-схему для существующей модели данных приложения (подход code-first, Apollo Server) с возможностью выполнять запросы и мутации во встроенной песочнице.

## Исходные данные

- Технологический стек: NestJS, Prisma, PostgreSQL.
- Предыдущая реализация (ЛР1-4): пять поддоменов — Trainer, Membership, Product, User, Review — с сервисами, MVC- и REST-контроллерами.

## Что было реализовано

### 1. Подключение GraphQL (code-first, Apollo Server)

- Пакеты: `@nestjs/graphql`, `@nestjs/apollo`, `@apollo/server`, `@as-integrations/express5` (проект использует Express 5 из `@nestjs/platform-express@11`), `graphql`, `graphql-query-complexity`.
- `GraphQLModule.forRootAsync` подключён в `src/app.module.ts`: `autoSchemaFile` собирает SDL-схему (`src/graphql/schema.gql`, не коммитится — генерируется при каждом запуске, см. `.gitignore`) из декораторов `@ObjectType`/`@InputType`/`@Resolver` по всему проекту.
- По умолчанию `@nestjs/apollo` вне production поднимает устаревший GraphQL Playground — явно отключено (`playground: false`) в пользу актуальной встроенной песочницы Apollo Server (**Apollo Sandbox**, плагин `ApolloServerPluginLandingPageLocalDefault`).

Файлы: `src/app.module.ts`.

### 2. Схема данных — по одному `@ObjectType`/`Input`-паре на поддомен

Для каждого из пяти поддоменов заведена подпапка `graphql/` рядом с существующими `dto/`/`entities/` (REST- и GraphQL-слои не смешиваются и не зависят друг от друга):

| Поддомен | ObjectType | Create/Update Input | Файлы |
|---|---|---|---|
| Trainer | `TrainerType` | `CreateTrainerInput`/`UpdateTrainerInput` | `src/trainers/graphql/*.ts` |
| Membership | `MembershipType` | `CreateMembershipInput`/`UpdateMembershipInput` | `src/memberships/graphql/*.ts` |
| Product | `ProductType` (+ enum `ProductCategory`) | `CreateProductInput`/`UpdateProductInput` | `src/products/graphql/*.ts` |
| User | `UserType` | `CreateUserInput`/`UpdateUserInput` | `src/users/graphql/*.ts` |
| Review | `ReviewType` | `CreateReviewInput`/`UpdateReviewInput` | `src/reviews/graphql/*.ts` |

Все поля снабжены `description` (видны в схеме песочницы). `UpdateXxxInput` порождается из `CreateXxxInput` через `PartialType`/`OmitType` из `@nestjs/graphql`, а не копированием полей.

### 3. Запросы и мутации — по доменным операциям, а не по общему CRUD-шаблону

Как и требуется в задании (пример с `Post.publish()`/`Post.hide()` вместо общего `changeStatus`), там, где поле — не просто атрибут, а переход состояния или связи, вместо одной мутации `update` сделаны отдельные:

- **Product.stock** (остаток на складе) не входит в `CreateProductInput`/`UpdateProductInput` — им управляют только `restockProduct(id, quantity)` (пополнение) и `sellProduct(id, quantity)` (продажа, с проверкой, что на складе достаточно товара — иначе `BadRequestException` → корректная GraphQL-ошибка).
- **User.password** — не входит в `UpdateUserInput`; смена пароля — отдельная мутация `changeUserPassword(id, newPassword)`.
- **User.membershipId** (оформленный абонемент) — не входит в `UpdateUserInput`; оформление и отмена абонемента — отдельные мутации `assignMembership(userId, membershipId)` и `cancelMembership(userId)`.

Полный список операций (см. также `docs/lab5/example-operations.graphql`):

- Query: `trainers`/`trainer`, `memberships`/`membership`, `products`/`product`, `users`/`user`, `reviews`/`review` — все списки постраничные.
- Mutation: `create*`/`update*`/`remove*` для всех пяти поддоменов, плюс доменные `restockProduct`, `sellProduct`, `changeUserPassword`, `assignMembership`, `cancelMembership`.

Файлы: `src/*/*.resolver.ts`, `src/products/products.service.ts` (`restock`/`sell`), `src/users/users.service.ts` (`changePassword`/`assignMembership`/`cancelMembership`).

### 4. Вложенные сущности через field resolver

- `Membership.users(page, limit)` — постраничный список участников с этим абонементом (`MembershipsService.findUsersPaginated`, реальный SQL `skip`/`take`, а не срез массива в памяти).
- `User.membership` — текущий абонемент участника, отдельным запросом через `MembershipsService.findOne` (а не через предзагруженные данные) — ровно так, как показано в примере из документации NestJS (`AuthorsResolver.posts` через `PostsService`).
- `User.reviews(page, limit)` — постраничный список отзывов участника (`UsersService.findReviewsPaginated`).
- `Review.author` — зарегистрированный автор отзыва (или `null` для гостевого), отдельным запросом через `UsersService.findOne`.

Чтобы не заводить циклическую зависимость модулей (`MembershipsModule -> UsersModule -> MembershipsModule` и `ReviewsModule -> UsersModule -> ReviewsModule` уже существуют в обратную сторону, см. ЛР3/ЛР4), `MembershipsService.findUsersPaginated`/`UsersService.findReviewsPaginated` обращаются к таблице потомка напрямую через `PrismaService` — так же, как уже сделано в REST-версии для тех же связей.

### 5. Пагинация

Общий дженерик-хелпер `Paginated<T>(classRef)` (`src/graphql/paginated.type.ts`) строит `PaginatedXxxType` (`items`/`page`/`limit`/`total`/`totalPages`) для любого `@ObjectType` — то же самое, что `PaginatedXxxResponseDto` в REST-версии, но одним переиспользуемым кодом вместо пяти копий. Общие аргументы `page`/`limit` (`src/graphql/pagination.args.ts`, `@ArgsType`, лимит 1-50) применяются как к корневым запросам списков, так и к постраничным field resolver'ам (`Membership.users`, `User.reviews`).

### 6. Подсчёт сложности запроса и ограничение

- `src/graphql/complexity.ts`: `paginatedComplexity` — стоимость постраничного поля равна `limit * childComplexity` (широкий список с дорогими вложенными полями стоит дороже, чем список с простыми полями), проставлена в `complexity` у всех постраничных `@Query`/`@ResolveField`.
- В `GraphQLModule` (`src/app.module.ts`) подключён Apollo-плагин на основе `graphql-query-complexity` (`didResolveOperation`): если сложность конкретного запроса превышает `MAX_QUERY_COMPLEXITY` (1000), запрос отклоняется с понятной ошибкой ещё до выполнения резолверов.
- Проверено вручную: `{ memberships(limit: 50) { items { users(limit: 50) { total } } } }` (сложность 2550) отклоняется, а тот же запрос с `limit: 5` проходит.

### 7. Побочное исправление: `AllExceptionsFilter` не работал для GraphQL

При тестировании обнаружено, что существующий глобальный `AllExceptionsFilter` (ЛР4) вызывал `host.switchToHttp().getRequest()` без учёта контекста GraphQL — в GraphQL-запросах это приводило не к штатной GraphQL-ошибке, а к необработанному исключению `Cannot read properties of undefined (reading 'originalUrl')` (500 без осмысленного сообщения). Исправлено: при `host.getType() === 'graphql'` фильтр теперь просто пробрасывает исключение дальше, а его форматированием в `errors` занимается сам Apollo Server — REST/MVC-поведение фильтра не изменилось.

Файл: `src/common/filters/all-exceptions.filter.ts`.

## Примеры запросов

Готовый набор запросов и мутаций для песочницы (вставить в панель Operations рядом с редактором):

- `docs/lab5/example-operations.graphql`

Набор содержит по каждому поддомену список/деталь/create/update/remove, доменные мутации (`restockProduct`/`sellProduct`/`changeUserPassword`/`assignMembership`/`cancelMembership`), пример вложенного запроса через field resolver'ы (`membership { users { ... } }` и `user { reviews { ... } }`) и пример запроса, намеренно превышающего лимит сложности.

## Инструкция по запуску

1. Установить зависимости: `npm install`.
2. Указать `DATABASE_URL` в `.env` и применить миграции: `npx prisma migrate deploy`.
3. Запустить проект: `npm run start:dev`.
4. Открыть встроенную песочницу Apollo Sandbox: `http://localhost:3000/graphql`.
5. В песочнице открыть вкладку **Schema** (список типов/запросов/мутаций) или вставить содержимое `docs/lab5/example-operations.graphql` в редактор операций и выполнять запросы по одному (Cmd/Ctrl+Enter).

## Проверка результатов

- В песочнице по адресу `http://localhost:3000/graphql` открывается интерфейс Apollo Sandbox, слева видна схема (Query/Mutation/типы), справа — редактор операций.
- Списки (`trainers`, `memberships`, `products`, `users`, `reviews`) возвращают `items`/`page`/`limit`/`total`/`totalPages`.
- Вложенные поля (`membership.users`, `user.membership`, `user.reviews`, `review.author`) резолвятся отдельными запросами и корректно возвращают `null`/пустую страницу там, где связи нет (гостевой отзыв, участник без абонемента).
- Доменные мутации `restockProduct`/`sellProduct` не позволяют продать больше, чем есть на складе (понятная GraphQL-ошибка, а не 500).
- Запрос с чрезмерной сложностью (глубокая вложенность больших `limit`) отклоняется до выполнения резолверов с сообщением о превышении лимита.

## Вывод

В ходе выполнения ЛР-5 для существующей модели данных приложения (Trainer, Membership, Product, User, Review) построена GraphQL-схема code-first на Apollo Server с рабочей встроенной песочницей. Запросы и мутации спроектированы по доменным операциям (пополнение/продажа склада, смена пароля, оформление/отмена абонемента — отдельными мутациями, а не общими сеттерами), вложенные сущности реализованы через field resolver'ы с собственной пагинацией, а сложность запроса ограничена общим Apollo-плагином на основе `graphql-query-complexity`. Попутно найдена и исправлена ошибка глобального обработчика исключений, из-за которой доменные ошибки в GraphQL превращались в непрозрачный 500.
