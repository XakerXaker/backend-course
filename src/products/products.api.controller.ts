import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Request, Response } from "express";
import { PublicAccess } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { ApiErrorResponseDto } from "../common/dto/api-error-response.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { buildPaginationLinkHeader } from "../common/pagination.util";
import { CreateProductDto } from "./dto/create-product.dto";
import { PaginatedProductsResponseDto } from "./dto/paginated-products-response.dto";
import { ProductResponseDto } from "./dto/product-response.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsService } from "./products.service";

// Маршрут REST-ресурса — /api/products, по имени сущности Product,
// а не по названию MVC-страницы (/nutrition).
@ApiTags("Products API")
@Controller("api/products")
export class ProductsApiController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @PublicAccess()
  @Header("Cache-Control", "private, max-age=60, must-revalidate")
  @ApiOperation({ summary: "Получить список товаров с пагинацией" })
  @ApiOkResponse({
    description:
      "Список товаров. Для навигации по страницам используется заголовок Link.",
    type: PaginatedProductsResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Неверные параметры пагинации",
    type: ApiErrorResponseDto,
  })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const result = await this.productsService.findAllPaginated(page, limit);

    const linkHeader = buildPaginationLinkHeader(
      request,
      result.page,
      result.limit,
      result.totalPages,
    );

    if (linkHeader) {
      response.setHeader("Link", linkHeader);
    }

    return result;
  }

  @Get(":id")
  @PublicAccess()
  @Header("Cache-Control", "private, max-age=60, must-revalidate")
  @ApiOperation({ summary: "Получить товар по идентификатору" })
  @ApiOkResponse({ description: "Товар найден", type: ProductResponseDto })
  @ApiNotFoundResponse({ description: "Товар не найден", type: ApiErrorResponseDto })
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Создать товар (только администратор)" })
  @ApiCreatedResponse({ description: "Товар успешно создан", type: ProductResponseDto })
  @ApiBadRequestResponse({ description: "Некорректное тело запроса", type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ description: "Недостаточно прав", type: ApiErrorResponseDto })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Обновить товар (только администратор)" })
  @ApiOkResponse({ description: "Товар успешно обновлён", type: ProductResponseDto })
  @ApiBadRequestResponse({ description: "Некорректные входные данные", type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: "Товар не найден", type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ description: "Недостаточно прав", type: ApiErrorResponseDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiCookieAuth()
  @HttpCode(204)
  @ApiOperation({ summary: "Удалить товар (только администратор)" })
  @ApiNoContentResponse({ description: "Товар удалён" })
  @ApiNotFoundResponse({ description: "Товар не найден", type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ description: "Недостаточно прав", type: ApiErrorResponseDto })
  async remove(@Param("id", new ParseUUIDPipe()) id: string) {
    await this.productsService.remove(id);
  }
}
