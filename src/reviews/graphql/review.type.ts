import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { UserType } from "../../users/graphql/user.type";

@ObjectType("Review", { description: "Отзыв о зале" })
export class ReviewType {
  @Field(() => ID, { description: "Идентификатор отзыва" })
  id: string;

  @Field({ description: "Имя автора на момент публикации отзыва" })
  authorName: string;

  @Field({ description: "Текст отзыва" })
  text: string;

  @Field(() => Int, { description: "Оценка от 1 до 5" })
  rating: number;

  @Field({ description: "Дата публикации" })
  createdAt: Date;

  @Field(() => ID, {
    nullable: true,
    description: "Идентификатор зарегистрированного автора, если отзыв не гостевой",
  })
  authorId?: string | null;

  // Заполняется field resolver'ом (см. ReviewsResolver.author) — отдельным
  // запросом через UsersService, а не хранится тут как предзагруженное поле.
  @Field(() => UserType, {
    nullable: true,
    description: "Зарегистрированный автор отзыва, если отзыв не гостевой",
  })
  author?: UserType | null;
}
