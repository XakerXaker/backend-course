import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

@ObjectType("Trainer", { description: "Тренер зала" })
export class TrainerType {
  @Field(() => ID, { description: "Идентификатор тренера" })
  id: string;

  @Field({ description: "Имя тренера" })
  name: string;

  @Field({ description: "Специализация" })
  specialization: string;

  @Field(() => Int, { description: "Опыт работы, лет" })
  experience: number;

  @Field({ nullable: true, description: "Ссылка на фотографию" })
  photoUrl?: string | null;

  @Field({ nullable: true, description: "Краткая биография" })
  bio?: string | null;

  @Field({ description: "Дата создания записи" })
  createdAt: Date;

  @Field({ description: "Дата последнего обновления записи" })
  updatedAt: Date;
}
