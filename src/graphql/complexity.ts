import { ComplexityEstimatorArgs } from "graphql-query-complexity";

// Максимально допустимая сложность одного GraphQL-запроса (см. подключение
// плагина в GraphQLModule в app.module.ts). Ограничивает как "вширь"
// (список большого limit), так и "вглубь" (вложенные постраничные поля,
// напр. memberships { users { ... } }), защищая от слишком дорогих запросов.
export const MAX_QUERY_COMPLEXITY = 1000;

// Стоимость постраничного поля/запроса — пропорциональна размеру страницы
// (limit) и сложности вложенных полей: 10 записей с простыми полями дешевле,
// чем 10 записей, у каждой из которых ещё запрашивается вложенная страница.
export function paginatedComplexity({ args, childComplexity }: ComplexityEstimatorArgs): number {
  const limit = typeof args.limit === "number" ? args.limit : 10;

  return limit * Math.max(1, childComplexity);
}
