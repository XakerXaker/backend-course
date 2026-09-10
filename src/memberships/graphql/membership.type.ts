import { Field, Float, ID, Int, ObjectType } from "@nestjs/graphql";

@ObjectType("Membership", { description: "Абонемент зала" })
export class MembershipType {
  @Field(() => ID, { description: "Идентификатор абонемента" })
  id: string;

  @Field({ description: "Название абонемента" })
  name: string;

  @Field(() => Float, { description: "Цена, ₽" })
  price: number;

  @Field(() => Int, { description: "Срок действия, месяцев" })
  duration: number;

  @Field(() => [String], { description: "Список преимуществ" })
  features: string[];

  @Field({ description: "Дата создания записи" })
  createdAt: Date;

  @Field({ description: "Дата последнего обновления записи" })
  updatedAt: Date;

  // Заполняется резолвером поля (см. MembershipsResolver.membersCount) —
  // считается на стороне БД через Prisma _count, а не подсчётом всего
  // массива users на стороне приложения.
  @Field(() => Int, { description: "Текущее количество держателей абонемента" })
  membersCount: number;
}
