// Конфигурация, передаваемая в AuthModule.forRoot(...) при регистрации
// динамического модуля в AppModule — значения вычитываются из переменных
// окружения один раз при старте приложения (см. src/app.module.ts), а не
// читаются напрямую внутри src/auth/config/supertokens.config.ts.
export interface SuperTokensModuleOptions {
  // Connection URI и API-ключ поставщика — SuperTokens Managed Service
  // (https://supertokens.com, раздел Development/Production вашего проекта)
  // либо self-hosted Core, поднятый самостоятельно.
  connectionURI: string;
  apiKey?: string;
  // Название приложения, показывается в служебных email от SuperTokens.
  appName: string;
  // Домен, на котором крутится САМ backend (используется для маршрутов
  // /auth/*, которые генерирует SDK) и домен фронтенда — для этого
  // сервера они совпадают, т.к. Handlebars-страницы отдаёт тот же сервер.
  apiDomain: string;
  websiteDomain: string;
}
