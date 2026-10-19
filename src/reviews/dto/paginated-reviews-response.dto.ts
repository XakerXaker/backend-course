import { ApiProperty } from "@nestjs/swagger";
import { ReviewResponseDto } from "./review-response.dto";

export class PaginatedReviewsResponseDto {
  @ApiProperty({ type: () => [ReviewResponseDto] })
  items: ReviewResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ example: 1, description: "Всего страниц" })
  totalPages: number;
}
