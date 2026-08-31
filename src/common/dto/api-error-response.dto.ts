import { ApiProperty } from "@nestjs/swagger";

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    example: ["experience must not be less than 0"],
    oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
  })
  message: string | string[];

  @ApiProperty({ example: "2026-04-06T13:21:00.000Z" })
  timestamp: string;

  @ApiProperty({ example: "/api/trainers?page=0" })
  path: string;
}
