import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  Render,
  Res,
  Sse,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { Observable } from "rxjs";
import { StorageService } from "../storage/storage.service";
import { CreateTrainerDto } from "./dto/create-trainer.dto";
import { UpdateTrainerDto } from "./dto/update-trainer.dto";
import { TrainersService } from "./trainers.service";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

@Controller("trainers")
export class TrainersController {
  constructor(
    private readonly trainersService: TrainersService,
    private readonly storageService: StorageService,
  ) {}

  private getUser(auth: string) {
    if (auth === "true") {
      return { name: "Иван Иванов", email: "ivan@powergitgym.ru" };
    }
    return null;
  }

  @Get()
  @Render("trainers/list")
  async getCollectionPage(@Query("auth") auth: string) {
    const trainers = await this.trainersService.findAll();

    return {
      title: "Тренеры - PowerGit Gym",
      activePage: "trainers",
      user: this.getUser(auth),
      auth,
      trainers,
    };
  }

  @Get("add")
  @Render("trainers/form")
  getCreatePage(@Query("auth") auth: string) {
    return {
      title: "Добавить тренера - PowerGit Gym",
      activePage: "trainers",
      user: this.getUser(auth),
      auth,
      formTitle: "Добавление тренера",
      formAction: `/trainers?auth=${auth || "false"}`,
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
  events(): Observable<MessageEvent> {
    return this.trainersService.getEvents();
  }

  @Get(":id")
  @Render("trainers/detail")
  async getEntityPage(@Param("id") id: string, @Query("auth") auth: string) {
    const trainer = await this.trainersService.findOne(id);

    return {
      title: `${trainer.name} - Тренер`,
      activePage: "trainers",
      user: this.getUser(auth),
      auth,
      trainer,
    };
  }

  @Get(":id/edit")
  @Render("trainers/form")
  async getUpdatePage(@Param("id") id: string, @Query("auth") auth: string) {
    const trainer = await this.trainersService.findOne(id);

    return {
      title: `Редактировать ${trainer.name} - PowerGit Gym`,
      activePage: "trainers",
      user: this.getUser(auth),
      auth,
      formTitle: "Редактирование тренера",
      formAction: `/trainers/${id}/edit?auth=${auth || "false"}`,
      submitLabel: "Сохранить",
      isEdit: true,
      trainer,
    };
  }

  @Post()
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
    @Query("auth") auth: string,
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

    return res.redirect(`/trainers?auth=${auth || "false"}`);
  }

  @Post(":id/edit")
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
    @Query("auth") auth: string,
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

    return res.redirect(`/trainers/${trainer.id}?auth=${auth || "false"}`);
  }

  @Post(":id/delete")
  async removeFromForm(
    @Param("id") id: string,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    await this.trainersService.remove(id);

    return res.redirect(`/trainers?auth=${auth || "false"}`);
  }
}
