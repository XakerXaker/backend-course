// Упрощённая, дружелюбная к шаблонам форма данных о текущем пользователе —
// то, что SessionInfoMiddleware кладёт в request.user на основе проверенной
// SuperTokens-сессии (см. src/auth/middleware/session-info.middleware.ts).
// Это НЕ полезная нагрузка токена SuperTokens (там своя структура,
// SessionContainer) — просто удобный плоский объект для контроллеров и hbs.
export interface AuthenticatedUser {
  id: string;
  email: string | null;
  name: string | null;
  isAdmin: boolean;
}
