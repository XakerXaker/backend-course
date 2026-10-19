import { Injectable, MessageEvent, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTrainerDto } from "./dto/create-trainer.dto";
import { UpdateTrainerDto } from "./dto/update-trainer.dto";
import { Observable, Subject, map } from "rxjs";

interface TrainerChangeEvent {
  action: "created" | "updated" | "deleted";
  trainerId: string;
  trainerName: string;
  occurredAt: string;
}

@Injectable()
export class TrainersService {
  private readonly trainerEvents$ = new Subject<TrainerChangeEvent>();

  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.trainer.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async findAllPaginated(page: number, limit: number) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.trainer.findMany({
        skip,
        take: safeLimit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.trainer.count(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    };
  }

  async findOne(id: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { id } });

    if (!trainer) {
      throw new NotFoundException("Тренер не найден");
    }

    return trainer;
  }

  async create(createTrainerDto: CreateTrainerDto) {
    const trainer = await this.prisma.trainer.create({
      data: {
        name: createTrainerDto.name,
        specialization: createTrainerDto.specialization,
        experience: Number(createTrainerDto.experience) || 0,
        photoUrl: createTrainerDto.photoUrl || null,
        bio: createTrainerDto.bio || null,
      },
    });

    this.pushEvent("created", trainer.id, trainer.name);

    return trainer;
  }

  async update(id: string, updateTrainerDto: UpdateTrainerDto) {
    await this.findOne(id);

    const trainer = await this.prisma.trainer.update({
      where: { id },
      data: {
        ...(updateTrainerDto.name !== undefined && { name: updateTrainerDto.name }),
        ...(updateTrainerDto.specialization !== undefined && {
          specialization: updateTrainerDto.specialization,
        }),
        ...(updateTrainerDto.experience !== undefined && {
          experience: Number(updateTrainerDto.experience) || 0,
        }),
        ...(updateTrainerDto.photoUrl !== undefined && {
          photoUrl: updateTrainerDto.photoUrl || null,
        }),
        ...(updateTrainerDto.bio !== undefined && { bio: updateTrainerDto.bio || null }),
      },
    });

    this.pushEvent("updated", trainer.id, trainer.name);

    return trainer;
  }

  async remove(id: string) {
    await this.findOne(id);

    const trainer = await this.prisma.trainer.delete({ where: { id } });

    this.pushEvent("deleted", trainer.id, trainer.name);

    return trainer;
  }

  getEvents(): Observable<MessageEvent> {
    return this.trainerEvents$.asObservable().pipe(
      map((event) => ({
        data: event,
      })),
    );
  }

  private pushEvent(
    action: TrainerChangeEvent["action"],
    trainerId: string,
    trainerName: string,
  ) {
    this.trainerEvents$.next({
      action,
      trainerId,
      trainerName,
      occurredAt: new Date().toISOString(),
    });
  }
}
