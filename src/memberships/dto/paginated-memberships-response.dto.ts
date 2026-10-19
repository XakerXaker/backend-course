import { ApiProperty } from "@nestjs/swagger";
import { MembershipResponseDto } from "./membership-response.dto";

export class PaginatedMembershipsResponseDto {
  @ApiProperty({ type: () => [MembershipResponseDto] })
  items: MembershipResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1, description: "Всего страниц" })
  totalPages: number;
}
