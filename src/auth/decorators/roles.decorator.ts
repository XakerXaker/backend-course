import { SetMetadata } from "@nestjs/common";
import { Role } from "@prisma/client";

export const ROLES_KEY = "requiredRoles";

// Ограничивает эндпоинт одной или несколькими ролями — глобальный
// RolesGuard (src/auth/guards/roles.guard.ts) сверяет клеймы ролей сессии
// (UserRoleClaim, recipe UserRoles) со списком из этой метаданной. Эндпоинт
// без @Roles(...) доступен любому аутентифицированному пользователю
// (см. SessionAuthGuard).
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
