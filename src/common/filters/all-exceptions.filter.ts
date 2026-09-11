import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { GqlContextType } from "@nestjs/graphql";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("AllExceptionsFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    // GraphQL-запросы не имеют host.switchToHttp().getRequest()/getResponse()
    // в привычном REST-виде (originalUrl и т.п.) — здесь просто пробрасываем
    // исключение дальше, и Apollo Server сам оформит его в поле errors
    // GraphQL-ответа.
    if (host.getType<GqlContextType>() === "graphql") {
      throw exception;
    }

    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const { statusCode, message } = this.resolveError(exception);

    const payload = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    };

    if (this.isApiRequest(request)) {
      response.status(statusCode).json(payload);
      return;
    }

    response.status(statusCode).render("error", {
      title: `Ошибка ${statusCode}`,
      activePage: "",
      message: Array.isArray(message) ? message.join(", ") : message,
      statusCode,
    });
  }

  private isApiRequest(request: Request): boolean {
    // "/auth" — тоже JSON-эндпоинты (генерирует SuperTokens SDK, см.
    // AuthModule); их дёргает fetch с клиента (public/js/auth-forms.js),
    // а не браузерная навигация, поэтому им тоже нужен JSON-ответ, а не
    // HTML-страница ошибки.
    return request.originalUrl.startsWith("/api") || request.originalUrl.startsWith("/auth");
  }

  private resolveError(exception: unknown): {
    statusCode: number;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === "string") {
        return { statusCode, message: response };
      }

      if (
        typeof response === "object" &&
        response !== null &&
        "message" in response
      ) {
        const message = (response as { message: string | string[] }).message;
        return { statusCode, message };
      }

      return { statusCode, message: exception.message };
    }

    if (exception instanceof PrismaClientKnownRequestError) {
      // Без этого лога в терминале сервера не видно НИЧЕГО, кроме общего
      // "Ошибка уровня базы данных" в ответе клиенту — а именно код и meta
      // от Prisma (P2021 "таблица не существует", P2022 "нет колонки" и
      // т.п.) чаще всего сразу указывают на непримененную миграцию.
      this.logger.error(
        `Prisma error ${exception.code} on ${exception.message}`,
        JSON.stringify(exception.meta),
      );

      if (exception.code === "P2025") {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: "Запрашиваемая сущность не найдена",
        };
      }

      if (exception.code === "P2002") {
        const target = (exception.meta?.target as string[] | undefined)?.join(", ");
        return {
          statusCode: HttpStatus.CONFLICT,
          message: target
            ? `Значение поля "${target}" уже занято`
            : "Нарушено ограничение уникальности",
        };
      }

      if (exception.code === "P2003") {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: "Указана несуществующая связанная сущность",
        };
      }

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Ошибка уровня базы данных",
      };
    }

    // Всё, что не HttpException и не известная ошибка Prisma — печатаем в
    // лог сервера целиком со стеком, иначе клиент видит только "Внутренняя
    // ошибка сервера" без единой зацепки, что реально сломалось.
    this.logger.error("Unhandled exception", (exception as Error)?.stack ?? exception);

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Внутренняя ошибка сервера",
    };
  }
}
