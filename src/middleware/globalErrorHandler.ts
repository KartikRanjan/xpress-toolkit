import type { ErrorRequestHandler, Request } from 'express';
import { AppError } from '../errors/AppError.js';
import type { Logger } from '../logging/types.js';

export interface GlobalErrorHandlerOptions {
    logger?: Logger;
    includeStack?: boolean;
    onError?: (error: unknown, req: Request) => void;
}

export function globalErrorHandler(options?: GlobalErrorHandlerOptions): ErrorRequestHandler {
    return (err: unknown, req, res, _next) => {
        const isAppError = err instanceof AppError;
        const statusCode = isAppError ? err.statusCode : 500;
        const code = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
        const message = isAppError ? err.message : 'Internal Server Error';
        const details = isAppError && err.expose ? err.details : null;
        let errors: unknown[] = [];

        if (details) {
            if (
                typeof details === 'object' &&
                'fields' in details &&
                Array.isArray((details as { fields: unknown[] }).fields)
            ) {
                errors = (details as { fields: unknown[] }).fields;
            } else if (Array.isArray(details)) {
                errors = details;
            } else {
                errors = [details];
            }
        }

        if (options?.onError) {
            options.onError(err, req);
        }

        if (options?.logger) {
            options.logger.error({ err, path: req.path }, message);
        } else if (statusCode === 500) {
            // Fallback console error for unhandled 500s
            console.error(err);
        }

        res.status(statusCode).json({
            success: false,
            message,
            errorCode: code,
            errors,
            timestamp: new Date().toISOString(),
            ...(options?.includeStack && err instanceof Error && { stack: err.stack }),
        });
    };
}
