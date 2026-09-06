import { AuthenticatedUser } from "../interfaces/jwt-payload.interface";

// Расширяем Express.Request полем "user" — CurrentUserMiddleware
// (src/auth/middleware/current-user.middleware.ts) кладёт сюда полезную
// нагрузку JWT после успешной проверки токена из cookie/заголовка.
// По аналогии с расширением Express.Multer.File из @types/multer (ЛР6).
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
