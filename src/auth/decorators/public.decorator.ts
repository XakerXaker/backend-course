import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublicAccess";

// Помечает MVC/REST-эндпоинт как доступный без аутентификации — глобальный
// SessionAuthGuard (src/auth/guards/session-auth.guard.ts) читает эту
// метаданную через Reflector и пропускает запрос, не требуя req.session.
export const PublicAccess = () => SetMetadata(IS_PUBLIC_KEY, true);
