# Лабораторная работа 7

## Тема

Добавление аутентификации и авторизации.

## Цель работы

Реализовать в приложении модуль, отвечающий за предоставление прав в рамках
пользовательской сессии внутри контроллеров: разграничить анонимный,
аутентифицированный и административный доступ к MVC-страницам и методам
REST API, используя готового поставщика Authentication/Authorization as a
Service — [SuperTokens](https://supertokens.com/) — и штатные механизмы
NestJS для интеграции с ним (динамический модуль, Guards, Middleware,
декораторы).

> Первая версия этой лабораторной была выполнена с собственной
> JWT-реализацией (без стороннего провайдера) — задание явно допускает
> такой вариант "на свой страх и риск". По требованию было решено
> переделать модуль на готового поставщика; ниже описана именно эта,
> финальная версия.

## Исходные данные

- Технологический стек: NestJS, Prisma, PostgreSQL, GraphQL (Apollo Server).
- Предыдущая реализация (ЛР1-6): пять поддоменов — Trainer, Membership,
  Product, User, Review — с MVC- и REST-контроллерами; сущность `User` уже
  содержала `email` (задел под аутентификацию из ЛР2), но реального входа
  не было — состояние сессии имитировалось query-параметром
  `?auth=true|false`.
- Поставщик: **SuperTokens**, вариант размещения — **Managed Service**
  (облачный, `https://<tenant>.aws.supertokens.io`), т.к. self-hosted
  через Docker в среде разработки оказался недоступен (см. раздел
  «Ограничение среды разработки» ниже) — сам механизм интеграции с
  приложением не зависит от способа размещения Core.

## Что было реализовано

### 1. Роли: `User.role` + recipe UserRoles

`prisma/schema.prisma` — на сущности `User` остаётся `enum Role { USER
ADMIN }` и поле `role` (миграция ещё из первой версии ЛР7). Это **зеркало**
для удобных SQL-запросов и отображения в админ-панели; источник истины при
авторизации — клеймы сессии SuperTokens (recipe
[UserRoles](https://supertokens.com/docs/additionalverification/user-roles/introduction),
`UserRoleClaim`), а не эта колонка.

Поле `passwordHash`, наоборот, **удалено** из схемы отдельной миграцией
(`prisma/migrations/20260911000000_supertokens_drop_password_hash`) — с
переходом на стороннего провайдера хранение и проверка пароля переходят
целиком к нему; локальный хеш стал бы дублирующим и потенциально
рассинхронизированным источником данных.

### 2. Динамический модуль `AuthModule`

`src/auth/auth.module.ts` — модуль по образцу
[Dynamic modules](https://docs.nestjs.com/modules#dynamic-modules), на
который прямо ссылается задание: статический метод `AuthModule.forRoot(options)`
принимает `{ connectionURI, apiKey, appName, apiDomain, websiteDomain }`, а
сами значения читаются из переменных окружения один раз при старте — в
`src/app.module.ts`, не внутри самого `AuthModule`:

```ts
AuthModule.forRoot({
  connectionURI: process.env.SUPERTOKENS_CONNECTION_URI ?? "http://localhost:3567",
  apiKey: process.env.SUPERTOKENS_API_KEY,
  appName: process.env.APP_NAME ?? "PowerGit Gym",
  apiDomain: process.env.API_DOMAIN ?? "http://localhost:3000",
  websiteDomain: process.env.WEBSITE_DOMAIN ?? "http://localhost:3000",
})
```

Конфигурация (Connection URI + API-ключ — то самое окно из задания со
скриншотом) вынесена в `.env` (`SUPERTOKENS_CONNECTION_URI`,
`SUPERTOKENS_API_KEY`, `APP_NAME`, `API_DOMAIN`, `WEBSITE_DOMAIN`, см.
`.env.example`) — по аналогии с `DATABASE_URL`/`S3_*` из предыдущих
лабораторных. `supertokens.init(...)` — глобальный побочный эффект самого
SDK, поэтому выполняется синхронно прямо в `forRoot()`, на этапе
регистрации модуля (см. `src/auth/config/supertokens.config.ts`).

### 3. Recipe SuperTokens и синхронизация с доменом User

`src/auth/config/supertokens.config.ts` — единственное место интеграции
с доменом приложения. Подключены три recipe:

- **EmailPassword** — классическая пара логин/пароль. Форма регистрации
  дополнена необязательными полями `name`/`phone` (`signUpFeature.formFields`).
  Через `override` подключены два хука:
  - `functions.signUp` — срабатывает при ЛЮБОМ способе регистрации (и
    через публичный `POST /auth/signup`, и когда `UsersService.create()`,
    админ-панель, вызывает `EmailPassword.signUp(...)` напрямую): заводит
    зеркальную запись `User` в нашей БД (`id` совпадает с userId,
    выданным SuperTokens) и назначает роль `USER` по умолчанию через
    `UserRoles.addRoleToUser(...)`.
  - `apis.signUpPOST` — срабатывает только для реального HTTP-запроса
    (там доступны `formFields`, включая `name`/`phone`, которых не видно
    на уровне recipe-функции): дозаполняет запись, созданную хуком выше,
    и на всякий случай донабирает клейм роли в токен уже созданной сессии.
- **Session** — через `override.functions.createNewSession` в payload
  access-токена любой новой сессии (после регистрации ИЛИ входа)
  подмешиваются текущие `email`/`name` из таблицы `User` — не нужно лезть
  в БД на каждый запрос, чтобы их прочитать (см. `SessionInfoMiddleware`).
- **UserRoles** — как только recipe подключен, роль пользователя
  (`UserRoleClaim`) начинает автоматически попадать в сессию. Роли `USER`
  и `ADMIN` заводятся один раз при старте приложения
  (`AuthModule.onModuleInit()` → `ensureRolesExist()`), чтобы `addRoleToUser`
  не падал с `UNKNOWN_ROLE_ERROR` на пустой инсталляции.

Маршруты аутентификации (`POST /auth/signup`, `/auth/signin`,
`/auth/signout`, `/auth/session/refresh` и т.д.) **генерирует сам SDK** —
это и есть тот самый Authorization Endpoint из задания; вручную эти
эндпоинты не писались.

### 4. Middleware — аутентификация (чтение сессии)

- `SessionInfoMiddleware` (`src/auth/middleware/session-info.middleware.ts`)
  — глобальный (подключён в `AuthModule.configure()`, `forRoutes("*")`):
  пытается прочитать сессию (`Session.getSession(req, res, { sessionRequired:
  false })`), и если она валидна — кладёт в `request.session` (для гвардов)
  и в упрощённом виде `{ id, email, name, isAdmin }` в `request.user` (для
  вьюшек и остального кода, не завязанного на конкретный SDK). Невалидный
  токен не блокирует запрос — `request.user` просто остаётся `undefined`.
- `RequireLoginMiddleware` (`src/auth/middleware/require-login.middleware.ts`)
  — сценарий, прямо описанный в задании: "неаутентифицированный посетитель
  запросил защищённую страницу — переадресовать на форму входа". Не
  изменился по сравнению с первой версией (проверяет то же `request.user`)
  — подключается точечно, через **Middleware Consumer**, в `configure()`
  модулей `Trainers/Memberships/Products/Reviews/UsersModule`.

### 5. Guards — авторизация (доступ/роль)

- `SessionAuthGuard` (`src/auth/guards/session-auth.guard.ts`) — implements
  `CanActivate`. Через `Reflector` проверяет `@PublicAccess()`; если
  маршрут публичный — пропускает. Иначе проверяет `request.session`,
  заполненный выше: нет сессии — `UnauthorizedException` (401).
- `RolesGuard` (`src/auth/guards/roles.guard.ts`) — сверяет клеймы ролей
  сессии (`session.getClaimValue(UserRoleClaim)`) со списком, заданным
  `@Roles(Role.ADMIN)`; при отсутствии клейма в уже выпущенном токене
  донабирает его (`fetchAndSetClaim`) перед отказом — на случай, если роль
  назначили уже после выдачи текущей сессии.

Оба гварда подключены **глобально** через `APP_GUARD` — по умолчанию
любой REST/MVC-эндпоинт приложения требует аутентификации.

### 6. Декораторы

Не изменились по смыслу относительно первой версии — `@PublicAccess()`
(`src/auth/decorators/public.decorator.ts`), `@Roles(Role.ADMIN)`
(`src/auth/decorators/roles.decorator.ts`, на уровне метода и класса —
см. `UsersController`/`UsersApiController`, где так помечен весь класс),
`@CurrentUser()` (`src/auth/decorators/current-user.decorator.ts`) — достаёт
`request.user` там, где авторизация зависит ещё и от `:id` в маршруте (см.
`ProfileController`).

### 7. Кто к чему получил доступ

Матрица доступа не изменилась относительно первой версии (сам провайдер —
деталь реализации, а не то, что определяет бизнес-правила):

| Раздел | Публично (гость) | Любой вход (USER/ADMIN) | Только ADMIN |
|---|---|---|---|
| `/`, `/about`, `/facilities`, `/contact` | весь раздел | — | — |
| `/login`, `/register`, `/auth/*` (SDK) | весь раздел | `GET /api/auth/me` | — |
| Тренеры (`/trainers`, `/api/trainers`) | просмотр, SSE | — | add/edit/delete, загрузка фото |
| Абонементы (`/pricing`, `/api/memberships`) | список | `GET :id/users` (личные данные) | add/edit/delete |
| Питание (`/nutrition`, `/api/products`) | просмотр | — | add/edit/delete |
| Отзывы (`/reviews`, `/api/reviews`) | просмотр **и создание** (гостевой отзыв, домен ЛР2) | — | edit/delete (модерация) |
| `/profile` (свой профиль, смена пароля) | — | весь раздел | весь раздел |
| Участники (`/users`, `/api/users`) | — | — | весь раздел, включая смену роли |

Публичная самостоятельная регистрация (`POST /auth/signup`) — узкий поток
(email/пароль/имя/телефон, без выбора абонемента и роли); раздел
"Участники" (`UsersController`/`UsersApiController`, весь класс помечен
`@Roles(Role.ADMIN)`) — административная панель (создание сразу с
абонементом, редактирование чужих данных, удаление, выдача роли).
Самостоятельное изменение своих данных и пароля — отдельная страница
`/profile` (`ProfileController`, `src/users/profile.controller.ts`).

### 8. UsersService: доменные операции теперь делегируют провайдеру

Единственная граница, через которую домен "Участники" общается с
SuperTokens — `UsersService`. GraphQL-резолвер и оба REST/MVC контроллера
как вызывали `create/update/remove/changePassword/changeRole`, так и
вызывают — сигнатуры не изменились, поменялась только реализация внутри:

```ts
// Регистрация — что публичная (/auth/signup), что админская (UsersService.create)
// используют один и тот же EmailPassword.signUp(...); override
// functions.signUp (см. supertokens.config.ts) сам заводит запись User.
async create(dto: CreateUserDto) {
  const result = await EmailPassword.signUp("public", dto.email, dto.password);
  if (result.status === "EMAIL_ALREADY_EXISTS_ERROR") {
    throw new ConflictException("Участник с таким email уже зарегистрирован");
  }
  return this.prisma.user.update({
    where: { id: result.user.id },
    data: { name: dto.name, phone: dto.phone, membershipId: dto.membershipId ?? null },
    select: SAFE_USER_SELECT,
  });
}
```

- `update()` — при смене `email`/`password` сначала вызывает
  `EmailPassword.updateEmailOrPassword({ recipeUserId, email, password })`
  (и только при успехе трогает зеркальную запись Prisma — иначе два
  хранилища разошлись бы: например, email обновился бы у нас, но не прошёл
  проверку уникальности у провайдера).
- `remove()` — сначала `supertokens.deleteUser(id)` (учётная запись и все
  активные сессии у провайдера), потом наша запись.
- `changeRole()` — `UserRoles.removeUserRole(...)` для прежней роли +
  `addRoleToUser(...)` для новой (роль в этом домене одна из двух
  одновременно, хотя recipe в общем случае допускает у пользователя
  несколько ролей).
- `changePassword()` (администратор, без проверки текущего пароля) и
  новый `verifyCurrentPassword()` (для self-service смены своего пароля на
  `/profile` — сверяет ТЕКУЩИЙ пароль через `EmailPassword.verifyCredentials`
  перед тем, как разрешить смену) — оба через SDK, никакого собственного
  хеширования в приложении больше нет.

### 9. Публичные страницы входа/регистрации — вызывают SDK напрямую с клиента

Раз маршруты `/auth/signup`, `/auth/signin`, `/auth/signout` генерирует сам
SuperTokens, наши `views/auth/login.hbs`/`register.hbs` — это только
разметка формы; отправкой и редиректом занимается
`public/js/auth-forms.js` (fetch к этим маршрутам, `credentials:
"same-origin"`, чтобы браузер сохранил выданную cookie). Кнопка "Выйти" в
`views/partials/session-info.hbs` — тем же способом дергает `POST
/auth/signout`. Страница `/profile` (смена своих данных/пароля), в отличие
от входа/регистрации, остаётся обычной server-side формой — это НАШ
собственный маршрут (`ProfileController`), не автогенерируемый SDK.

### 10. Swagger и CORS

- `main.ts` — `DocumentBuilder().addCookieAuth("sAccessToken", {...})`
  (имя cookie, в которой SuperTokens по умолчанию хранит access-токен
  сессии) + `@ApiCookieAuth()` на защищённых методах — иконка замка на
  `/api/docs`.
- CORS донастроен под протокол SuperTokens:
  `allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()]`.
- `bodyParser: false` при создании приложения (`NestFactory.create(AppModule,
  { bodyParser: false })`) — SuperTokens сам разбирает тело запроса для
  своих маршрутов; обычный `express.json()`/`express.urlencoded()`
  подключается вручную СРАЗУ ПОСЛЕ `app.use(superTokensMiddleware())`, а
  не через автоматический body-parser Nest — иначе тело запроса было бы
  уже прочитано к моменту, когда до него доберётся SuperTokens.

## Ограничение среды разработки (важно)

В процессе выполнения работы столкнулись с тем, что **изолированная среда
разработки (эта сессия) блокирует egress-политикой организации** любые
хосты `*.supertokens.io` целиком:

- Docker-реестр `registry.supertokens.io` (self-hosted Core через Docker
  недоступен — прямая ошибка 403 на `docker pull`).
- Публичный demo-core `try.supertokens.com`.
- Персональный Managed-инстанс тенанта, выданный конкретно для этой
  лабораторной (`https://st-dev-....aws.supertokens.io`) — при попытке
  инициализации приложение получает от прокси среды `403 Host not in
  allowlist`.

Это подтверждено логами при реальном запуске приложения — `AuthModule`
корректно ловит эту ошибку при старте (`onModuleInit`, попытка создать
роли) и не роняет всё приложение:

```text
[AuthModule] Не удалось создать роли в SuperTokens при старте
(проверьте SUPERTOKENS_CONNECTION_URI/SUPERTOKENS_API_KEY):
SuperTokens core threw an error for a GET request to path: '/apiversion'
with status code: 403 and message: Host not in allowlist:
st-dev-....aws.supertokens.io. Add this host to your network egress
settings to allow access.
```

Поэтому **живой цикл регистрация → вход → защищённый запрос → смена роли**
в этой среде проверить не удалось — только то, что не требует обращения к
Core:

```bash
# Публичные страницы/эндпоинты — работают мгновенно, к Core не обращаются
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
# 200

# Защищённая MVC-страница без cookie -> редирект на логин без похода в Core
# (при отсутствии токена SDK не делает сетевой вызов вообще)
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/users
# 302 -> http://localhost:3000/login?redirect=%2Fusers

# Защищённый REST-эндпоинт без cookie -> 401, тоже мгновенно
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/users
# 401

# Публичный REST-эндпоинт с телом запроса — express.json() после
# bodyParser:false + superTokensMiddleware работает корректно
curl -s -X POST http://localhost:3000/api/reviews -H "Content-Type: application/json" \
  -d '{"authorName":"Гость","text":"Отличный зал!","rating":5}'
# 201, отзыв реально сохранён в БД

# GraphQL (не входит в объём ЛР7, но использует тот же body-parser) —
# продолжает работать без изменений
curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ trainers(limit:3){ items { id name } } }"}'
# 200, {"data":{"trainers":{"items":[]}}}

# Регистрация/вход по-настоящему обращаются к Core -> в этой среде 500
# (Core недоступен), но процесс приложения не падает, отдаёт стилизованную
# страницу ошибки вместо голого краша
curl -s -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" \
  -d '{"formFields":[{"id":"email","value":"test@example.com"},{"id":"password","value":"secret123"}]}'
# 500 (в этой среде — ожидаемо), сервер остаётся отзывчивым дальше
```

**Как проверить живьём** (вне этой песочницы — локально с обычным
интернетом или на Render, где egress не ограничен): задать в `.env`
реальные `SUPERTOKENS_CONNECTION_URI`/`SUPERTOKENS_API_KEY` от своего
Managed-инстанса supertokens.com, запустить `npm run start:dev` и:

1. Открыть `/register`, зарегистрироваться — должен произойти редирект на
   `/`, в шапке появится "Вы вошли как …".
2. В БД (`SELECT id, email, role FROM "User"`) — увидеть новую запись
   с `role = 'USER'`.
3. Вручную выполнить `UserRoles.addRoleToUser` (или через
   `/users/:id/role` уже под другим администратором) — назначить `ADMIN`.
4. Перелогиниться (токен не обновляется "на лету") — пункт меню
   "Участники" должен появиться, кнопки управления в каталогах — стать
   видимыми.
5. `POST /api/auth/logout` через `/auth/signout` (кнопка "Выйти") — сессия
   должна быть отозвана, повторный `GET /api/auth/me` — вернуть 401.

## Вывод

ЛР7 переделана с собственной JWT-реализации на готового поставщика
Authentication/Authorization as a Service — SuperTokens — при сохранении
той же архитектуры на уровне NestJS, которую и требует задание:
динамический модуль (`AuthModule.forRoot(...)`, конфигурация — из
переменных окружения), Middleware для аутентификации (чтение сессии —
`SessionInfoMiddleware` — и отдельно переадресация на форму входа —
`RequireLoginMiddleware`, через Middleware Consumer), Guards для
авторизации (`SessionAuthGuard` + `RolesGuard`, оба глобальные, с обходом
через `@PublicAccess()`/`@Roles()`), схема безопасности в Swagger и
настроенный CORS под протокол провайдера. Домен "Участники" избавлен от
собственного хранения и проверки пароля — эта ответственность
(регистрация, вход, смена пароля/email, отзыв сессий) целиком передана
SuperTokens через recipe EmailPassword/Session/UserRoles, а `UsersService`
остаётся единственной точкой, где домен приложения обращается к SDK.
Из-за сетевого ограничения используемой среды разработки (egress-политика
организации блокирует все хосты `supertokens.io`, включая персональный
Managed-инстанс) живой цикл регистрация → вход → защищённый доступ → смена
роли проверен только частично (все пути, не требующие обращения к Core, —
маршрутизация, guards, redirect-логика, обработка ошибок, JSON body-parsing
после `bodyParser: false` — подтверждены реальными запросами к
поднятому приложению); полная проверка описана выше и должна быть
выполнена в среде с доступом к supertokens.io.
