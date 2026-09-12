import type { PrismaClient, Role as PrismaRole } from "@prisma/client";
import { Role } from "@prisma/client";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import UserRoles, { UserRoleClaim } from "supertokens-node/recipe/userroles";
import type { TypeInput } from "supertokens-node/types";
import { SuperTokensModuleOptions } from "../interfaces/supertokens-module-options.interface";

// Приложение не использует multi-tenancy — "public" это зарезервированное
// имя дефолтного тенанта в SuperTokens (см. документацию про Multi-Tenancy),
// а не наша строка. Константа не экспортируется из публичного API пакета
// напрямую, поэтому используем то же литеральное значение, что и SDK.
const DEFAULT_TENANT_ID = "public";

// Собирает конфигурацию для supertokens.init(...) — вызывается один раз
// при регистрации AuthModule (см. auth.module.ts). Здесь же — единственное
// место интеграции SuperTokens с нашим доменом: после того как SDK создаёт
// пользователя/сессию у СЕБЯ (в БД провайдера), эти override'ы синхронно
// заводят/обновляют зеркальную запись в НАШЕЙ таблице User (Prisma) и
// назначают роль по умолчанию через recipe UserRoles.
//
// prisma передаётся явно (а не через Nest DI): supertokens.init() должен
// выполниться синхронно на этапе регистрации модуля, до того как поднимется
// контейнер зависимостей Nest, поэтому обычный @Inject(PrismaService) здесь
// недоступен — используется отдельный, специально для этого хука, экземпляр
// PrismaClient (см. auth.module.ts).
export function buildSuperTokensConfig(
  options: SuperTokensModuleOptions,
  prisma: PrismaClient,
): TypeInput {
  return {
    framework: "express",
    supertokens: {
      connectionURI: options.connectionURI,
      apiKey: options.apiKey,
    },
    appInfo: {
      appName: options.appName,
      apiDomain: options.apiDomain,
      websiteDomain: options.websiteDomain,
      // Маршруты аутентификации SDK генерирует сам: POST /auth/signup,
      // POST /auth/signin, POST /auth/signout, POST /auth/session/refresh
      // и т.д. — руками их не пишем (см. AuthController/AuthApiController).
      apiBasePath: "/auth",
      websiteBasePath: "/",
    },
    recipeList: [
      EmailPassword.init({
        // Поля формы регистрации сверх email/password — имя и телефон,
        // ровно то, что раньше собирала форма /register. Необязательные,
        // чтобы форма входа (использующая тот же recipe, но без этих полей)
        // не ломалась валидацией.
        signUpFeature: {
          formFields: [
            { id: "name", optional: true },
            { id: "phone", optional: true },
          ],
        },
        override: {
          // Уровень recipe-функций — срабатывает при ЛЮБОМ способе
          // регистрации: и через публичный POST /auth/signup, и когда
          // UsersService.create() (админ-панель, см. src/users/users.service.ts)
          // вызывает EmailPassword.signUp(...) напрямую, в обход HTTP.
          // Здесь заводим саму запись User и назначаем роль по умолчанию —
          // единое место для обоих сценариев, без дублирования.
          functions: (originalImplementation) => ({
            ...originalImplementation,
            signUp: async (input) => {
              const response = await originalImplementation.signUp(input);

              if (response.status === "OK") {
                await prisma.user.create({
                  data: {
                    id: response.user.id,
                    email: response.user.emails[0],
                    role: Role.USER,
                  },
                });

                await UserRoles.addRoleToUser(DEFAULT_TENANT_ID, response.user.id, Role.USER);
              }

              return response;
            },
          }),
          // Уровень API — срабатывает только для реального HTTP-запроса
          // POST /auth/signup (публичная самостоятельная регистрация), где
          // доступны формполя formFields (name/phone) — их recipe-функция
          // signUp выше не видит. К этому моменту запись User уже создана
          // override'ом functions.signUp; здесь только дозаполняем её и
          // сразу вписываем роль в токен только что созданной сессии.
          apis: (originalImplementation) => ({
            ...originalImplementation,
            signUpPOST: async (input) => {
              if (originalImplementation.signUpPOST === undefined) {
                throw new Error("signUpPOST недоступен — override emailpassword recipe");
              }

              const response = await originalImplementation.signUpPOST(input);

              if (response.status === "OK") {
                const nameField = input.formFields.find((field) => field.id === "name");
                const phoneField = input.formFields.find((field) => field.id === "phone");

                await prisma.user.update({
                  where: { id: response.user.id },
                  data: {
                    name:
                      typeof nameField?.value === "string" && nameField.value.length > 0
                        ? nameField.value
                        : undefined,
                    phone: typeof phoneField?.value === "string" ? phoneField.value : undefined,
                  },
                });

                // Роль уже назначена (override functions.signUp выше), но
                // клейм в токене текущей сессии мог быть посчитан раньше
                // (см. Session.init.override.functions.createNewSession) —
                // на всякий случай донабираем его явно.
                await response.session?.fetchAndSetClaim(UserRoleClaim);
              }

              return response;
            },
          }),
        },
      }),
      Session.init({
        // Проект — классический серверный сайт (Handlebars + обычный
        // fetch() в public/js/auth-forms.js), а не SPA с официальным
        // фронтенд-SDK SuperTokens (supertokens-web-js/auth-react). Эти SDK
        // сами добавляют заголовок "st-auth-mode: cookie" к каждому запросу;
        // без него (как у нас) SDK по умолчанию решает, что клиент ожидает
        // токен в заголовках ответа, а не в cookie (см. defaultGetTokenTransferMethod
        // в supertokens-node) — из-за этого сессия молча не сохранялась в
        // браузере ни после регистрации, ни после входа. Жёстко фиксируем
        // "cookie" как единственный способ передачи токена.
        getTokenTransferMethod: () => "cookie",
        override: {
          functions: (originalImplementation) => ({
            ...originalImplementation,
            // Единая точка для ЛЮБОЙ новой сессии (и после /auth/signup, и
            // после /auth/signin) — подмешиваем в payload access-токена
            // текущие email/name из нашей таблицы User, чтобы дальше их
            // можно было прочитать без похода в БД на каждый запрос
            // (см. SessionInfoMiddleware).
            createNewSession: async (input) => {
              const user = await prisma.user.findUnique({ where: { id: input.userId } });

              input.accessTokenPayload = {
                ...input.accessTokenPayload,
                email: user?.email ?? null,
                name: user?.name ?? null,
              };

              return originalImplementation.createNewSession(input);
            },
          }),
        },
      }),
      // UserRoles — второй "получатель прав" из задания ЛР7: как только
      // recipe подключен, роль пользователя (клейм UserRoleClaim) начинает
      // автоматически попадать в сессию и доступна через
      // session.getClaimValue(UserRoleClaim) в RolesGuard.
      UserRoles.init(),
    ],
  };
}

// Роли — фиксированный, известный на этапе разработки список (см.
// prisma Role enum), поэтому создаём их в SuperTokens один раз при старте,
// а не по требованию "первого использования".
export async function ensureRolesExist(): Promise<void> {
  const roles: PrismaRole[] = [Role.USER, Role.ADMIN];

  for (const role of roles) {
    await UserRoles.createNewRoleOrAddPermissions(role, []);
  }
}
