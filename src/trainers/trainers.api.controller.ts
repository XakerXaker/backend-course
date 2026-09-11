import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiConsumes,
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
import { StorageService } from "../storage/storage.service";
import { CreateTrainerDto } from "./dto/create-trainer.dto";
import { PaginatedTrainersResponseDto } from "./dto/paginated-trainers-response.dto";
import { TrainerResponseDto } from "./dto/trainer-response.dto";
import { UpdateTrainerDto } from "./dto/update-trainer.dto";
import { TrainersService } from "./trainers.service";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

@ApiTags("Trainers API")
@Controller("api/trainers")
export class TrainersApiController {
  constructor(
    private readonly trainersService: TrainersService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @PublicAccess()
  // Тренеры — самая часто запрашиваемая сущность приложения (используется
  // и на главной, и на странице контактов, и в собственном разделе), поэтому
  // именно для неё включено серверное in-memory кэширование ответа
  // (CacheModule, см. TrainersModule) на несколько секунд — при частых
  // повторных запросах Prisma/БД не трогаются вовсе.
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(5000)
  // Кэширование на клиенте: Cache-Control разрешает браузеру не повторять
  // запрос в течение 60 секунд, а после истечения — прислать условный GET
  // с If-None-Match; ETag на такой запрос ставит EtagInterceptor
  // (см. main.ts), и если тренеры не менялись, сервер ответит 304 без тела.
  @Header("Cache-Control", "private, max-age=60, must-revalidate")
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
  @PublicAccess()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(5000)
  @Header("Cache-Control", "private, max-age=60, must-revalidate")
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
  @Roles(Role.ADMIN)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Создать тренера (только администратор)" })
  @ApiCreatedResponse({
    description: "Тренер успешно создан",
    type: TrainerResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Некорректное тело запроса",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({ description: "Недостаточно прав", type: ApiErrorResponseDto })
  create(@Body() createTrainerDto: CreateTrainerDto) {
    return this.trainersService.create(createTrainerDto);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Обновить тренера (только администратор)" })
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
  @ApiForbiddenResponse({ description: "Недостаточно прав", type: ApiErrorResponseDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateTrainerDto: UpdateTrainerDto,
  ) {
    return this.trainersService.update(id, updateTrainerDto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiCookieAuth()
  @HttpCode(204)
  @ApiOperation({ summary: "Удалить тренера (только администратор)" })
  @ApiNoContentResponse({ description: "Тренер удалён" })
  @ApiNotFoundResponse({
    description: "Тренер не найден",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({ description: "Недостаточно прав", type: ApiErrorResponseDto })
  async remove(@Param("id", new ParseUUIDPipe()) id: string) {
    await this.trainersService.remove(id);
  }

  @Post(":id/photo")
  @Roles(Role.ADMIN)
  @ApiCookieAuth()
  @UseInterceptors(FileInterceptor("photo"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Загрузить фото тренера в объектное хранилище",
    description:
      "Файл (multipart/form-data, поле photo) загружается в S3-совместимое " +
      "объектное хранилище (Yandex Object Storage), а не сохраняется на диске " +
      "сервера — сущности сохраняется только публичная ссылка на объект.",
  })
  @ApiOkResponse({
    description: "Фото загружено, ссылка на него сохранена в photoUrl",
    type: TrainerResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Файл не передан, слишком большой или не является изображением",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Тренер не найден",
    type: ApiErrorResponseDto,
  })
  async uploadPhoto(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ })
        .addMaxSizeValidator({ maxSize: MAX_PHOTO_SIZE_BYTES })
        .build(),
    )
    photo: Express.Multer.File,
  ) {
    await this.trainersService.findOne(id);

    const photoUrl = await this.storageService.uploadFile({
      buffer: photo.buffer,
      originalName: photo.originalname,
      contentType: photo.mimetype,
      folder: "trainers",
    });

    return this.trainersService.update(id, { photoUrl });
  }
}
