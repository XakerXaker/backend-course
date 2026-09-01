import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(take?: number) {
    return this.prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      ...(take ? { take } : {}),
    });
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });

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
      },
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
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.review.delete({ where: { id } });
  }
}
