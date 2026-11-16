import type { NextFunction, Request, Response } from 'express';

export function sendError(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({
    error: { code, message, ...(details !== undefined && { details }) },
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  return sendError(res, 404, 'ROUTE_NOT_FOUND', 'Route not found');
}

// body-parser (malformed JSON, oversized body) and other http-errors carry a status of their own.
interface HttpError {
  status: number;
  type?: string;
}

function isHttpError(error: unknown): error is HttpError {
  const status = (error as HttpError | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (isHttpError(error)) {
    switch (error.type) {
      case 'entity.parse.failed':
        return sendError(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
      case 'entity.too.large':
        return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
      default:
        return sendError(res, error.status, 'BAD_REQUEST', 'The request could not be processed');
    }
  }

  console.error(error);
  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Unexpected server error');
}
