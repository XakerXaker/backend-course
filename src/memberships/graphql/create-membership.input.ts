import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { IsArray, IsInt, IsNumber, IsString, Length, Min } from "class-validator";

@InputType()
export class CreateMembershipInput {
  @Field({ description: "Название абонемента" })
  @IsString()
  @Length(2, 80)
  name: string;

  @Field(() => Float, { description: "Цена, ₽" })
  @IsNumber()
  @Min(0)
  price: number;

  @Field(() => Int, { description: "Срок действия, месяцев" })
  @IsInt()
  @Min(1)
  duration: number;

  @Field(() => [String], { description: "Список преимуществ" })
  @IsArray()
  @IsString({ each: true })
  features: string[];
}
