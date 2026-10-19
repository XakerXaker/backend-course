import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { paginatedComplexity } from "../graphql/complexity";
import { PaginationArgs } from "../graphql/pagination.args";
import { Paginated } from "../graphql/paginated.type";
import { CreateTrainerInput } from "./graphql/create-trainer.input";
import { TrainerType } from "./graphql/trainer.type";
import { UpdateTrainerInput } from "./graphql/update-trainer.input";
import { TrainersService } from "./trainers.service";

const PaginatedTrainer = Paginated(TrainerType);

@Resolver(() => TrainerType)
export class TrainersResolver {
  constructor(private readonly trainersService: TrainersService) {}

  @Query(() => PaginatedTrainer, {
    name: "trainers",
    description: "Список тренеров постранично",
    complexity: paginatedComplexity,
  })
  findAll(@Args() pagination: PaginationArgs) {
    return this.trainersService.findAllPaginated(pagination.page, pagination.limit);
  }

  @Query(() => TrainerType, { name: "trainer", description: "Тренер по идентификатору" })
  findOne(@Args("id", { type: () => ID }) id: string) {
    return this.trainersService.findOne(id);
  }

  @Mutation(() => TrainerType, { description: "Добавить нового тренера" })
  createTrainer(@Args("input") input: CreateTrainerInput) {
    return this.trainersService.create(input);
  }

  @Mutation(() => TrainerType, { description: "Изменить данные тренера" })
  updateTrainer(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateTrainerInput,
  ) {
    return this.trainersService.update(id, input);
  }

  @Mutation(() => TrainerType, { description: "Удалить тренера" })
  removeTrainer(@Args("id", { type: () => ID }) id: string) {
    return this.trainersService.remove(id);
  }
}
