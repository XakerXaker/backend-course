import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  ParseFilePipeBuilder,
  Post,
  Render,
  Req,
  Res,
  Sse,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Role } from "@prisma/client";
import { Request, Response } from "express";
import { Observable } from "rxjs";
import { PublicAccess } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { StorageService } from "../storage/storage.service";
import { CreateTrainerDto } from "./dto/create-trainer.dto";
import { UpdateTrainerDto } from "./dto/update-trainer.dto";
import { TrainersService } from "./trainers.service";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

// Управление тренерами (add/edit/delete) — служебная функция, доступная
// только администратору (ЛР7); просмотр списка/карточки и SSE остаются
// публичными для любого посетителя.
@Controller("trainers")
export class TrainersController {
  constructor(
    private readonly trainersService: TrainersService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @PublicAccess()
  @Render("trainers/list")
  async getCollectionPage(@Req() req: Request) {
    const trainers = await this.trainersService.findAll();

    return {
      title: "Тренеры - PowerGit Gym",
      activePage: "trainers",
      user: req.user,
      isAdmin: req.user?.role === Role.ADMIN,
      trainers,
    };
  }

  @Get("add")
  @Roles(Role.ADMIN)
  @Render("trainers/form")
  getCreatePage(@Req() req: Request) {
    return {
      title: "Добавить тренера - PowerGit Gym",
      activePage: "trainers",
      user: req.user,
      formTitle: "Добавление тренера",
      formAction: "/trainers",
      submitLabel: "Создать",
      isEdit: false,
      trainer: {
        name: "",
        specialization: "",
        // Пустая строка, а не 0 — иначе в поле <input type="number">
        // остаётся "0" и печатать приходится поверх него ("054" вместо "54").
        experience: "",
        photoUrl: "",
        bio: "",
      },
    };
  }

  // Должен быть объявлен до "@Get(':id')", иначе Express/Nest сопоставит
  // GET /trainers/events с параметром :id="events" и вернёт 404.
  @Sse("events")
  @PublicAccess()
  events(): Observable<MessageEvent> {
    return this.trainersService.getEvents();
  }

  @Get(":id")
  @PublicAccess()
  @Render("trainers/detail")
  async getEntityPage(@Param("id") id: string, @Req() req: Request) {
    const trainer = await this.trainersService.findOne(id);

    return {
      title: `${trainer.name} - Тренер`,
      activePage: "trainers",
      user: req.user,
      isAdmin: req.user?.role === Role.ADMIN,
      trainer,
    };
  }

  @Get(":id/edit")
  @Roles(Role.ADMIN)
  @Render("trainers/form")
  async getUpdatePage(@Param("id") id: string, @Req() req: Request) {
    const trainer = await this.trainersService.findOne(id);

    return {
      title: `Редактировать ${trainer.name} - PowerGit Gym`,
      activePage: "trainers",
      user: req.user,
      formTitle: "Редактирование тренера",
      formAction: `/trainers/${id}/edit`,
      submitLabel: "Сохранить",
      isEdit: true,
      trainer,
    };
  }

  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor("photo"))
  async create(
    @Body() createTrainerDto: CreateTrainerDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ })
        .addMaxSizeValidator({ maxSize: MAX_PHOTO_SIZE_BYTES })
        .build({ fileIsRequired: false }),
    )
    photo: Express.Multer.File | undefined,
    @Res() res: Response,
  ) {
    if (photo) {
      createTrainerDto.photoUrl = await this.storageService.uploadFile({
        buffer: photo.buffer,
        originalName: photo.originalname,
        contentType: photo.mimetype,
        folder: "trainers",
      });
    }

    await this.trainersService.create(createTrainerDto);

    return res.redirect("/trainers");
  }

  @Post(":id/edit")
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor("photo"))
  async updateFromForm(
    @Param("id") id: string,
    @Body() updateTrainerDto: UpdateTrainerDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ })
        .addMaxSizeValidator({ maxSize: MAX_PHOTO_SIZE_BYTES })
        .build({ fileIsRequired: false }),
    )
    photo: Express.Multer.File | undefined,
    @Res() res: Response,
  ) {
    // Новое фото загружено — заменяем ссылку; иначе поле остаётся
    // undefined, и TrainersService.update() не трогает текущее фото.
    if (photo) {
      updateTrainerDto.photoUrl = await this.storageService.uploadFile({
        buffer: photo.buffer,
        originalName: photo.originalname,
        contentType: photo.mimetype,
        folder: "trainers",
      });
    }

    const trainer = await this.trainersService.update(id, updateTrainerDto);

    return res.redirect(`/trainers/${trainer.id}`);
  }

  @Post(":id/delete")
  @Roles(Role.ADMIN)
  async removeFromForm(@Param("id") id: string, @Res() res: Response) {
    await this.trainersService.remove(id);

    return res.redirect("/trainers");
  }
}
