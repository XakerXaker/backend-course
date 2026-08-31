import { ApiProperty } from "@nestjs/swagger";
import { TrainerResponseDto } from "./trainer-response.dto";

export class PaginatedTrainersResponseDto {
  @ApiProperty({ type: () => [TrainerResponseDto] })
  items: TrainerResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 5, description: "Всего страниц" })
  totalPages: number;
}
