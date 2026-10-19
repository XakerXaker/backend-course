import { ComplexityEstimatorArgs } from "graphql-query-complexity";

export const MAX_QUERY_COMPLEXITY = 1000;

export function paginatedComplexity({ args, childComplexity }: ComplexityEstimatorArgs): number {
  const limit = typeof args.limit === "number" ? args.limit : 10;

  return limit * Math.max(1, childComplexity);
}
