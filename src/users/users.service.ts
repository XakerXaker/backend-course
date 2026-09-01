import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes, scryptSync } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    // include: membership — связь User -> Membership из ЛР2, показываем
    // название и цену текущего абонемента прямо в списке пользователей.
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { membership: true },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        membership: true,
        // связь User -> Review из ЛР2: показываем отзывы, оставленные
        // именно этим зарегистрированным пользователем.
        reviews: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    return user;
  }

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash: this.hashPassword(createUserDto.password),
        name: createUserDto.name,
        phone: createUserDto.phone,
        membershipId: createUserDto.membershipId ?? null,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(updateUserDto.email !== undefined && { email: updateUserDto.email }),
        ...(updateUserDto.password !== undefined && {
          passwordHash: this.hashPassword(updateUserDto.password),
        }),
        ...(updateUserDto.name !== undefined && { name: updateUserDto.name }),
        ...(updateUserDto.phone !== undefined && { phone: updateUserDto.phone }),
        ...(updateUserDto.membershipId !== undefined && {
          membershipId: updateUserDto.membershipId,
        }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.user.delete({ where: { id } });
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = scryptSync(password, salt, 64).toString("hex");

    return `${salt}:${derivedKey}`;
  }
}
