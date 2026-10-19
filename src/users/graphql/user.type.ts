import { Field, ID, ObjectType } from "@nestjs/graphql";
import { MembershipType } from "../../memberships/graphql/membership.type";

@ObjectType("User", { description: "Зарегистрированный участник зала" })
export class UserType {
  @Field(() => ID, { description: "Идентификатор участника" })
  id: string;

  @Field({ description: "Email участника" })
  email: string;

  @Field({ nullable: true, description: "Имя участника" })
  name?: string | null;

  @Field({ nullable: true, description: "Телефон" })
  phone?: string | null;

  @Field({ description: "Дата регистрации" })
  createdAt: Date;

  @Field({ description: "Дата последнего обновления записи" })
  updatedAt: Date;

  @Field(() => ID, { nullable: true, description: "Идентификатор текущего абонемента" })
  membershipId?: string | null;

  @Field(() => MembershipType, {
    nullable: true,
    description: "Текущий абонемент участника, если оформлен",
  })
  membership?: MembershipType | null;
}
