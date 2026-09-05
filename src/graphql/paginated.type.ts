import { Type } from "@nestjs/common";
import { Field, Int, ObjectType } from "@nestjs/graphql";

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Кэш уже созданных Paginated<T>-типов: без него повторный вызов
// Paginated(User) (например, из UsersResolver и из MembershipsResolver
// одновременно) породил бы два GraphQL-типа с одинаковым именем
// "PaginatedUser" и сборка схемы упала бы с ошибкой дубликата.
const cache = new Map<Function, Type<unknown>>();

// Фабрика типа "страница результатов" для любого ObjectType — аналог
// PaginatedXxxResponseDto из REST-версии (page/limit/total/totalPages),
// но один код на все сущности вместо копии на каждую.
export function Paginated<T>(classRef: Type<T>): Type<PaginatedResult<T>> {
  const cached = cache.get(classRef);
  if (cached) {
    return cached as Type<PaginatedResult<T>>;
  }

  @ObjectType(`Paginated${classRef.name}`)
  class PaginatedType {
    @Field(() => [classRef], { description: "Элементы текущей страницы" })
    items: T[];

    @Field(() => Int, { description: "Номер текущей страницы" })
    page: number;

    @Field(() => Int, { description: "Размер страницы" })
    limit: number;

    @Field(() => Int, { description: "Общее количество элементов" })
    total: number;

    @Field(() => Int, { description: "Общее количество страниц" })
    totalPages: number;
  }

  cache.set(classRef, PaginatedType);

  return PaginatedType;
}
