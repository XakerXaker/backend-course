import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// Ровно то подмножество полей User, что реально выбирается в
// ReviewsService (AUTHOR_INCLUDE) — без passwordHash.
export class ReviewAuthorSummaryDto {
  @ApiProperty({ example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f" })
  id: string;

  @ApiProperty({ example: "ivan@powergitgym.ru" })
  email: string;

  @ApiPropertyOptional({ example: "Иван Иванов" })
  name?: string | null;
}

export class ReviewResponseDto {
  @ApiProperty({ example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f" })
  id: string;

  @ApiProperty({ example: "Иван Иванов" })
  authorName: string;

  @ApiProperty({ example: "Отличный зал, всем советую!" })
  text: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  rating: number;

  @ApiProperty({ example: "2026-04-06T12:30:00.000Z" })
  createdAt: Date;

  @ApiPropertyOptional({
    description: "Заполнено, если отзыв оставлен от имени User.id",
    example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f",
  })
  authorId?: string | null;

  @ApiPropertyOptional({
    description: "Присутствует, только если отзыв связан с зарегистрированным участником",
    type: ReviewAuthorSummaryDto,
  })
  author?: ReviewAuthorSummaryDto | null;
}
