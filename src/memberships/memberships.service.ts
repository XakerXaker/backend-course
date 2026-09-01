import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
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
    return this.prisma.membership.create({ data: createMembershipDto });
  }

  async update(id: string, updateMembershipDto: UpdateMembershipDto) {
    await this.findOne(id);

    return this.prisma.membership.update({
      where: { id },
      data: updateMembershipDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // onDelete: SetNull на User.membershipId — удаление абонемента не
    // потянет за собой удаление пользователей, просто отвяжет их от него.
    return this.prisma.membership.delete({ where: { id } });
  }
}
