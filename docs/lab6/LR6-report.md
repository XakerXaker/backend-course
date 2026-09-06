# Лабораторная работа 6

## Тема

Применение возможностей NestJS для разработки BFF: перехватчики (interceptors),
кэширование ответов, загрузка файлов в объектное хранилище.

## Цель работы

Изучить и применить механизмы NestJS для работы с запросами, которые не
рассматривались в предыдущих лабораторных: измерение времени обработки
запроса через RxJS-перехватчик, кэширование ответов RESTful API на клиенте
(ETag + Cache-Control) и на сервере (in-memory `CacheModule`), загрузка
файлов в S3-совместимое объектное хранилище.

## Исходные данные

- Технологический стек: NestJS, Prisma, PostgreSQL, GraphQL (Apollo Server).
- Предыдущая реализация (ЛР1-5): пять поддоменов — Trainer, Membership,
  Product, User, Review — с сервисами, MVC- и REST-контроллерами и
  GraphQL-резолверами.
- Единственная сущность домена с файловым полем — `Trainer.photoUrl`,
  ранее заполнявшаяся вручную (ссылка на внешнее изображение).

## Что было реализовано

### 1. Измерение времени обработки запроса

- `TimingInterceptor` (`src/common/interceptors/timing.interceptor.ts`) —
  перехватчик, написанный в реактивном стиле: время фиксируется до
  `next.handle()`, а расчёт и логирование выполняются в операторе RxJS
  `tap()` над потоком ответа, без `async/await`. Подключён глобально в
  `src/main.ts` (`app.useGlobalInterceptors`).
- Клиенту время возвращается по-разному в зависимости от типа запроса
  (определяется через `Reflector` и метаданные `@Render()`,
  `RENDER_METADATA` из `@nestjs/common/constants`, и через
  `context.getType()`):
  - **Страница** (MVC-маршрут с `@Render(...)`) — перехватчик мутирует
    объект модели представления, добавляя `elapsedTimeMs`, — тот же
    объект, который Nest передаёт в шаблонизатор после отработки всех
    перехватчиков. `views/partials/footer.hbs` кладёт это значение в
    `data-server-elapsed-time`, а `public/js/main.js` (там уже была
    клиентская метрика `performance.now()` из прошлых лабораторных)
    добавляет его в ту же строку — время сервера и время браузера видны
    рядом: «Время загрузки страницы: 42 мс (обработка на сервере: 6 мс)».
  - **RESTful API / GraphQL** — время уходит в заголовок ответа
    `X-Elapsed-Time`. Для REST это `response.setHeader(...)` на объекте
    `Response` из `context.switchToHttp()`. Для GraphQL —
    `GqlExecutionContext.create(context).getContext().res` (тот же
    объект ответа Express).
- Побочная находка: по умолчанию `@nestjs/apollo`/`@as-integrations/express5`
  кладёт в контекст резолверов только `{ req }`, без `res` — заголовок было
  некуда ставить. Исправлено явной фабрикой контекста в `GraphQLModule`
  (`src/app.module.ts`): `context: ({ req, res }) => ({ req, res })`.

Файлы: `src/common/interceptors/timing.interceptor.ts`, `src/main.ts`,
`src/app.module.ts`, `views/partials/footer.hbs`, `public/js/main.js`.

### 2. Кэширование на клиенте: ETag + Cache-Control

- `EtagInterceptor` (`src/common/interceptors/etag.interceptor.ts`) —
  считает SHA-1 от `JSON.stringify(data)` и выставляет заголовок `ETag`
  для GET-запросов REST API (MVC-страницы и GraphQL пропускаются той же
  проверкой метаданных `@Render()`, что и в `TimingInterceptor`).
  Дальше условный `GET` полностью берёт на себя сам Express: его
  `res.json()`/`res.send()` внутри использует пакет `fresh` и сам
  подменяет ответ на `304 Not Modified` без тела, если `If-None-Match`
  запроса совпал с только что выставленным `ETag`, — перехватчику не
  нужно вручную обрывать поток и трогать код статуса.
- `Cache-Control: private, max-age=60, must-revalidate` — декоратором
  `@Header(...)` на все "читающие" эндпоинты (`findAll`/`findOne`, а где
  есть — вложенные `GET :id/users` и т.п.) всех пяти
  `*.api.controller.ts`. Комбинация работает так: в течение 60 секунд
  браузер вообще не обращается к серверу; после истечения `max-age`
  присылает условный `GET` с `If-None-Match` и, если ресурс не менялся,
  получает пустой `304` вместо полного тела ответа.
- Порядок подключения перехватчиков в `main.ts` важен:
  `TimingInterceptor` — глобально самым внешним, `EtagInterceptor` — сразу
  за ним, чтобы измеренное время включало и работу с ETag, и (для
  тренеров) попадание в серверный кэш из следующего пункта.

Файлы: `src/common/interceptors/etag.interceptor.ts`, `src/main.ts`,
`src/*/*.api.controller.ts`.

### 3. Кэширование на сервере: in-memory `CacheModule`

- Подключён стандартный `@nestjs/cache-manager` (in-memory стор по
  умолчанию, без дополнительной настройки). Включён **только** для
  тренеров (`src/trainers/trainers.module.ts`,
  `CacheModule.register({ ttl: 5000 })`) — это самая часто читаемая
  сущность приложения: список тренеров используется на главной странице,
  на странице контактов и в собственном разделе `/trainers` (плюс
  единственная сущность с SSE-оповещениями из ЛР3).
- `GET /api/trainers` и `GET /api/trainers/:id`
  (`src/trainers/trainers.api.controller.ts`) обёрнуты в
  `@UseInterceptors(CacheInterceptor)` с `@CacheTTL(5000)` (5 секунд).
  TTL выбран коротким намеренно — как и предлагается в задании, чтобы не
  заниматься ручной инвалидацией кэша при создании/редактировании
  тренера, а просто подождать несколько секунд.
- Проверено вручную (без утилиты `hey`, но эквивалентным способом —
  повторные запросы `curl` сразу после создания тренера):
  1. `POST /api/trainers` создаёт нового тренера.
  2. Немедленный `GET /api/trainers` в течение ~5 секунд возвращает
     старый список без нового тренера и `X-Elapsed-Time: 0` (кэш-хит,
     обработчик и Prisma не вызывались).
  3. `GET /api/trainers` после истечения TTL уже видит новый список — не
     потребовалось вообще никакой ручной инвалидации.

Файлы: `src/trainers/trainers.module.ts`,
`src/trainers/trainers.api.controller.ts`.

### 4. Загрузка файлов в объектное хранилище (Yandex Object Storage)

- Инфраструктурный модуль `StorageModule`/`StorageService`
  (`src/storage`) — по аналогии с `PrismaModule`/`PrismaService`
  (`src/prisma`) из ЛР2: `@Global()`-модуль, единственная точка
  зависимости от AWS SDK (`@aws-sdk/client-s3`) в приложении, метод
  `uploadFile({ buffer, originalName, contentType, folder })` возвращает
  публичный URL загруженного объекта. Настройки — переменные окружения
  `S3_ENDPOINT`/`S3_REGION`/`S3_BUCKET`/`S3_ACCESS_KEY_ID`/
  `S3_SECRET_ACCESS_KEY`/`S3_PUBLIC_URL_BASE` (см. `.env.example`),
  клиент настроен на эндпоинт Yandex Object Storage
  (`https://storage.yandexcloud.net`) по умолчанию.
- Единственное поле с файлом в домене — `Trainer.photoUrl` — теперь
  реально загружается в хранилище вместо ручного ввода ссылки:
  - **MVC-форма** добавления/редактирования тренера
    (`views/trainers/form.hbs`) — текстовое поле "URL фотографии"
    заменено на `<input type="file" name="photo">`, форма отправляется
    как `multipart/form-data`. `TrainersController.create`/
    `updateFromForm` (`src/trainers/trainers.controller.ts`) принимают
    файл через `FileInterceptor('photo')` и `@UploadedFile()`,
    загружают его в хранилище и подставляют результат в
    `createTrainerDto.photoUrl`/`updateTrainerDto.photoUrl` перед
    вызовом сервиса; при редактировании без нового файла поле остаётся
    `undefined`, и `TrainersService.update()` не трогает текущее фото.
  - **REST API** — отдельный эндпоинт `POST /api/trainers/:id/photo`
    (`TrainersApiController.uploadPhoto`), тоже `multipart/form-data`
    с полем `photo`; задокументирован в Swagger (`@ApiConsumes`).
  - **Валидация файла** — по разделу документации NestJS про загрузку
    файлов: `ParseFilePipeBuilder().addFileTypeValidator({ fileType:
    /^image\/(jpeg|png|webp|gif)$/ }).addMaxSizeValidator({ maxSize: 5 *
    1024 * 1024 })`. На MVC-форме файл необязателен
    (`fileIsRequired: false`), на выделенном REST-эндпоинте — обязателен.
- Побочная правка тестового окружения: `tsconfig.json` ограничивал
  автоматическое подключение глобальных `@types/*` только пакетом `node`
  (`"types": ["node"]`), из-за чего глобальное расширение типов
  `Express.Multer.File` из `@types/multer` не подключалось к проекту, —
  добавлено `"multer"` в тот же массив.

Файлы: `src/storage/storage.service.ts`, `src/storage/storage.module.ts`,
`src/trainers/trainers.api.controller.ts`,
`src/trainers/trainers.controller.ts`, `views/trainers/form.hbs`,
`.env.example`, `tsconfig.json`.

## Проверка результатов

Ручная проверка через `curl` (аналогично ЛР4/ЛР5), с локальным PostgreSQL:

```bash
# Время обработки — страница
curl -s http://localhost:3000/ | grep data-server-elapsed-time

# Время обработки — REST API
curl -sD - -o /dev/null http://localhost:3000/api/trainers | grep -i x-elapsed-time
# X-Elapsed-Time: 10

# Время обработки — GraphQL
curl -sD - -o /dev/null http://localhost:3000/graphql \
  -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ trainers(limit:5){ items { id name } } }"}' | grep -i x-elapsed-time
# X-Elapsed-Time: 13

# ETag + условный GET -> 304
ETAG=$(curl -sD - -o /dev/null http://localhost:3000/api/trainers | grep -i '^ETag' | cut -d' ' -f2)
curl -s -o /dev/null -w "%{http_code}\n" -H "If-None-Match: $ETAG" http://localhost:3000/api/trainers
# 304

# Серверный кэш тренеров: создание не видно ~5 секунд
curl -s -X POST http://localhost:3000/api/trainers -H "Content-Type: application/json" \
  -d '{"name":"Тест","specialization":"Тест","experience":1}'
curl -s http://localhost:3000/api/trainers   # ещё старый список (кэш-хит)
sleep 6
curl -s http://localhost:3000/api/trainers   # уже виден новый тренер
```

Загрузка фото (`POST /api/trainers/:id/photo`, `multipart/form-data`)
проверена на уровне цепочки вызовов: DTO/файл проходят валидацию,
`StorageService` формирует ключ объекта и вызывает
`PutObjectCommand` — реальная отдача в бакет Yandex Object Storage
проверяется только при наличии настоящих `S3_*` учётных данных в `.env`,
которых в среде разработки нет; без них эндпоинт корректно возвращает
ошибку обращения к хранилищу, не роняя остальное приложение.

## Вывод

В ходе выполнения ЛР-6 в BFF-слой приложения добавлены три независимых
механизма NestJS, ранее не использованных в проекте. Измерение времени
обработки запроса реализовано единым реактивным перехватчиком, который
одинаково работает и для серверного рендеринга страниц (время
встраивается в модель представления рядом с клиентским), и для
REST/GraphQL API (время — в заголовке ответа), попутно обнажив нюанс
конфигурации `@nestjs/apollo` (контекст резолверов по умолчанию не
содержит объект ответа). Кэширование ответов реализовано на обоих
уровнях: ETag с `Cache-Control` — универсально для всего REST API через
ещё один перехватчик, а серверный in-memory `CacheModule` — точечно для
тренеров как самой часто запрашиваемой сущности, с коротким TTL вместо
ручной инвалидации. Загрузка файлов оформлена отдельным инфраструктурным
модулем по образцу `PrismaService` из ЛР2 и заменила собой ручной ввод
ссылки на фото тренера — как в MVC-форме, так и отдельным REST-эндпоинтом.
