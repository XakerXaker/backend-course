import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes, scryptSync } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

// Явный select без passwordHash — хеш пароля не должен покидать сервис ни
// через MVC, ни (что особенно важно) через JSON REST API. Экспортируется,
// чтобы MembershipsService мог применить тот же select к дочерней
// коллекции участников абонемента (см. findUsers/findUser).
export const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
  membershipId: true,
  // Поля ограничены тем же набором, что описан в MembershipSummaryDto.
  membership: {
    select: { id: true, name: true, price: true, duration: true, features: true },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    // membership в select — связь User -> Membership из ЛР2, показываем
    // название и цену текущего абонемента прямо в списке пользователей.
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: SAFE_USER_SELECT,
    });
  }

  async findAllPaginated(page: number, limit: number) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: safeLimit,
        orderBy: { createdAt: "desc" },
        select: SAFE_USER_SELECT,
      }),
      this.prisma.user.count(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return { items, page: safePage, limit: safeLimit, total, totalPages };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...SAFE_USER_SELECT,
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
      select: SAFE_USER_SELECT,
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
      select: SAFE_USER_SELECT,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.user.delete({
      where: { id },
      select: SAFE_USER_SELECT,
    });
  }

  // Дочерняя коллекция: отзывы, оставленные этим участником. Обращаемся к
  // таблице review напрямую через Prisma (а не через ReviewsService), чтобы
  // не заводить обратный импорт ReviewsModule -> UsersModule -> ReviewsModule.
  async findReviews(userId: string) {
    await this.findOne(userId);

    return this.prisma.review.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findReview(userId: string, reviewId: string) {
    await this.findOne(userId);

    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, authorId: userId },
    });

    if (!review) {
      throw new NotFoundException(
        "Отзыв с таким идентификатором не найден у этого участника",
      );
    }

    return review;
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = scryptSync(password, salt, 64).toString("hex");

    return `${salt}:${derivedKey}`;
  }
}
