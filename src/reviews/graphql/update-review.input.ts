import { InputType, PartialType } from "@nestjs/graphql";
import { CreateReviewInput } from "./create-review.input";

@InputType()
export class UpdateReviewInput extends PartialType(CreateReviewInput) {}
