import { Prisma } from "@prisma/client";
import { MembershipType } from "./membership.type";

// Prisma-запись абонемента содержит служебное поле _count вместо плоского
// membersCount из GraphQL-схемы, а price приходит как Prisma.Decimal, а не
// number (GraphQLFloat.serialize() корректно приводит Decimal к числу сам).
// Общий маппер — чтобы и MembershipsResolver, и field resolver
// UsersResolver.membership приводили данные одинаково.
export interface MembershipWithCount extends Omit<MembershipType, "membersCount" | "price"> {
  price: Prisma.Decimal | number;
  _count?: { users: number };
}

export function toMembershipType(membership: MembershipWithCount): MembershipType {
  return { ...membership, membersCount: membership._count?.users ?? 0 } as MembershipType;
}
