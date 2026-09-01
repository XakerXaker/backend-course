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
import { UserResponseDto } from "../users/dto/user-response.dto";
import { CreateMembershipDto } from "./dto/create-membership.dto";
import { MembershipResponseDto } from "./dto/membership-response.dto";
import { PaginatedMembershipsResponseDto } from "./dto/paginated-memberships-response.dto";
import { UpdateMembershipDto } from "./dto/update-membership.dto";
import { MembershipsService } from "./memberships.service";

// Маршрут REST-ресурса — /api/memberships, по имени сущности Membership,
// а не по названию MVC-страницы (/pricing).
@ApiTags("Memberships API")
@Controller("api/memberships")
export class MembershipsApiController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @ApiOperation({ summary: "Получить список абонементов с пагинацией" })
  @ApiOkResponse({
    description:
      "Список абонементов. Для навигации по страницам используется заголовок Link.",
    type: PaginatedMembershipsResponseDto,
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

    const result = await this.membershipsService.findAllPaginated(page, limit);

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
  @ApiOperation({ summary: "Получить абонемент по идентификатору" })
  @ApiOkResponse({ description: "Абонемент найден", type: MembershipResponseDto })
  @ApiNotFoundResponse({ description: "Абонемент не найден", type: ApiErrorResponseDto })
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.membershipsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Создать абонемент" })
  @ApiCreatedResponse({ description: "Абонемент успешно создан", type: MembershipResponseDto })
  @ApiBadRequestResponse({ description: "Некорректное тело запроса", type: ApiErrorResponseDto })
  create(@Body() createMembershipDto: CreateMembershipDto) {
    return this.membershipsService.create(createMembershipDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить абонемент" })
  @ApiOkResponse({ description: "Абонемент успешно обновлён", type: MembershipResponseDto })
  @ApiBadRequestResponse({ description: "Некорректные входные данные", type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: "Абонемент не найден", type: ApiErrorResponseDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
  ) {
    return this.membershipsService.update(id, updateMembershipDto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Удалить абонемент" })
  @ApiNoContentResponse({ description: "Абонемент удалён" })
  @ApiNotFoundResponse({ description: "Абонемент не найден", type: ApiErrorResponseDto })
  async remove(@Param("id", new ParseUUIDPipe()) id: string) {
    await this.membershipsService.remove(id);
  }

  @Get(":id/users")
  @ApiOperation({ summary: "Получить всех участников, оформивших этот абонемент" })
  @ApiOkResponse({ description: "Список участников", type: [UserResponseDto] })
  @ApiNotFoundResponse({ description: "Абонемент не найден", type: ApiErrorResponseDto })
  findUsers(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.membershipsService.findUsers(id);
  }

  @Get(":id/users/:userId")
  @ApiOperation({ summary: "Получить конкретного участника этого абонемента" })
  @ApiOkResponse({ description: "Участник найден", type: UserResponseDto })
  @ApiNotFoundResponse({
    description: "Абонемент не найден, либо у него нет участника с таким id",
    type: ApiErrorResponseDto,
  })
  findUser(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("userId", new ParseUUIDPipe()) userId: string,
  ) {
    return this.membershipsService.findUser(id, userId);
  }
}
