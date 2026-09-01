import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Query,
  Render,
  Res,
  Sse,
} from "@nestjs/common";
import { Response } from "express";
import { Observable } from "rxjs";
import { CreateTrainerDto } from "./dto/create-trainer.dto";
import { UpdateTrainerDto } from "./dto/update-trainer.dto";
import { TrainersService } from "./trainers.service";

@Controller("trainers")
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

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
        experience: 0,
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
  async create(
    @Body() createTrainerDto: CreateTrainerDto,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
    await this.trainersService.create(createTrainerDto);

    return res.redirect(`/trainers?auth=${auth || "false"}`);
  }

  @Post(":id/edit")
  async updateFromForm(
    @Param("id") id: string,
    @Body() updateTrainerDto: UpdateTrainerDto,
    @Query("auth") auth: string,
    @Res() res: Response,
  ) {
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
