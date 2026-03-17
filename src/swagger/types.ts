import type { ZodObject, ZodRawShape, ZodType } from 'zod';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

export interface RouteDoc {
    method: HttpMethod;
    path: string;
    summary?: string;
    description?: string;
    tags?: string[];
    request?: {
        body?: ZodType;
        query?: ZodObject<ZodRawShape>;
        params?: ZodObject<ZodRawShape>;
        headers?: ZodObject<ZodRawShape>;
    };
    responses: Record<
        number,
        {
            description: string;
            body?: ZodType;
        }
    >;
}

export interface OpenApiRegistry {
    registerSchema(name: string, schema: ZodType): void;
    registerRoute(route: RouteDoc): void;
    getRegistry(): OpenAPIRegistry;
}
