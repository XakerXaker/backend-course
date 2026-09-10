import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { toMembershipType } from "../memberships/graphql/membership.mapper";
import { MembershipType } from "../memberships/graphql/membership.type";
import { MembershipsService } from "../memberships/memberships.service";
import { paginatedComplexity } from "../graphql/complexity";
import { Paginated } from "../graphql/paginated.type";
import { PaginationArgs } from "../graphql/pagination.args";
import { ReviewType } from "../reviews/graphql/review.type";
import { CreateUserInput } from "./graphql/create-user.input";
import { UpdateUserInput } from "./graphql/update-user.input";
import { UserType } from "./graphql/user.type";
import { UsersService } from "./users.service";

const PaginatedUser = Paginated(UserType);
const PaginatedReview = Paginated(ReviewType);

@Resolver(() => UserType)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly membershipsService: MembershipsService,
  ) {}

  @Query(() => PaginatedUser, {
    name: "users",
    description: "Список участников постранично",
    complexity: paginatedComplexity,
  })
  findAll(@Args() pagination: PaginationArgs) {
    return this.usersService.findAllPaginated(pagination.page, pagination.limit);
  }

  @Query(() => UserType, { name: "user", description: "Участник по идентификатору" })
  findOne(@Args("id", { type: () => ID }) id: string) {
    return this.usersService.findOne(id);
  }

  // Вложенная сущность через field resolver: текущий абонемент запрашивается
  // отдельно через MembershipsService, только когда клиент попросил поле
  // membership, а не всегда вместе с участником.
  @ResolveField(() => MembershipType, {
    nullable: true,
    description: "Текущий абонемент участника",
  })
  async membership(@Parent() user: UserType) {
    if (!user.membershipId) {
      return null;
    }

    return toMembershipType(await this.membershipsService.findOne(user.membershipId));
  }

  @ResolveField(() => PaginatedReview, {
    description: "Отзывы, оставленные этим участником",
    complexity: paginatedComplexity,
  })
  reviews(@Parent() user: UserType, @Args() pagination: PaginationArgs) {
    return this.usersService.findReviewsPaginated(user.id, pagination.page, pagination.limit);
  }

  @Mutation(() => UserType, { description: "Зарегистрировать нового участника" })
  createUser(@Args("input") input: CreateUserInput) {
    return this.usersService.create(input);
  }

  @Mutation(() => UserType, { description: "Изменить профиль участника" })
  updateUser(@Args("id", { type: () => ID }) id: string, @Args("input") input: UpdateUserInput) {
    return this.usersService.update(id, input);
  }

  @Mutation(() => UserType, { description: "Удалить участника" })
  removeUser(@Args("id", { type: () => ID }) id: string) {
    return this.usersService.remove(id);
  }

  @Mutation(() => UserType, { description: "Сменить пароль участника" })
  changeUserPassword(
    @Args("id", { type: () => ID }) id: string,
    @Args("newPassword") newPassword: string,
  ) {
    return this.usersService.changePassword(id, newPassword);
  }

  @Mutation(() => UserType, { description: "Оформить абонемент участнику" })
  assignMembership(
    @Args("userId", { type: () => ID }) userId: string,
    @Args("membershipId", { type: () => ID }) membershipId: string,
  ) {
    return this.usersService.assignMembership(userId, membershipId);
  }

  @Mutation(() => UserType, { description: "Отменить текущий абонемент участника" })
  cancelMembership(@Args("userId", { type: () => ID }) userId: string) {
    return this.usersService.cancelMembership(userId);
  }
}
