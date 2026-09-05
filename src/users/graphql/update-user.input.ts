import { InputType, OmitType, PartialType } from "@nestjs/graphql";
import { CreateUserInput } from "./create-user.input";

// password и membershipId намеренно исключены: смена пароля и
// оформление/отмена абонемента — отдельные доменные мутации
// (changeUserPassword, assignMembership, cancelMembership), а не поля
// общего "обновить профиль".
@InputType()
export class UpdateUserInput extends PartialType(
  OmitType(CreateUserInput, ["password", "membershipId"] as const),
) {}
