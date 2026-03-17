import type { NextFunction } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../errors/AppError.js';
import type { Logger } from '../logging/types.js';
import { globalErrorHandler } from './globalErrorHandler.js';

function createMockLogger(): Logger {
    return {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
}

function createRequest(path: string) {
    return { path };
}

function createResponse() {
    return {
        statusCode: 200,
        body: undefined as unknown,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: unknown) {
            this.body = payload;
            return this;
        },
    };
}

describe('globalErrorHandler', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should expose operational AppError details and invoke hooks', () => {
        const logger = createMockLogger();
        const onError = vi.fn();
        const handler = globalErrorHandler({ logger, onError });
        const req = createRequest('/bad-request');
        const res = createResponse();
        const error = new AppError('Bad request', 400, 'BAD_REQUEST', { field: 'email' });
        const next: NextFunction = () => undefined;

        handler(error, req as never, res as never, next);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            success: false,
            message: 'Bad request',
            errorCode: 'BAD_REQUEST',
            errors: [{ field: 'email' }],
            timestamp: expect.any(String) as string,
        });
        expect(onError).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                path: '/bad-request',
                err: error,
            }),
            'Bad request',
        );
    });

    it('should mask unexpected errors and fall back to console.error for 500s', () => {
        const handler = globalErrorHandler();
        const req = createRequest('/crash');
        const res = createResponse();
        const error = new Error('Database connection leaked');
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const next: NextFunction = () => undefined;

        handler(error, req as never, res as never, next);

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            success: false,
            message: 'Internal Server Error',
            errorCode: 'INTERNAL_SERVER_ERROR',
            errors: [],
            timestamp: expect.any(String) as string,
        });
        expect(consoleError).toHaveBeenCalledTimes(1);
        expect(consoleError).toHaveBeenCalledWith(error);
    });

    it('should include stack traces only when explicitly requested', () => {
        const handler = globalErrorHandler({
            logger: createMockLogger(),
            includeStack: true,
        });
        const req = createRequest('/stack');
        const res = createResponse();
        const error = new Error('Boom');
        const next: NextFunction = () => undefined;

        handler(error, req as never, res as never, next);

        expect(res.statusCode).toBe(500);
        const body = res.body as { message: string; stack: string };
        expect(body.message).toBe('Internal Server Error');
        expect(body.stack).toContain('Error: Boom');
    });
});
