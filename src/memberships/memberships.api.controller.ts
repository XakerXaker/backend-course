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
  @PublicAccess()
  @Header("Cache-Control", "private, max-age=60, must-revalidate")
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
  @PublicAccess()
  @Header("Cache-Control", "private, max-age=60, must-revalidate")
  @ApiOperation({ summary: "Получить абонемент по идентификатору" })
  @ApiOkResponse({ description: "Абонемент найден", type: MembershipResponseDto })
  @ApiNotFoundResponse({ description: "Абонемент не найден", type: ApiErrorResponseDto })
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.membershipsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Создать абонемент (только администратор)" })
  @ApiCreatedResponse({ description: "Абонемент успешно создан", type: MembershipResponseDto })
  @ApiBadRequestResponse({ description: "Некорректное тело запроса", type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ description: "Недостаточно прав", type: ApiErrorResponseDto })
  create(@Body() createMembershipDto: CreateMembershipDto) {
    return this.membershipsService.create(createMembershipDto);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Обновить абонемент (только администратор)" })
  @ApiOkResponse({ description: "Абонемент успешно обновлён", type: MembershipResponseDto })
  @ApiBadRequestResponse({ description: "Некорректные входные данные", type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: "Абонемент не найден", type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ description: "Недостаточно прав", type: ApiErrorResponseDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
  ) {
    return this.membershipsService.update(id, updateMembershipDto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiCookieAuth()
  @HttpCode(204)
  @ApiOperation({ summary: "Удалить абонемент (только администратор)" })
  @ApiNoContentResponse({ description: "Абонемент удалён" })
  @ApiNotFoundResponse({ description: "Абонемент не найден", type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ description: "Недостаточно прав", type: ApiErrorResponseDto })
  async remove(@Param("id", new ParseUUIDPipe()) id: string) {
    await this.membershipsService.remove(id);
  }

  // Без @PublicAccess() — список участников абонемента содержит личные
  // данные (email/телефон), доступен только аутентифицированным
  // пользователям (см. глобальный SessionAuthGuard).
  @Get(":id/users")
  @ApiCookieAuth()
  @Header("Cache-Control", "private, max-age=60, must-revalidate")
  @ApiOperation({ summary: "Получить всех участников, оформивших этот абонемент" })
  @ApiOkResponse({ description: "Список участников", type: [UserResponseDto] })
  @ApiNotFoundResponse({ description: "Абонемент не найден", type: ApiErrorResponseDto })
  findUsers(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.membershipsService.findUsers(id);
  }

  @Get(":id/users/:userId")
  @ApiCookieAuth()
  @Header("Cache-Control", "private, max-age=60, must-revalidate")
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
