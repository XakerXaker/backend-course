import {
  Body,
  Controller,
  Delete,
  Get,
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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Request, Response } from "express";
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
  @ApiOperation({ summary: "Получить товар по идентификатору" })
  @ApiOkResponse({ description: "Товар найден", type: ProductResponseDto })
  @ApiNotFoundResponse({ description: "Товар не найден", type: ApiErrorResponseDto })
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Создать товар" })
  @ApiCreatedResponse({ description: "Товар успешно создан", type: ProductResponseDto })
  @ApiBadRequestResponse({ description: "Некорректное тело запроса", type: ApiErrorResponseDto })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить товар" })
  @ApiOkResponse({ description: "Товар успешно обновлён", type: ProductResponseDto })
  @ApiBadRequestResponse({ description: "Некорректные входные данные", type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: "Товар не найден", type: ApiErrorResponseDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Удалить товар" })
  @ApiNoContentResponse({ description: "Товар удалён" })
  @ApiNotFoundResponse({ description: "Товар не найден", type: ApiErrorResponseDto })
  async remove(@Param("id", new ParseUUIDPipe()) id: string) {
    await this.productsService.remove(id);
  }
}
