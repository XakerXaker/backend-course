import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@prisma/client";
import supertokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

// Приложение не использует multi-tenancy — "public" это зарезервированное
// имя дефолтного тенанта в SuperTokens, а не наша строка (см. комментарий
// в src/auth/config/supertokens.config.ts).
const DEFAULT_TENANT_ID = "public";

// Явный select без полей учётных данных (их у нас в базе больше нет —
// пароль и его проверка целиком переданы SuperTokens, ЛР7) — экспортируется,
// чтобы MembershipsService мог применить тот же select к дочерней
// коллекции участников абонемента (см. findUsers/findUser).
export const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
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

  // Регистрация участника администратором (панель /users, /api/users).
  // Пароль и учётные данные заводятся в SuperTokens тем же способом, что и
  // при публичной самостоятельной регистрации (POST /auth/signup) — единая
  // точка правды: EmailPassword.signUp(...). Override
  // recipe-функции signUp (см. src/auth/config/supertokens.config.ts) уже
  // создаёт минимальную запись User (id/email/role=USER) — здесь остаётся
  // только дозаполнить поля, специфичные для этой формы.
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

    // Email/пароль — учётные данные, ими распоряжается SuperTokens; меняем
    // ИХ первыми и только при успехе трогаем нашу (зеркальную) запись —
    // иначе два хранилища могут разойтись (например, email обновился у нас,
    // но не прошёл валидацию уникальности у провайдера).
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

    // Сначала — учётная запись и все активные сессии у провайдера, потом —
    // наша зеркальная запись; в обратном порядке можно было бы остаться с
    // "осиротевшим" логином без профиля в случае сбоя между операциями.
    await supertokens.deleteUser(id);

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

  // Постраничная версия findReviews — используется field resolver'ом
  // User.reviews в GraphQL-схеме.
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

  // Проверка ТЕКУЩЕГО пароля — используется ProfileController перед сменой
  // собственного пароля (в отличие от changePassword ниже, которым
  // администратор меняет пароль ЛЮБОГО участника без его подтверждения).
  async verifyCurrentPassword(email: string, password: string): Promise<boolean> {
    const result = await EmailPassword.verifyCredentials(DEFAULT_TENANT_ID, email, password);

    return result.status === "OK";
  }

  // Смена роли — отдельная доменная операция (см. changePassword ниже):
  // выдаётся только администратором через UsersController/UsersApiController.
  // Роль в системе одна из двух одновременно, поэтому явно снимаем
  // противоположную — recipe UserRoles допускает у пользователя сразу
  // несколько ролей, а наш домен этого не предполагает.
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

  // Смена пароля АДМИНИСТРАТОРОМ — без проверки текущего пароля (аналог
  // "publish"/"hide" из задания ЛР5 для полей-переходов состояния), а не
  // значение среди прочих в общем UpdateUserDto.
  async changePassword(id: string, newPassword: string) {
    await this.findOne(id);

    await EmailPassword.updateEmailOrPassword({
      recipeUserId: supertokens.convertToRecipeUserId(id),
      password: newPassword,
    });

    // Пароль хранится у провайдера, а не в нашей таблице — в Prisma здесь
    // менять нечего, но метод, как и остальные в этом сервисе, возвращает
    // актуальный безопасный профиль участника.
    return this.prisma.user.update({
      where: { id },
      data: {},
      select: SAFE_USER_SELECT,
    });
  }

  // Оформление и отмена абонемента — тоже два отдельных доменных действия
  // вместо общего "изменить membershipId" в UpdateUserInput.
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
