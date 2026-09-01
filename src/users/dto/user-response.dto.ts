import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MembershipSummaryDto } from "../../memberships/dto/membership-response.dto";

class UserReviewSummaryDto {
  @ApiProperty({ example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f" })
  id: string;

  @ApiProperty({ example: "Отличный зал, всем советую!" })
  text: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  rating: number;

  @ApiProperty({ example: "2026-04-06T12:30:00.000Z" })
  createdAt: Date;
}

// Пароль (passwordHash) намеренно отсутствует — UsersService выбирает поля
// явным select без него (см. SAFE_USER_SELECT).
export class UserResponseDto {
  @ApiProperty({ example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f" })
  id: string;

  @ApiProperty({ example: "ivan@powergitgym.ru" })
  email: string;

  @ApiPropertyOptional({ example: "Иван Иванов" })
  name?: string | null;

  @ApiPropertyOptional({ example: "+7 900 123-45-67" })
  phone?: string | null;

  @ApiProperty({ example: "2026-04-06T12:30:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2026-04-06T12:31:00.000Z" })
  updatedAt: Date;

  @ApiPropertyOptional({ example: "3f6a5a8e-3d2c-4d3e-9f2a-1a2b3c4d5e6f" })
  membershipId?: string | null;

  @ApiPropertyOptional({ type: MembershipSummaryDto })
  membership?: MembershipSummaryDto | null;

  @ApiPropertyOptional({
    description: "Присутствует только в ответе GET /api/users/:id",
    type: [UserReviewSummaryDto],
  })
  reviews?: UserReviewSummaryDto[];
}
