import type { NextFunction } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';
import { globalErrorHandler } from './globalErrorHandler.js';
import { validateRequest } from './validateRequest.js';

function createRequest(overrides: Partial<Record<string, unknown>> = {}) {
    const headers = (overrides.headers as Record<string, string> | undefined) ?? {};

    return {
        body: overrides.body ?? {},
        query: overrides.query ?? {},
        params: overrides.params ?? {},
        headers,
        path: (overrides.path as string | undefined) ?? '/test',
        get(name: string) {
            return headers[name.toLowerCase()];
        },
    };
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

describe('validateRequest', () => {
    it('should attach parsed data to req.validated without mutating req by default', () => {
        const middleware = validateRequest({
            params: z.object({ id: z.coerce.number().int() }),
            query: z.object({ page: z.coerce.number().int() }),
            body: z.object({
                name: z.string().transform((value) => value.toUpperCase()),
            }),
            headers: z.object({
                'x-trace-id': z.string().min(1),
            }),
        });
        const req = createRequest({
            params: { id: '42' },
            query: { page: '2' },
            body: { name: 'alice' },
            headers: { 'x-trace-id': 'trace-123' },
        });
        const next = vi.fn();

        middleware(req as never, {} as never, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.params).toEqual({ id: '42' });
        expect(req.query).toEqual({ page: '2' });
        expect(req.body).toEqual({ name: 'alice' });
        expect((req as typeof req & { validated: unknown }).validated).toEqual({
            params: { id: 42 },
            query: { page: 2 },
            body: { name: 'ALICE' },
            headers: { 'x-trace-id': 'trace-123' },
        });
    });

    it('should mutate params, query, and body in mutate mode while keeping validated headers', () => {
        const middleware = validateRequest(
            {
                params: z.object({ id: z.coerce.number().int() }),
                query: z.object({ page: z.coerce.number().int() }),
                body: z.object({
                    active: z.coerce.boolean(),
                }),
                headers: z.object({
                    'x-role': z.enum(['admin']),
                }),
            },
            { mode: 'mutate' },
        );
        const req = createRequest({
            params: { id: '42' },
            query: { page: '2' },
            body: { active: 'true' },
            headers: { 'x-role': 'admin' },
        });
        const next = vi.fn();

        middleware(req as never, {} as never, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.params).toEqual({ id: 42 });
        expect(req.query).toEqual({ page: 2 });
        expect(req.body).toEqual({ active: true });
        expect(req.get('x-role')).toBe('admin');
        expect((req as typeof req & { validated: unknown }).validated).toEqual({
            params: undefined,
            query: undefined,
            body: undefined,
            headers: { 'x-role': 'admin' },
        });
    });

    it('should forward structured validation errors to the global error handler', () => {
        const middleware = validateRequest({
            body: z.object({
                users: z.array(
                    z.object({
                        email: z.email(),
                    }),
                ),
            }),
        });
        const req = createRequest({
            body: {
                users: [{ email: 'not-an-email' }],
            },
            path: '/users',
        });
        const next = vi.fn();

        middleware(req as never, {} as never, next);

        const error = (next.mock.calls as unknown[][])[0]?.[0];
        expect(error).toBeInstanceOf(ValidationError);

        const res = createResponse();
        const errorNext: NextFunction = () => undefined;
        globalErrorHandler()(error, req as never, res as never, errorNext);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            success: false,
            message: 'Validation failed',
            errorCode: 'VALIDATION_ERROR',
            errors: [
                {
                    path: 'body.users.0.email',
                    message: 'Invalid email address',
                    code: 'invalid_format',
                },
            ],
            timestamp: expect.any(String) as string,
        });
    });
});
