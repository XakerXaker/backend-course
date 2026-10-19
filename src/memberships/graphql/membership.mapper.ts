import { Prisma } from "@prisma/client";
import { MembershipType } from "./membership.type";

export interface MembershipWithCount extends Omit<MembershipType, "membersCount" | "price"> {
  price: Prisma.Decimal | number;
  _count?: { users: number };
}

export function toMembershipType(membership: MembershipWithCount): MembershipType {
  return { ...membership, membersCount: membership._count?.users ?? 0 } as MembershipType;
}
