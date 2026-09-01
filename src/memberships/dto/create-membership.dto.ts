import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsInt, IsNumber, IsString, Length, Min } from "class-validator";

export class CreateMembershipDto {
  @ApiProperty({
    description: "Название абонемента",
    minLength: 2,
    maxLength: 80,
    example: "VIP",
  })
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiProperty({ description: "Цена, ₽", minimum: 0, example: 5000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: "Срок действия, месяцев",
    minimum: 1,
    example: 6,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({
    description:
      'Список преимуществ. Из HTML-формы приходит одной строкой (по одному пункту на строку в textarea) и автоматически разбивается на массив; JSON-клиент может сразу прислать массив строк.',
    type: [String],
    example: ["24/7", "Персональные тренировки"],
  })
  // HTML-форма присылает список преимуществ построчно в textarea,
  // здесь превращаем его в массив строк для Prisma (String[]).
  @Transform(({ value }) =>
    typeof value === "string"
      ? value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsString({ each: true })
  features: string[];
}
