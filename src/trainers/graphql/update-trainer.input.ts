import { InputType, PartialType } from "@nestjs/graphql";
import { CreateTrainerInput } from "./create-trainer.input";

@InputType()
export class UpdateTrainerInput extends PartialType(CreateTrainerInput) {}
