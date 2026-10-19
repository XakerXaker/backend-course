import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SAFE_USER_SELECT } from "../users/users.service";
import { CreateMembershipDto } from "./dto/create-membership.dto";
import { UpdateMembershipDto } from "./dto/update-membership.dto";

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.membership.findMany({
      orderBy: { price: "asc" },
      include: { _count: { select: { users: true } } },
    });
  }

  async findAllPaginated(page: number, limit: number) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.membership.findMany({
        skip,
        take: safeLimit,
        orderBy: { price: "asc" },
        include: { _count: { select: { users: true } } },
      }),
      this.prisma.membership.count(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return { items, page: safePage, limit: safeLimit, total, totalPages };
  }

  async findOne(id: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!membership) {
      throw new NotFoundException("Абонемент не найден");
    }

    return membership;
  }

  create(createMembershipDto: CreateMembershipDto) {
    return this.prisma.membership.create({
      data: createMembershipDto,
      include: { _count: { select: { users: true } } },
    });
  }

  async update(id: string, updateMembershipDto: UpdateMembershipDto) {
    await this.findOne(id);

    return this.prisma.membership.update({
      where: { id },
      data: updateMembershipDto,
      include: { _count: { select: { users: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.membership.delete({ where: { id } });
  }

  async findUsers(membershipId: string) {
    await this.findOne(membershipId);

    return this.prisma.user.findMany({
      where: { membershipId },
      orderBy: { createdAt: "desc" },
      select: SAFE_USER_SELECT,
    });
  }

  async findUsersPaginated(membershipId: string, page: number, limit: number) {
    await this.findOne(membershipId);

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { membershipId },
        skip,
        take: safeLimit,
        orderBy: { createdAt: "desc" },
        select: SAFE_USER_SELECT,
      }),
      this.prisma.user.count({ where: { membershipId } }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return { items, page: safePage, limit: safeLimit, total, totalPages };
  }

  async findUser(membershipId: string, userId: string) {
    await this.findOne(membershipId);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, membershipId },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(
        "Участник с таким идентификатором не найден на этом абонементе",
      );
    }

    return user;
  }
}
