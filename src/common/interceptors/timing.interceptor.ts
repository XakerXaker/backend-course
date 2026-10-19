import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { RENDER_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("TimingInterceptor");

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const elapsedMs = Date.now() - startedAt;
        const handlerLabel = `${context.getClass().name}.${context.getHandler().name}`;
        this.logger.log(`${handlerLabel} — ${elapsedMs} ms`);

        if (context.getType<GqlContextType>() === "graphql") {
          const gqlContext = GqlExecutionContext.create(context);
          const response = gqlContext.getContext<{ res?: { setHeader?: Function } }>().res;
          response?.setHeader?.("X-Elapsed-Time", `${elapsedMs}`);
          return;
        }

        if (context.getType() !== "http") {
          return;
        }

        const isRenderedView = !!this.reflector.get<string>(
          RENDER_METADATA,
          context.getHandler(),
        );

        if (isRenderedView) {
          if (data && typeof data === "object") {
            (data as Record<string, unknown>).elapsedTimeMs = elapsedMs;
          }
          return;
        }

        const response = context.switchToHttp().getResponse();
        response.setHeader("X-Elapsed-Time", `${elapsedMs}`);
      }),
    );
  }
}
