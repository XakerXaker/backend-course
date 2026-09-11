import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublicAccess";

// Помечает MVC/REST-эндпоинт как доступный без аутентификации — глобальный
// JwtAuthGuard (src/auth/guards/jwt-auth.guard.ts) читает эту метаданную
// через Reflector и пропускает запрос, не требуя req.user.
export const PublicAccess = () => SetMetadata(IS_PUBLIC_KEY, true);
