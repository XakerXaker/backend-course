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
import { CreateTrainerDto } from "./dto/create-trainer.dto";
import { PaginatedTrainersResponseDto } from "./dto/paginated-trainers-response.dto";
import { TrainerResponseDto } from "./dto/trainer-response.dto";
import { UpdateTrainerDto } from "./dto/update-trainer.dto";
import { TrainersService } from "./trainers.service";

@ApiTags("Trainers API")
@Controller("api/trainers")
export class TrainersApiController {
  constructor(private readonly trainersService: TrainersService) {}

  @Get()
  @ApiOperation({ summary: "Получить список тренеров с пагинацией" })
  @ApiOkResponse({
    description:
      "Список тренеров. Для навигации по страницам используется заголовок Link.",
    type: PaginatedTrainersResponseDto,
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

    const result = await this.trainersService.findAllPaginated(page, limit);

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
  @ApiOperation({ summary: "Получить тренера по идентификатору" })
  @ApiOkResponse({
    description: "Тренер найден",
    type: TrainerResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Тренер не найден",
    type: ApiErrorResponseDto,
  })
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.trainersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Создать тренера" })
  @ApiCreatedResponse({
    description: "Тренер успешно создан",
    type: TrainerResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Некорректное тело запроса",
    type: ApiErrorResponseDto,
  })
  create(@Body() createTrainerDto: CreateTrainerDto) {
    return this.trainersService.create(createTrainerDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить тренера" })
  @ApiOkResponse({
    description: "Тренер успешно обновлён",
    type: TrainerResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Некорректные входные данные",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Тренер не найден",
    type: ApiErrorResponseDto,
  })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateTrainerDto: UpdateTrainerDto,
  ) {
    return this.trainersService.update(id, updateTrainerDto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Удалить тренера" })
  @ApiNoContentResponse({ description: "Тренер удалён" })
  @ApiNotFoundResponse({
    description: "Тренер не найден",
    type: ApiErrorResponseDto,
  })
  async remove(@Param("id", new ParseUUIDPipe()) id: string) {
    await this.trainersService.remove(id);
  }
}
