import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

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

  // Необязательная связь с User (см. UsersModule) — отзыв можно оставить
  // от имени зарегистрированного участника, выбрав его в форме.
  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsUUID()
  authorId?: string;
}
