import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@prisma/client";
import supertokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const DEFAULT_TENANT_ID = "public";

export const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  membershipId: true,
  membership: {
    select: { id: true, name: true, price: true, duration: true, features: true },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
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
        reviews: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    return user;
  }

  async create(createUserDto: CreateUserDto) {
    const result = await EmailPassword.signUp(
      DEFAULT_TENANT_ID,
      createUserDto.email,
      createUserDto.password,
    );

    if (result.status === "EMAIL_ALREADY_EXISTS_ERROR") {
      throw new ConflictException("Участник с таким email уже зарегистрирован");
    }

    return this.prisma.user.update({
      where: { id: result.user.id },
      data: {
        name: createUserDto.name,
        phone: createUserDto.phone,
        membershipId: createUserDto.membershipId ?? null,
      },
      select: SAFE_USER_SELECT,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    if (updateUserDto.email !== undefined || updateUserDto.password !== undefined) {
      const recipeUserId = supertokens.convertToRecipeUserId(id);
      const result = await EmailPassword.updateEmailOrPassword({
        recipeUserId,
        email: updateUserDto.email,
        password: updateUserDto.password,
      });

      if (result.status === "EMAIL_ALREADY_EXISTS_ERROR") {
        throw new ConflictException("Участник с таким email уже зарегистрирован");
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(updateUserDto.email !== undefined && { email: updateUserDto.email }),
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

    await supertokens.deleteUser(id);

    return this.prisma.user.delete({
      where: { id },
      select: SAFE_USER_SELECT,
    });
  }

  async findReviews(userId: string) {
    await this.findOne(userId);

    return this.prisma.review.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findReviewsPaginated(userId: string, page: number, limit: number) {
    await this.findOne(userId);

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { authorId: userId },
        skip,
        take: safeLimit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where: { authorId: userId } }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return { items, page: safePage, limit: safeLimit, total, totalPages };
  }

  async verifyCurrentPassword(email: string, password: string): Promise<boolean> {
    const result = await EmailPassword.verifyCredentials(DEFAULT_TENANT_ID, email, password);

    return result.status === "OK";
  }

  async changeRole(id: string, role: Role) {
    await this.findOne(id);

    const previousRole = role === Role.ADMIN ? Role.USER : Role.ADMIN;

    await UserRoles.removeUserRole(DEFAULT_TENANT_ID, id, previousRole);
    await UserRoles.addRoleToUser(DEFAULT_TENANT_ID, id, role);

    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: SAFE_USER_SELECT,
    });
  }

  async changePassword(id: string, newPassword: string) {
    await this.findOne(id);

    await EmailPassword.updateEmailOrPassword({
      recipeUserId: supertokens.convertToRecipeUserId(id),
      password: newPassword,
    });

    return this.prisma.user.update({
      where: { id },
      data: {},
      select: SAFE_USER_SELECT,
    });
  }

  async assignMembership(userId: string, membershipId: string) {
    await this.findOne(userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: { membershipId },
      select: SAFE_USER_SELECT,
    });
  }

  async cancelMembership(userId: string) {
    await this.findOne(userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: { membershipId: null },
      select: SAFE_USER_SELECT,
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
}
