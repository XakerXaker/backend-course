# Лабораторная работа 4

## Тема

Разработка RESTful API и его спецификации.

## Цель работы

Разработать REST API для существующей модели данных приложения, обеспечить валидацию данных, централизованную обработку исключений, пагинацию, а также сформировать OpenAPI-спецификацию с помощью Swagger.

## Исходные данные

- Технологический стек: NestJS, Prisma, Handlebars.
- Предыдущая реализация: MVC-контроллеры и сервисы, работающие с сущностью Trainer.

## Что было реализовано

### 1. API-контроллер

- Создан отдельный контроллер для API-маршрутов: /api/trainers.
- Реализованы методы:
- GET /api/trainers
- GET /api/trainers/:id
- POST /api/trainers
- PATCH /api/trainers/:id
- DELETE /api/trainers/:id

Файл: src/trainers/trainers.api.controller.ts

### 2. Валидация входных данных

- Подключен глобальный ValidationPipe в main.ts.
- Добавлены правила валидации для DTO:
- CreateTrainerDto
- UpdateTrainerDto
- PaginationQueryDto
- Обеспечен возврат HTTP 400 при невалидных данных.

Файлы:

- src/main.ts
- src/trainers/dto/create-trainer.dto.ts
- src/trainers/dto/update-trainer.dto.ts
- src/trainers/dto/pagination-query.dto.ts

### 3. Обработка исключений

- Реализован глобальный фильтр исключений.
- Для API ошибки возвращаются в JSON-формате.
- Для MVC рендерится HTML-страница ошибки.

Файлы:

- src/common/filters/all-exceptions.filter.ts
- views/error.hbs

### 4. Пагинация и HATEOAS-элементы

- Реализована пагинация на уровне сервиса.
- В ответе коллекции возвращаются поля page, limit, total, totalPages.
- Добавлен HTTP-заголовок Link с rel="prev" и rel="next".

Файл: src/trainers/trainers.service.ts

### 5. OpenAPI/Swagger

- Подключен Swagger UI по адресу /api/docs.
- Добавлены декораторы Swagger в контроллер и DTO.
- Добавлены DTO-описания для структуры ответов и ошибок.

Файлы:

- src/main.ts
- src/trainers/dto/trainer-response.dto.ts
- src/trainers/dto/paginated-trainers-response.dto.ts
- src/common/dto/api-error-response.dto.ts

### 6. Разделение MVC и API

- API-методы вынесены из MVC-контроллера в отдельный API-контроллер.
- Логика многостраничного приложения сохранена.

Файлы:

- src/trainers/trainers.controller.ts
- src/trainers/trainers.module.ts

## Примеры запросов

Готовая JSON-коллекция для импорта в Postman/Insomnia:

- docs/lab4/PowerGitGym-LR4.postman_collection.json

Коллекция содержит:

- позитивные сценарии CRUD;
- сценарий 400 Bad Request (ошибка валидации);
- сценарий 404 Not Found.

## Инструкция по запуску

1. Установить зависимости:
   npm install
2. Запустить проект:
   npm run start:dev
3. Открыть Swagger UI:
   http://localhost:3000/api/docs

## Проверка результатов

- Проверить корректность CRUD-операций через Swagger или Postman.
- Убедиться, что:
- невалидные запросы возвращают 400;
- запрос несуществующей сущности возвращает 404;
- в ответе списка присутствует пагинация и заголовок Link.

## Вывод

В ходе выполнения ЛР-4 был разработан REST API для сущности Trainer, реализованы валидация и централизованная обработка ошибок, добавлена пагинация с навигационными ссылками, а также автоматически сформирована спецификация OpenAPI и подключен Swagger UI.

## Приложения

- Скриншот Swagger UI
- Скриншоты успешных запросов (200/201/204)
- Скриншоты ошибок (400/404)
