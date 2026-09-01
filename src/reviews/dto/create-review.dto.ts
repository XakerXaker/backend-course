import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class CreateReviewDto {
  @IsString()
  @Length(2, 120)
  authorName: string;

  @IsString()
  @Length(5, 1000)
  text: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
