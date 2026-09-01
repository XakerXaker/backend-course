import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SAFE_USER_SELECT } from "../users/users.service";
import { CreateMembershipDto } from "./dto/create-membership.dto";
import { UpdateMembershipDto } from "./dto/update-membership.dto";

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    // _count.users показывает, сколько пользователей сейчас держат этот
    // абонемент — то есть реальную связь Membership -> User из ЛР2, а не
    // просто описание в schema.prisma.
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

    // onDelete: SetNull на User.membershipId — удаление абонемента не
    // потянет за собой удаление пользователей, просто отвяжет их от него.
    return this.prisma.membership.delete({ where: { id } });
  }

  // Дочерняя коллекция: участники этого абонемента. Обращаемся к таблице
  // user напрямую через Prisma (а не через UsersService), чтобы не заводить
  // обратный импорт UsersModule -> MembershipsModule -> UsersModule.
  async findUsers(membershipId: string) {
    await this.findOne(membershipId);

    // select: SAFE_USER_SELECT — та же защита от утечки passwordHash,
    // что и в UsersService (см. комментарий там).
    return this.prisma.user.findMany({
      where: { membershipId },
      orderBy: { createdAt: "desc" },
      select: SAFE_USER_SELECT,
    });
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
