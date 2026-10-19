import { Field, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsOptional, IsString, IsUrl, Length, Max, Min } from "class-validator";

@InputType()
export class CreateTrainerInput {
  @Field({ description: "Имя тренера" })
  @IsString()
  @Length(2, 120)
  name: string;

  @Field({ description: "Специализация" })
  @IsString()
  @Length(2, 120)
  specialization: string;

  @Field(() => Int, { description: "Опыт работы, лет" })
  @IsInt()
  @Min(0)
  @Max(80)
  experience: number;

  @Field({ nullable: true, description: "Ссылка на фотографию" })
  @IsOptional()
  @IsUrl({ require_tld: false })
  photoUrl?: string;

  @Field({ nullable: true, description: "Краткая биография" })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  bio?: string;
}
