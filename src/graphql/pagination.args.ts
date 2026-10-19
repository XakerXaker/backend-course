import { ArgsType, Field, Int } from "@nestjs/graphql";
import { Max, Min } from "class-validator";

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: 1, description: "Номер страницы, начиная с 1" })
  @Min(1)
  page: number = 1;

  @Field(() => Int, {
    defaultValue: 10,
    description: "Размер страницы (от 1 до 50)",
  })
  @Min(1)
  @Max(50)
  limit: number = 10;
}
