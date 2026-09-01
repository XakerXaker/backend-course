import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

export class CreateReviewDto {
  @ApiProperty({
    description: "Имя автора отзыва (фиксируется на момент публикации)",
    minLength: 2,
    maxLength: 120,
    example: "Иван Иванов",
  })
  @IsString()
  @Length(2, 120)
  authorName: string;

  @ApiProperty({
    description: "Текст отзыва",
    minLength: 5,
    maxLength: 1000,
    example: "Отличный зал, всем советую!",
  })
  @IsString()
  @Length(5, 1000)
  text: string;

  @ApiPropertyOptional({
    description: "Оценка от 1 до 5. По умолчанию 5.",
    minimum: 1,
    maximum: 5,
    default: 5,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description:
      "Идентификатор зарегистрированного автора (User.id). Если не указан — отзыв гостевой.",
    example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f",
  })
  // Необязательная связь с User (см. UsersModule) — отзыв можно оставить
  // от имени зарегистрированного участника, выбрав его в форме.
  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsUUID()
  authorId?: string;
}
