import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

export class UpdateReviewDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  authorName?: string;

  @IsOptional()
  @IsString()
  @Length(5, 1000)
  text?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsUUID()
  authorId?: string;
}
