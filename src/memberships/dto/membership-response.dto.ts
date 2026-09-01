import { ApiProperty } from "@nestjs/swagger";

class MembershipCountDto {
  @ApiProperty({ description: "Сколько участников сейчас на этом абонементе", example: 3 })
  users: number;
}

export class MembershipResponseDto {
  @ApiProperty({ example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f" })
  id: string;

  @ApiProperty({ example: "VIP" })
  name: string;

  @ApiProperty({
    description: "Prisma сериализует Decimal в JSON как строку",
    type: String,
    example: "5000",
  })
  price: string;

  @ApiProperty({ example: 6 })
  duration: number;

  @ApiProperty({ type: [String], example: ["24/7", "Персональные тренировки"] })
  features: string[];

  @ApiProperty({ example: "2026-04-06T12:30:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2026-04-06T12:31:00.000Z" })
  updatedAt: Date;

  @ApiProperty({ type: MembershipCountDto })
  _count: MembershipCountDto;
}

// Облегчённая версия для встраивания в UserResponseDto — без _count, чтобы
// не тянуть агрегат по участникам при каждом запросе пользователя.
export class MembershipSummaryDto {
  @ApiProperty({ example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f" })
  id: string;

  @ApiProperty({ example: "VIP" })
  name: string;

  @ApiProperty({ type: String, example: "5000" })
  price: string;

  @ApiProperty({ example: 6 })
  duration: number;

  @ApiProperty({ type: [String], example: ["24/7", "Персональные тренировки"] })
  features: string[];
}
