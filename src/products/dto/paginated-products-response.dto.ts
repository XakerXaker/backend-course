import { ApiProperty } from "@nestjs/swagger";
import { ProductResponseDto } from "./product-response.dto";

export class PaginatedProductsResponseDto {
  @ApiProperty({ type: () => [ProductResponseDto] })
  items: ProductResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ example: 2, description: "Всего страниц" })
  totalPages: number;
}
