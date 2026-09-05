import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { paginatedComplexity } from "../graphql/complexity";
import { Paginated } from "../graphql/paginated.type";
import { PaginationArgs } from "../graphql/pagination.args";
import { UserType } from "../users/graphql/user.type";
import { CreateMembershipInput } from "./graphql/create-membership.input";
import { toMembershipType } from "./graphql/membership.mapper";
import { MembershipType } from "./graphql/membership.type";
import { UpdateMembershipInput } from "./graphql/update-membership.input";
import { MembershipsService } from "./memberships.service";

const PaginatedMembership = Paginated(MembershipType);
const PaginatedUser = Paginated(UserType);

@Resolver(() => MembershipType)
export class MembershipsResolver {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Query(() => PaginatedMembership, {
    name: "memberships",
    description: "Список абонементов постранично",
    complexity: paginatedComplexity,
  })
  async findAll(@Args() pagination: PaginationArgs) {
    const result = await this.membershipsService.findAllPaginated(
      pagination.page,
      pagination.limit,
    );

    return { ...result, items: result.items.map(toMembershipType) };
  }

  @Query(() => MembershipType, { name: "membership", description: "Абонемент по идентификатору" })
  async findOne(@Args("id", { type: () => ID }) id: string) {
    return toMembershipType(await this.membershipsService.findOne(id));
  }

  @ResolveField(() => PaginatedUser, {
    description: "Участники, у которых сейчас оформлен этот абонемент",
    complexity: paginatedComplexity,
  })
  users(@Parent() membership: MembershipType, @Args() pagination: PaginationArgs) {
    return this.membershipsService.findUsersPaginated(
      membership.id,
      pagination.page,
      pagination.limit,
    );
  }

  @Mutation(() => MembershipType, { description: "Добавить новый абонемент" })
  async createMembership(@Args("input") input: CreateMembershipInput) {
    return toMembershipType(await this.membershipsService.create(input));
  }

  @Mutation(() => MembershipType, { description: "Изменить данные абонемента" })
  async updateMembership(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateMembershipInput,
  ) {
    return toMembershipType(await this.membershipsService.update(id, input));
  }

  @Mutation(() => MembershipType, { description: "Удалить абонемент" })
  async removeMembership(@Args("id", { type: () => ID }) id: string) {
    return toMembershipType(await this.membershipsService.remove(id));
  }
}
