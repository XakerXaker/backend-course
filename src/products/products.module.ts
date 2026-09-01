import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ProductsApiController } from "./products.api.controller";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, ProductsApiController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
