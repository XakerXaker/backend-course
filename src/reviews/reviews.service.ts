import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";

// Только безопасное подмножество полей автора — без passwordHash.
const AUTHOR_INCLUDE = {
  author: { select: { id: true, email: true, name: true } },
} as const;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(take?: number) {
    // include: author — необязательная связь Review -> User: если отзыв
    // оставлен от имени зарегистрированного участника, подтягиваем его.
    return this.prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: AUTHOR_INCLUDE,
      ...(take ? { take } : {}),
    });
  }

  async findAllPaginated(page: number, limit: number) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        skip,
        take: safeLimit,
        orderBy: { createdAt: "desc" },
        include: AUTHOR_INCLUDE,
      }),
      this.prisma.review.count(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return { items, page: safePage, limit: safeLimit, total, totalPages };
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: AUTHOR_INCLUDE,
    });

    if (!review) {
      throw new NotFoundException("Отзыв не найден");
    }

    return review;
  }

  create(createReviewDto: CreateReviewDto) {
    return this.prisma.review.create({
      data: {
        authorName: createReviewDto.authorName,
        text: createReviewDto.text,
        rating: createReviewDto.rating ?? 5,
        authorId: createReviewDto.authorId ?? null,
      },
      include: AUTHOR_INCLUDE,
    });
  }

  async update(id: string, updateReviewDto: UpdateReviewDto) {
    await this.findOne(id);

    return this.prisma.review.update({
      where: { id },
      data: {
        ...(updateReviewDto.authorName !== undefined && {
          authorName: updateReviewDto.authorName,
        }),
        ...(updateReviewDto.text !== undefined && { text: updateReviewDto.text }),
        ...(updateReviewDto.rating !== undefined && {
          rating: updateReviewDto.rating,
        }),
        ...(updateReviewDto.authorId !== undefined && {
          authorId: updateReviewDto.authorId,
        }),
      },
      include: AUTHOR_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.review.delete({ where: { id } });
  }
}
