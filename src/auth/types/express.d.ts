import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";

// Расширяем Express.Request полем "user" — SessionInfoMiddleware
// (src/auth/middleware/session-info.middleware.ts) кладёт сюда упрощённые
// данные о пользователе после успешной проверки SuperTokens-сессии.
// Поле "session" (сам SessionContainer от SuperTokens) отдельно объявлять
// не нужно — SDK уже поставляет для него тип SessionRequest
// (supertokens-node/framework/express), которым мы и типизируем request
// там, где нужен доступ к сессии напрямую (guards, middleware).
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
