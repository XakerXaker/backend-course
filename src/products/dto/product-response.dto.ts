import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Category } from "@prisma/client";

export class ProductResponseDto {
  @ApiProperty({ example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f" })
  id: string;

  @ApiProperty({ example: "Сывороточный протеин" })
  name: string;

  @ApiProperty({ enum: Category, example: Category.PROTEIN })
  category: Category;

  @ApiProperty({
    description: "Prisma сериализует Decimal в JSON как строку",
    type: String,
    example: "2200",
  })
  price: string;

  @ApiPropertyOptional({ example: "Быстроусвояемый протеин, 900 г." })
  description?: string | null;

  @ApiProperty({ example: 25 })
  stock: number;

  @ApiProperty({ example: "2026-04-06T12:30:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2026-04-06T12:31:00.000Z" })
  updatedAt: Date;
}
