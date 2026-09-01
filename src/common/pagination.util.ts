import { Request } from "express";

// Общая для всех API-контроллеров реализация HATEOAS-навигации по
// страницам через заголовок Link (rel="prev"/"next") — RFC 8288.
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
  // request.baseUrl — это префикс монтирования суб-роутера и у контроллеров
  // Nest (зарегистрированных прямо на приложении, а не через app.use(...))
  // всегда пустая строка. Нужный путь — request.path (без query-строки).
  const baseUrl = `${request.protocol}://${request.get("host")}${request.path}`;
  const url = new URL(baseUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  return url.toString();
}
