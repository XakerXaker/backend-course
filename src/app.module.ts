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
    AuthModule.forRoot({
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "",
      apiKey: process.env.SUPERTOKENS_API_KEY || undefined,
      appName: process.env.APP_NAME || "PowerGit Gym",
      apiDomain: process.env.API_DOMAIN || "",
      websiteDomain: process.env.WEBSITE_DOMAIN || "",
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
        autoSchemaFile: join(process.cwd(), "src/graphql/schema.gql"),
        sortSchema: true,
        context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
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
