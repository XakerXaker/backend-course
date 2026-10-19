import { Request } from "express";

export function buildPaginationLinkHeader(
  request: Request,
  page: number,
  limit: number,
  totalPages: number,
): string | null {
  const links: string[] = [];

  if (page > 1) {
    links.push(`<${makePageUrl(request, page - 1, limit)}>; rel="prev"`);
  }

  if (page < totalPages) {
    links.push(`<${makePageUrl(request, page + 1, limit)}>; rel="next"`);
  }

  return links.length > 0 ? links.join(", ") : null;
}

function makePageUrl(request: Request, page: number, limit: number): string {
  const baseUrl = `${request.protocol}://${request.get("host")}${request.path}`;
  const url = new URL(baseUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  return url.toString();
}
