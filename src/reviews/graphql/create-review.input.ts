import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

@InputType()
export class CreateReviewInput {
  @Field({ description: "Имя автора отзыва (фиксируется на момент публикации)" })
  @IsString()
  @Length(2, 120)
  authorName: string;

  @Field({ description: "Текст отзыва" })
  @IsString()
  @Length(5, 1000)
  text: string;

  @Field(() => Int, { nullable: true, defaultValue: 5, description: "Оценка от 1 до 5" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @Field(() => ID, {
    nullable: true,
    description: "Идентификатор зарегистрированного автора (User.id). Не указан — гостевой отзыв.",
  })
  @IsOptional()
  @IsUUID()
  authorId?: string;
}
