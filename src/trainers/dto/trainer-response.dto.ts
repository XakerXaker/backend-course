import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TrainerResponseDto {
  @ApiProperty({ example: "ce81d8ce-f319-477b-8d5b-4fa97f24eaec" })
  id: string;

  @ApiProperty({ example: "Алексей Смирнов" })
  name: string;

  @ApiProperty({ example: "Функциональный тренинг" })
  specialization: string;

  @ApiProperty({ example: 8 })
  experience: number;

  @ApiPropertyOptional({ example: "https://example.com/images/trainer.jpg" })
  photoUrl?: string | null;

  @ApiPropertyOptional({ example: "Сертифицированный персональный тренер." })
  bio?: string | null;

  @ApiProperty({ example: "2026-04-06T12:30:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2026-04-06T12:31:00.000Z" })
  updatedAt: Date;
}
