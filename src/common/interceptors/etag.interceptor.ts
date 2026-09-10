import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { RENDER_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { createHash } from "crypto";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

// Кэширование на клиенте: перехватчик считает ETag (SHA-1 от тела ответа) и
// проставляет его заголовком `ETag`. Дальше всю работу делает сам Express:
// его `res.json()`/`res.send()` сравнивает заголовок `If-None-Match`
// входящего запроса со свежевыставленным `ETag` (модуль `fresh`) и, если
// они совпали, сам подменяет ответ на `304 Not Modified` без тела — отдельно
// перехватывать и обрывать поток здесь не нужно.
//
// `Cache-Control` для конкретных ресурсов проставляется декоратором
// `@Header('Cache-Control', ...)` прямо в *.api.controller.ts — это и есть
// вторая часть механизма (клиент не обращается к серверу заново, пока не
// истёк `max-age`, а после истечения — присылает `If-None-Match` и рискует
// получить пустой 304 вместо полного тела).
@Injectable()
export class EtagInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    if (request.method !== "GET") {
      return next.handle();
    }

    const isRenderedView = !!this.reflector.get<string>(
      RENDER_METADATA,
      context.getHandler(),
    );

    if (isRenderedView) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap((data) => {
        if (data === undefined) {
          return;
        }

        const etag = createHash("sha1")
          .update(JSON.stringify(data))
          .digest("hex");

        response.setHeader("ETag", `"${etag}"`);
      }),
    );
  }
}
