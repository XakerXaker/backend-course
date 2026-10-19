import { Field, ID, InputType } from "@nestjs/graphql";
import { IsEmail, IsOptional, IsString, IsUUID, Length } from "class-validator";

@InputType()
export class CreateUserInput {
  @Field({ description: "Email участника" })
  @IsEmail()
  email: string;

  @Field({ description: "Пароль (хранится только в виде хеша)" })
  @IsString()
  @Length(6, 100)
  password: string;

  @Field({ nullable: true, description: "Имя участника" })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @Field({ nullable: true, description: "Телефон" })
  @IsOptional()
  @IsString()
  @Length(0, 30)
  phone?: string;

  @Field(() => ID, {
    nullable: true,
    description: "Идентификатор абонемента (Membership.id), если оформляется сразу",
  })
  @IsOptional()
  @IsUUID()
  membershipId?: string;
}
