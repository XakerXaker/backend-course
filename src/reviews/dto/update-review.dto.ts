import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

export class UpdateReviewDto {
  @ApiPropertyOptional({
    description: "Имя автора отзыва",
    minLength: 2,
    maxLength: 120,
    example: "Иван Иванов",
  })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  authorName?: string;

  @ApiPropertyOptional({
    description: "Текст отзыва",
    minLength: 5,
    maxLength: 1000,
    example: "Обновлённый отзыв про зал",
  })
  @IsOptional()
  @IsString()
  @Length(5, 1000)
  text?: string;

  @ApiPropertyOptional({
    description: "Оценка от 1 до 5",
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: "Идентификатор зарегистрированного автора (User.id)",
    example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f",
  })
  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsUUID()
  authorId?: string;
}
