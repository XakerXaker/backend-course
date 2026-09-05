import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { paginatedComplexity } from "../graphql/complexity";
import { Paginated } from "../graphql/paginated.type";
import { PaginationArgs } from "../graphql/pagination.args";
import { UserType } from "../users/graphql/user.type";
import { UsersService } from "../users/users.service";
import { CreateReviewInput } from "./graphql/create-review.input";
import { ReviewType } from "./graphql/review.type";
import { UpdateReviewInput } from "./graphql/update-review.input";
import { ReviewsService } from "./reviews.service";

const PaginatedReview = Paginated(ReviewType);

@Resolver(() => ReviewType)
export class ReviewsResolver {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly usersService: UsersService,
  ) {}

  @Query(() => PaginatedReview, {
    name: "reviews",
    description: "Список отзывов постранично",
    complexity: paginatedComplexity,
  })
  findAll(@Args() pagination: PaginationArgs) {
    return this.reviewsService.findAllPaginated(pagination.page, pagination.limit);
  }

  @Query(() => ReviewType, { name: "review", description: "Отзыв по идентификатору" })
  findOne(@Args("id", { type: () => ID }) id: string) {
    return this.reviewsService.findOne(id);
  }

  // Вложенная сущность через field resolver: автор загружается отдельным
  // запросом через UsersService только тогда, когда клиент реально
  // запросил поле author, а не всегда вместе с отзывом.
  @ResolveField(() => UserType, { nullable: true, description: "Зарегистрированный автор отзыва" })
  author(@Parent() review: ReviewType) {
    if (!review.authorId) {
      return null;
    }

    return this.usersService.findOne(review.authorId);
  }

  @Mutation(() => ReviewType, { description: "Добавить новый отзыв" })
  createReview(@Args("input") input: CreateReviewInput) {
    return this.reviewsService.create(input);
  }

  @Mutation(() => ReviewType, { description: "Изменить отзыв" })
  updateReview(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateReviewInput,
  ) {
    return this.reviewsService.update(id, input);
  }

  @Mutation(() => ReviewType, { description: "Удалить отзыв" })
  removeReview(@Args("id", { type: () => ID }) id: string) {
    return this.reviewsService.remove(id);
  }
}
