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
import { CreateReviewDto } from "./dto/create-review.dto";
import { PaginatedReviewsResponseDto } from "./dto/paginated-reviews-response.dto";
import { ReviewResponseDto } from "./dto/review-response.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";
import { ReviewsService } from "./reviews.service";

@ApiTags("Reviews API")
@Controller("api/reviews")
export class ReviewsApiController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: "Получить список отзывов с пагинацией" })
  @ApiOkResponse({
    description:
      "Список отзывов. Для навигации по страницам используется заголовок Link.",
    type: PaginatedReviewsResponseDto,
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

    const result = await this.reviewsService.findAllPaginated(page, limit);

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
  @ApiOperation({ summary: "Получить отзыв по идентификатору" })
  @ApiOkResponse({ description: "Отзыв найден", type: ReviewResponseDto })
  @ApiNotFoundResponse({ description: "Отзыв не найден", type: ApiErrorResponseDto })
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.reviewsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Создать отзыв" })
  @ApiCreatedResponse({ description: "Отзыв успешно создан", type: ReviewResponseDto })
  @ApiBadRequestResponse({
    description: "Некорректное тело запроса, либо указан несуществующий автор",
    type: ApiErrorResponseDto,
  })
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(createReviewDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить отзыв" })
  @ApiOkResponse({ description: "Отзыв успешно обновлён", type: ReviewResponseDto })
  @ApiBadRequestResponse({
    description: "Некорректные входные данные, либо указан несуществующий автор",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Отзыв не найден", type: ApiErrorResponseDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, updateReviewDto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Удалить отзыв" })
  @ApiNoContentResponse({ description: "Отзыв удалён" })
  @ApiNotFoundResponse({ description: "Отзыв не найден", type: ApiErrorResponseDto })
  async remove(@Param("id", new ParseUUIDPipe()) id: string) {
    await this.reviewsService.remove(id);
  }
}
