import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
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
    return request.originalUrl.startsWith("/api");
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
      if (exception.code === "P2025") {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: "Запрашиваемая сущность не найдена",
        };
      }

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Ошибка уровня базы данных",
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Внутренняя ошибка сервера",
    };
  }
}
