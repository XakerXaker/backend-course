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
  ApiConflictResponse,
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
import { ReviewResponseDto } from "../reviews/dto/review-response.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { PaginatedUsersResponseDto } from "./dto/paginated-users-response.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { UsersService } from "./users.service";

@ApiTags("Users API")
@Controller("api/users")
export class UsersApiController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Получить список участников с пагинацией" })
  @ApiOkResponse({
    description:
      "Список участников. Для навигации по страницам используется заголовок Link.",
    type: PaginatedUsersResponseDto,
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

    const result = await this.usersService.findAllPaginated(page, limit);

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
  @ApiOperation({ summary: "Получить участника по идентификатору" })
  @ApiOkResponse({ description: "Участник найден", type: UserResponseDto })
  @ApiNotFoundResponse({ description: "Участник не найден", type: ApiErrorResponseDto })
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Зарегистрировать участника" })
  @ApiCreatedResponse({ description: "Участник успешно создан", type: UserResponseDto })
  @ApiBadRequestResponse({
    description: "Некорректное тело запроса, либо указан несуществующий абонемент",
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: "Участник с таким email уже зарегистрирован",
    type: ApiErrorResponseDto,
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить участника" })
  @ApiOkResponse({ description: "Участник успешно обновлён", type: UserResponseDto })
  @ApiBadRequestResponse({
    description: "Некорректные входные данные, либо указан несуществующий абонемент",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Участник не найден", type: ApiErrorResponseDto })
  @ApiConflictResponse({
    description: "Участник с таким email уже зарегистрирован",
    type: ApiErrorResponseDto,
  })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Удалить участника" })
  @ApiNoContentResponse({ description: "Участник удалён" })
  @ApiNotFoundResponse({ description: "Участник не найден", type: ApiErrorResponseDto })
  async remove(@Param("id", new ParseUUIDPipe()) id: string) {
    await this.usersService.remove(id);
  }

  @Get(":id/reviews")
  @ApiOperation({ summary: "Получить все отзывы, оставленные этим участником" })
  @ApiOkResponse({ description: "Список отзывов", type: [ReviewResponseDto] })
  @ApiNotFoundResponse({ description: "Участник не найден", type: ApiErrorResponseDto })
  findReviews(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.usersService.findReviews(id);
  }

  @Get(":id/reviews/:reviewId")
  @ApiOperation({ summary: "Получить конкретный отзыв этого участника" })
  @ApiOkResponse({ description: "Отзыв найден", type: ReviewResponseDto })
  @ApiNotFoundResponse({
    description: "Участник не найден, либо у него нет отзыва с таким id",
    type: ApiErrorResponseDto,
  })
  findReview(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("reviewId", new ParseUUIDPipe()) reviewId: string,
  ) {
    return this.usersService.findReview(id, reviewId);
  }
}
