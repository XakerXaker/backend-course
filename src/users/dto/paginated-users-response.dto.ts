import { ApiProperty } from "@nestjs/swagger";
import { UserResponseDto } from "./user-response.dto";

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: () => [UserResponseDto] })
  items: UserResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 7 })
  total: number;

  @ApiProperty({ example: 1, description: "Всего страниц" })
  totalPages: number;
}
