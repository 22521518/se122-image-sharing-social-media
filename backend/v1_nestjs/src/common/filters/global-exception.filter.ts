import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const errorMessage =
      typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? (exceptionResponse as any).message
        : exceptionResponse;

    const errorBody = {
      code:
        exception instanceof HttpException
          ? exception.constructor.name.replace('Exception', '').toUpperCase()
          : 'INTERNAL_ERROR',
      message: errorMessage,
      path: request.url,
    };

    this.logger.error(
      `Error ${status} at ${request.url}: ${JSON.stringify(errorBody)}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      success: false,
      error: errorBody,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
}
