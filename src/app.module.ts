import { Module } from "@nestjs/common";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { GraphQLModule, GraphQLSchemaHost } from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from "graphql-query-complexity";
import { join } from "path";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { MAX_QUERY_COMPLEXITY } from "./graphql/complexity";
import { MembershipsModule } from "./memberships/memberships.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { StorageModule } from "./storage/storage.module";
import { TrainersModule } from "./trainers/trainers.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    // Динамический модуль (ЛР7): конфигурация провайдера аутентификации
    // (SuperTokens) читается из переменных окружения здесь, при
    // регистрации, а не внутри самого AuthModule — см. src/auth/auth.module.ts.
    //
    // "||", а не "??" — SuperTokens падает с "Please provide a valid domain
    // name" уже на этапе supertokens.init(), если connectionURI/apiDomain/
    // websiteDomain окажутся пустой строкой (например, .env скопирован из
    // .env.example и значение случайно стёрто, а не заполнено); "??"
    // подставляет запасное значение только при undefined, пустую строку
    // пропускает как есть.
    AuthModule.forRoot({
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "http://localhost:3567",
      apiKey: process.env.SUPERTOKENS_API_KEY || undefined,
      appName: process.env.APP_NAME || "PowerGit Gym",
      apiDomain: process.env.API_DOMAIN || "http://localhost:3000",
      websiteDomain: process.env.WEBSITE_DOMAIN || "http://localhost:3000",
    }),
    TrainersModule,
    MembershipsModule,
    ProductsModule,
    UsersModule,
    ReviewsModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [GraphQLSchemaHost],
      useFactory: (gqlSchemaHost: GraphQLSchemaHost) => ({
        // code-first: схема (types/queries/mutations) собирается из
        // декораторов @ObjectType/@InputType/@Resolver и сохраняется в файл
        // рядом — исключительно для просмотра, в рантайме используется
        // схема из памяти.
        autoSchemaFile: join(process.cwd(), "src/graphql/schema.gql"),
        sortSchema: true,
        // По умолчанию @nestjs/apollo кладёт в контекст резолверов только
        // `{ req }` — этого достаточно для самих резолверов, но
        // TimingInterceptor (см. src/common/interceptors) не может
        // выставить заголовок X-Elapsed-Time без объекта ответа. Экспресс
        // передаёт его вторым параметром в context-фабрику
        // (@as-integrations/express5), поэтому явно прокидываем оба.
        context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
        // По умолчанию @nestjs/apollo вне production поднимает устаревший
        // GraphQL Playground — отключаем его (playground: false) и вместо
        // этого подключаем встроенную песочницу Apollo Server (Apollo
        // Sandbox) через её плагин, как рекомендует документация NestJS.
        playground: false,
        plugins: [
          ApolloServerPluginLandingPageLocalDefault({ embed: true }),
          {
            requestDidStart: async () => ({
              async didResolveOperation({ request, document }) {
                const { schema } = gqlSchemaHost;

                const complexity = getComplexity({
                  schema,
                  operationName: request.operationName,
                  query: document,
                  variables: request.variables,
                  estimators: [
                    fieldExtensionsEstimator(),
                    simpleEstimator({ defaultComplexity: 1 }),
                  ],
                });

                if (complexity > MAX_QUERY_COMPLEXITY) {
                  throw new GraphQLError(
                    `Запрос слишком сложный: ${complexity}. ` +
                      `Максимально допустимая сложность: ${MAX_QUERY_COMPLEXITY}.`,
                  );
                }
              },
            }),
          },
        ],
      }),
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
