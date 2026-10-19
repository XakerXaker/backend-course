import type { PrismaClient, Role as PrismaRole } from "@prisma/client";
import { Role } from "@prisma/client";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import UserRoles, { UserRoleClaim } from "supertokens-node/recipe/userroles";
import type { TypeInput } from "supertokens-node/types";
import { SuperTokensModuleOptions } from "../interfaces/supertokens-module-options.interface";

const DEFAULT_TENANT_ID = "public";

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
      apiBasePath: "/auth",
      websiteBasePath: "/",
    },
    recipeList: [
      EmailPassword.init({
        signUpFeature: {
          formFields: [
            { id: "name", optional: true },
            { id: "phone", optional: true },
          ],
        },
        override: {
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

                await response.session?.fetchAndSetClaim(UserRoleClaim);
              }

              return response;
            },
          }),
        },
      }),
      Session.init({
        override: {
          functions: (originalImplementation) => ({
            ...originalImplementation,
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
      UserRoles.init(),
    ],
  };
}

export async function ensureRolesExist(): Promise<void> {
  const roles: PrismaRole[] = [Role.USER, Role.ADMIN];

  for (const role of roles) {
    await UserRoles.createNewRoleOrAddPermissions(role, []);
  }
}
