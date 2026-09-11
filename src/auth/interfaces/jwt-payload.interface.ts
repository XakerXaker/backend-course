import { Role } from "@prisma/client";

// Полезная нагрузка JWT, выпускаемого AuthService.issueToken(). "sub" —
// стандартное имя claim'а с идентификатором субъекта (userId), см. RFC 7519.
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  name: string | null;
}

// То, что CurrentUserMiddleware кладёт в req.user после успешной проверки
// токена — по форме совпадает с JwtPayload, отдельный тип нужен только для
// читаемости в местах, где ожидается "текущий пользователь", а не "токен".
export type AuthenticatedUser = JwtPayload;
