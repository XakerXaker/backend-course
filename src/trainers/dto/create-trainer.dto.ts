import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from "class-validator";

export class CreateTrainerDto {
  @ApiProperty({
    description: "Имя тренера",
    minLength: 2,
    maxLength: 120,
    example: "Алексей Смирнов",
  })
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiProperty({
    description: "Специализация тренера",
    minLength: 2,
    maxLength: 120,
    example: "Функциональный тренинг",
  })
  @IsString()
  @Length(2, 120)
  specialization: string;

  @ApiProperty({
    description: "Опыт работы тренера в годах",
    minimum: 0,
    maximum: 80,
    example: 7,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  experience: number;

  @ApiPropertyOptional({
    description: "Ссылка на фото",
    example: "https://example.com/images/trainer.jpg",
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  photoUrl?: string;

  @ApiPropertyOptional({
    description: "Краткая биография",
    maxLength: 1500,
    example: "Сертифицированный тренер, опыт подготовки к полумарафону.",
  })
  @IsOptional()
  @IsString()
  @Length(0, 1500)
  bio?: string;
}
