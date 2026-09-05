import { Module } from "@nestjs/common";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { GraphQLModule, GraphQLSchemaHost } from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from "graphql-query-complexity";
import { join } from "path";
import { AppController } from "./app.controller";
import { MAX_QUERY_COMPLEXITY } from "./graphql/complexity";
import { MembershipsModule } from "./memberships/memberships.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { TrainersModule } from "./trainers/trainers.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    PrismaModule,
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
