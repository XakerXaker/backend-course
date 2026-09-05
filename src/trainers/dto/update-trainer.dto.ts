import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from "class-validator";

export class UpdateTrainerDto {
  @ApiPropertyOptional({
    description: "Имя тренера",
    minLength: 2,
    maxLength: 120,
    example: "Алексей Смирнов",
  })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({
    description: "Специализация тренера",
    minLength: 2,
    maxLength: 120,
    example: "Функциональный тренинг",
  })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  specialization?: string;

  @ApiPropertyOptional({
    description: "Опыт работы тренера в годах",
    minimum: 0,
    maximum: 80,
    example: 8,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  experience?: number;

  @ApiPropertyOptional({
    description: "Ссылка на фото",
    example: "https://example.com/images/trainer.jpg",
  })
  // Пустая строка → null, а не undefined: так форма редактирования может
  // явно очистить URL фото (сервис пропускает поле только при undefined).
  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsUrl({ require_tld: false })
  photoUrl?: string | null;

  @ApiPropertyOptional({
    description: "Краткая биография",
    maxLength: 1500,
    example: "Подготавливает новичков к регулярным силовым тренировкам.",
  })
  @IsOptional()
  @IsString()
  @Length(0, 1500)
  bio?: string;
}
