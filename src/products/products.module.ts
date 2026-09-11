import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { RequireLoginMiddleware } from "../auth/middleware/require-login.middleware";
import { PrismaModule } from "../prisma/prisma.module";
import { ProductsApiController } from "./products.api.controller";
import { ProductsController } from "./products.controller";
import { ProductsResolver } from "./products.resolver";
import { ProductsService } from "./products.service";

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, ProductsApiController],
  providers: [ProductsService, ProductsResolver],
  exports: [ProductsService],
})
export class ProductsModule implements NestModule {
  // MiddlewareConsumer (ЛР7) — только на служебные (админские) страницы
  // управления товарами, список ("/nutrition") остаётся публичным.
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireLoginMiddleware)
      .forRoutes(
        { path: "nutrition", method: RequestMethod.POST },
        { path: "nutrition/add", method: RequestMethod.GET },
        { path: "nutrition/:id/edit", method: RequestMethod.ALL },
        { path: "nutrition/:id/delete", method: RequestMethod.POST },
      );
  }
}
