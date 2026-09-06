// Конфигурация, передаваемая в AuthModule.register(...) при регистрации
// динамического модуля в AppModule — значения вычитываются из переменных
// окружения один раз при старте приложения (см. src/app.module.ts),
// а не read'ятся напрямую внутри AuthService/гвардов.
export interface AuthModuleOptions {
  // Секрет для подписи/проверки JWT (переменная окружения JWT_SECRET).
  jwtSecret: string;
  // Срок жизни токена в формате, понятном jsonwebtoken (например, "1d").
  jwtExpiresIn: string;
  // Имя httpOnly-cookie, в которой хранится access-токен.
  cookieName: string;
  // Время жизни cookie в миллисекундах (совпадает по смыслу с jwtExpiresIn,
  // но Express Response.cookie() принимает maxAge только числом).
  cookieMaxAgeMs: number;
}

export const AUTH_MODULE_OPTIONS = "AUTH_MODULE_OPTIONS";
