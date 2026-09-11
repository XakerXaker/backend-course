# Лабораторная работа 7

## Тема

Добавление аутентификации и авторизации.

## Цель работы

Реализовать в приложении модуль, отвечающий за предоставление прав в рамках
пользовательской сессии внутри контроллеров: разграничить анонимный,
аутентифицированный и административный доступ к MVC-страницам и методам
REST API, используя механизмы NestJS — динамический модуль, Guards,
Middleware, декораторы.

## Исходные данные

- Технологический стек: NestJS, Prisma, PostgreSQL, GraphQL (Apollo Server).
- Предыдущая реализация (ЛР1-6): пять поддоменов — Trainer, Membership,
  Product, User, Review — с MVC- и REST-контроллерами; сущность `User`
  уже содержала `email`/`passwordHash` (задел под аутентификацию из ЛР2),
  но реального входа не было — состояние сессии имитировалось query-
  параметром `?auth=true|false`, читавшимся в каждом контроллере отдельным
  приватным методом `getUser(auth)`.
- Выбор поставщика: вместо стороннего Authorization-as-a-Service
  (SuperTokens/Firebase/Auth0) реализована собственная JWT-аутентификация
  внутри приложения — так, как это явно допускает и рекомендует для
  учебных целей формулировка задания ("реализовать все необходимые классы
  внутри вашего приложения самим... для понимания процесса авторизации").
  Внешний провайдер потребовал бы регистрации аккаунта в облачном
  сервисе и вынесения секретов, недоступных в изолированной среде
  разработки; собственная реализация покрывает все архитектурные
  требования задания (динамический модуль, Guards, Middleware, роли,
  Swagger-схема, CORS) тем же набором концепций NestJS.

## Что было реализовано

### 1. Роли: `User.role` в домене

`prisma/schema.prisma` — добавлен `enum Role { USER ADMIN }` и поле
`User.role Role @default(USER)` (миграция
`prisma/migrations/20260906000000_add_user_role`). Роль хранится на той же
сущности `User`, что и учётные данные — отдельная таблица "аккаунтов" не
понадобилась, поскольку `User` в этом домене изначально совмещает
"зарегистрированного участника зала" и "учётную запись" (`email` +
`passwordHash` были в схеме с ЛР2).

### 2. Динамический модуль `AuthModule`

`src/auth/auth.module.ts` — модуль сконфигурирован по образцу
[Dynamic modules](https://docs.nestjs.com/modules#dynamic-modules) из
задания: статический метод `AuthModule.register(options)` принимает
`{ jwtSecret, jwtExpiresIn, cookieName, cookieMaxAgeMs }`, а сами значения
читаются из переменных окружения один раз при старте — в `src/app.module.ts`,
не внутри самого `AuthModule`/`AuthService`:

```ts
AuthModule.register({
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  cookieName: process.env.AUTH_COOKIE_NAME ?? "access_token",
  cookieMaxAgeMs: process.env.AUTH_COOKIE_MAX_AGE_MS ? Number(...) : 86400000,
})
```

Модуль помечен `global: true` — `AuthService` и конфигурация должны быть
доступны из любого поддомена без явного импорта `AuthModule` в каждом из
них (как и `PrismaModule`/`StorageModule` из предыдущих лабораторных).
Новые переменные окружения задокументированы в `.env.example`
(`JWT_SECRET`, `JWT_EXPIRES_IN`, `AUTH_COOKIE_NAME`,
`AUTH_COOKIE_MAX_AGE_MS`, `CORS_ORIGIN`) — по аналогии с `S3_*` из ЛР6.

### 3. Middleware — аутентификация (чтение токена)

Ровно то разделение ответственности, которое процитировано в задании из
документации NestJS: Middleware отвечает за аутентификацию (разбор
токена, запись в `request`), Guards — за то, будет ли запрос допущен
дальше.

- `CurrentUserMiddleware` (`src/auth/middleware/current-user.middleware.ts`)
  — читает JWT из httpOnly-cookie (или заголовка `Authorization: Bearer`
  — для проверки через Postman/curl без работы с cookie jar), проверяет
  подпись через `JwtService.verify()` и, если токен валиден, кладёт
  полезную нагрузку в `request.user`. Невалидный/просроченный/отсутствующий
  токен не блокирует запрос — просто `request.user` остаётся `undefined`,
  решение о доступе принимает гвард. Подключена **глобально**
  (`AuthModule.configure()`, `consumer.apply(...).forRoutes("*")`) — это
  нужно не только защищённым маршрутам, но и вьюшкам: шапка сайта должна
  показывать состояние сессии на любой странице, а не только на защищённых.

- `RequireLoginMiddleware`
  (`src/auth/middleware/require-login.middleware.ts`) — второй middleware,
  именно тот сценарий, который прямо указан в задании: "пользователь
  запрашивает ресурс, доступный только авторизованным, но аутентификация
  ещё не пройдена — необходимо переадресовать на форму входа". Проверяет
  `request.user` и делает `res.redirect('/login?redirect=...')`, если его
  нет. Подключается **точечно**, через **Middleware Consumer**, в
  `configure()` тех модулей, чьи MVC-страницы требуют входа —
  `TrainersModule`, `MembershipsModule`, `ProductsModule`, `ReviewsModule`,
  `UsersModule` — с явным списком маршрутов (например, для тренеров:
  `POST /trainers`, `GET /trainers/add`, `.../:id/edit`,
  `POST .../:id/delete`), а не всего контроллера целиком, поскольку в
  каждом из них публичный просмотр (список/карточка) соседствует со
  служебным управлением (add/edit/delete).

### 4. Guards — авторизация (доступ/роль)

- `JwtAuthGuard` (`src/auth/guards/jwt-auth.guard.ts`) — implements
  `CanActivate`. Через `Reflector` проверяет метаданные `@PublicAccess()`
  (см. ниже); если маршрут публичный — пропускает. Иначе проверяет
  `request.user`, выставленный `CurrentUserMiddleware`: если его нет —
  бросает `UnauthorizedException` (401). GraphQL-контекст (резолверы ЛР5)
  сознательно исключён из этой лабораторной — гвард пропускает его без
  проверки (`context.getType() === "graphql"`), поскольку задание
  ссылается на контроллеры, спроектированные в ЛР4.
- `RolesGuard` (`src/auth/guards/roles.guard.ts`) — второй, отдельный
  гвард (см. [Authorization](https://docs.nestjs.com/security/authorization)
  из задания): читает метаданные `@Roles(...)` — если их нет, доступ
  разрешён любому аутентифицированному пользователю (сам факт
  аутентификации уже проверил `JwtAuthGuard`); если есть — сверяет
  `request.user.role` со списком, иначе `ForbiddenException` (403).

Оба гварда подключены **глобально** через `APP_GUARD` в
`AuthModule.register()` — по умолчанию **любой** REST/MVC-эндпоинт
приложения требует аутентификации, а публичным его нужно объявить явно.

### 5. Декораторы

- `@PublicAccess()` (`src/auth/decorators/public.decorator.ts`) — аналог
  примера `@PublicAccess` из задания, освобождает эндпоинт от требования
  аутентификации.
- `@Roles(Role.ADMIN)` (`src/auth/decorators/roles.decorator.ts`) —
  ограничивает эндпоинт ролью; применяется и на отдельные методы, и на
  класс контроллера целиком (`UsersController`/`UsersApiController` —
  весь раздел управления учётными записями администраторский).
- `@CurrentUser()` (`src/auth/decorators/current-user.decorator.ts`) —
  параметр-декоратор, достаёт `request.user` там, где одного гварда с
  ролью недостаточно и нужна доменная проверка внутри самого обработчика
  (см. `ProfileController` — пользователь меняет только свои данные).

### 6. Кто к чему получил доступ

| Раздел | Публично (гость) | Любой вход (USER/ADMIN) | Только ADMIN |
|---|---|---|---|
| `/`, `/about`, `/facilities`, `/contact` | весь раздел | — | — |
| `/login`, `/register`, `/logout`, `/api/auth/*` (кроме `me`) | весь раздел | `GET /api/auth/me` | — |
| Тренеры (`/trainers`, `/api/trainers`) | просмотр, SSE | — | add/edit/delete, загрузка фото |
| Абонементы (`/pricing`, `/api/memberships`) | список | `GET :id/users` (личные данные) | add/edit/delete |
| Питание (`/nutrition`, `/api/products`) | просмотр | — | add/edit/delete |
| Отзывы (`/reviews`, `/api/reviews`) | просмотр **и создание** (гостевой отзыв, домен ЛР2) | — | edit/delete (модерация) |
| `/profile` (свой профиль, смена пароля) | — | весь раздел | весь раздел |
| Участники (`/users`, `/api/users`) | — | — | весь раздел, включая смену роли |

Ключевое архитектурное решение: публичная самостоятельная регистрация
(`POST /register`, `POST /api/auth/register`) — это отдельный, узкий поток
(email/пароль/имя/телефон, без выбора абонемента и роли), а раздел
"Участники" (`UsersController`/`UsersApiController`) стал полноценной
административной панелью управления учётными записями (создание с сразу
назначенным абонементом, редактирование чужих данных, удаление, выдача
роли). Самостоятельное изменение **своих** данных и пароля вынесено на
отдельную страницу `/profile` (`ProfileController`,
`src/users/profile.controller.ts`) — именно то самообслуживание,
о котором говорится в задании ("доступ к изменению настроек своей учётной
записи... паролей").

### 7. Выпуск и проверка токена

`AuthService` (`src/auth/auth.service.ts`) — инфраструктурный сервис:
не знает, как хранится пароль (эта доменная логика осталась в
`UsersService`, поддомен "Участники" — метод `validateCredentials`
использует `scryptSync`/`timingSafeEqual`, унаследованные из ЛР2/ЛР4),
отвечает только за формат и выдачу JWT:

```ts
issueToken(user) {
  const payload: JwtPayload = { sub: user.id, email: user.email, name: user.name, role: user.role };
  const accessToken = this.jwtService.sign(payload); // секрет/TTL — из AuthModule.register
  return { accessToken, user: {...} };
}
```

`AuthApiController` (`POST /api/auth/register`, `POST /api/auth/login`,
`POST /api/auth/logout`, `GET /api/auth/me`) и `AuthController` (те же
операции, но для MVC — страницы `/login`/`/register` с формой и
редиректами) используют один и тот же `AuthService`. Токен уходит и в
httpOnly-cookie (`response.cookie(...)`, для браузера), и в теле JSON-ответа
(`accessToken`) — второе специально для проверки через Postman/curl без
cookie jar, ровно тот сценарий, что описан в задании со скриншотами
Postman/jwt.io.

### 8. Swagger — схема авторизации

`src/main.ts` — `DocumentBuilder().addCookieAuth(cookieName, { type:
"apiKey", in: "cookie" })` регистрирует схему `cookie`; каждый защищённый
метод дополнительно декорирован `@ApiCookieAuth()`
(`src/*/*.api.controller.ts`). На `/api/docs` у всех методов, требующих
входа, теперь отображается иконка замка́ — как и показано в задании.

### 9. CORS

`src/main.ts` — `app.enableCors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true, credentials: true })`.
`credentials: true` обязателен: без него браузер не приложит httpOnly-cookie
к запросу на другой origin (а без явного списка origin вместо `"*"` сам
браузер не разрешит credentialed-запрос). Список разрешённых origin
вынесен в переменную окружения `CORS_ORIGIN` (см. `.env.example`).
Дополнительно подключён `cookie-parser` (`app.use(cookieParser())`) —
без него Express не разбирает заголовок `Cookie` в `req.cookies`.

### 10. Фронтенд: реальное состояние сессии вместо `?auth=`

Ранее каждый MVC-контроллер содержал одинаковый метод-заглушку
`getUser(auth: string)`, а каждая ссылка во вьюшках несла query-параметр
`?auth={{auth}}`. Заглушка удалена из всех контроллеров (`AppController`,
`TrainersController`, `MembershipsController`, `ProductsController`,
`ReviewsController`, `UsersController`) — модель представления теперь
получает `user: req.user`, заполненный `CurrentUserMiddleware`, а `?auth=`
убран из всех ссылок и `<form action>` во вьюшках.

- `views/partials/session-info.hbs` — показывает "Вы вошли как
  {{name}}" (+ бейдж "Администратор" для роли ADMIN), ссылки "Профиль" и
  форму выхода — либо "Войти"/"Регистрация" для гостя.
- `views/partials/nav.hbs` — пункт меню "Участники" отображается только
  при `user.role === "ADMIN"`.
- Кнопки "Добавить/Редактировать/Удалить" в `trainers/list.hbs`,
  `memberships/list.hbs`, `products/list.hbs`, `reviews/list.hbs` обёрнуты
  в `{{#if isAdmin}}` — модель передаёт этот флаг из `req.user?.role`,
  чтобы не показывать гостю ссылку на страницу, которая всё равно ответит
  403/редиректом на логин.
- Новые страницы: `views/auth/login.hbs`, `views/auth/register.hbs`,
  `views/users/profile.hbs` (собственный профиль + смена пароля).

## Проверка результатов

Ручная проверка через `curl` с локальным PostgreSQL (аналогично
предыдущим лабораторным):

```bash
# 1. Анонимный доступ к служебной MVC-странице -> редирект на логин
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/users
# 302 -> http://localhost:3000/login?redirect=%2Fusers

# 2. Анонимный доступ к защищённому REST-эндпоинту -> 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/users
# 401

# 3. Регистрация обычного пользователя (публичный поток)
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ivan@example.com","password":"secret123","name":"Ivan Ivanov"}'
# {"accessToken":"...", "user":{"id":"...","email":"ivan@example.com","role":"USER"}}

# 4. Профиль текущего пользователя по cookie
curl -s -b cookies.txt http://localhost:3000/api/auth/me
# {"sub":"...","email":"ivan@example.com","role":"USER",...}

# 5. Обычный пользователь -> служебный ресурс REST API -> 403
curl -s -b cookies.txt -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/users
# 403
curl -s -b cookies.txt -X POST http://localhost:3000/api/trainers \
  -H "Content-Type: application/json" -d '{"name":"Т","specialization":"Т","experience":1}' \
  -o /dev/null -w "%{http_code}\n"
# 403

# 6. Тот же пользователь, роль повышена в БД до ADMIN, токен переиздан (повторный вход)
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{"email":"ivan@example.com","password":"secret123"}'
curl -s -b cookies.txt -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/users
# 200
curl -s -b cookies.txt -X POST http://localhost:3000/api/trainers \
  -H "Content-Type: application/json" -d '{"name":"Тест","specialization":"Йога","experience":3}' \
  -w "\n%{http_code}\n"
# 201

# 7. MVC: неверный пароль -> форма логина с ошибкой, а не голый 401
curl -s -X POST http://localhost:3000/login \
  -d "email=ivan@example.com&password=wrong" -w "\n%{http_code}\n"
# ...<p class="form-error">Неверный email или пароль</p>... / 401

# 8. Аутентифицированный, но не администратор -> служебная MVC-страница -> 403 (не редирект)
curl -s -b user-cookies.txt http://localhost:3000/trainers/add -w "\n%{http_code}\n"
# ...<h1>Ошибка 403</h1><p>Недостаточно прав для выполнения этого действия</p>... / 403

# 9. Swagger: у защищённых методов есть схема cookie-авторизации
curl -s http://localhost:3000/api/docs-json | \
  node -e "const d=JSON.parse(require('fs').readFileSync(0));\
    console.log(Object.keys(d.components.securitySchemes));\
    console.log(d.paths['/api/trainers'].post.security);"
# [ 'cookie' ]
# [ { cookie: [] } ]
```

Также проверено вручную в браузере (после `npm run start:dev`):
регистрация через `/register` сразу выполняет вход (cookie выставлена),
шапка сайта показывает "Вы вошли как …", пункт меню "Участники" появляется
только после входа под администратором, кнопки редактирования/удаления
скрыты для гостя и обычного пользователя на страницах тренеров/абонементов/
питания/отзывов, а переход на `/trainers/add` без входа переадресует на
`/login?redirect=%2Ftrainers%2Fadd`.

## Вывод

В ходе ЛР7 в приложение добавлен модуль аутентификации и авторизации,
построенный на связке механизмов NestJS, явно перечисленных в задании:
динамический модуль (`AuthModule.register(...)`, конфигурация — из
переменных окружения), Middleware для самой аутентификации (чтение и
проверка JWT из httpOnly-cookie — `CurrentUserMiddleware` — и отдельно
переадресация на форму входа — `RequireLoginMiddleware`, подключённая
точечно через Middleware Consumer), Guards для авторизации
(`JwtAuthGuard` + `RolesGuard`, оба глобальные, с обходом через
`@PublicAccess()`/`@Roles()`), схема безопасности в Swagger
(`addCookieAuth` + `@ApiCookieAuth()`) и настроенный CORS
(`credentials: true` + явный список origin). Введены две роли — `USER` и
`ADMIN` — на уже существующей сущности `User`; публичная регистрация
(`/register`) отделена от административной панели управления учётными
записями (`/users`, доступна только `ADMIN`), а самообслуживание
собственного профиля и пароля вынесено на отдельную страницу `/profile`.
Прежняя имитация сессии через query-параметр `?auth=` полностью заменена
реальным состоянием (`req.user`) во всех пяти поддоменах и во всех
шаблонах.
