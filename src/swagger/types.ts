import type { ZodObject, ZodRawShape, ZodType } from 'zod';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { SecuritySchemeObject } from 'openapi3-ts/oas30';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

export interface RouteDoc {
    method: HttpMethod;
    path: string;
    summary?: string;
    description?: string;
    tags?: string[];
    authenticate?: boolean | string;
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

export interface CreateRegistryOptions {
    title: string;
    version: string;
    auth?: {
        name: string;
        scheme: SecuritySchemeObject;
        autoRefresh?: {
            endpoint: string;
            tokenPath: string;
        };
    };
}

export interface OpenApiRegistry {
    registerSchema(name: string, schema: ZodType): void;
    registerSecurityScheme(name: string, scheme: SecuritySchemeObject): void;
    registerRoute(route: RouteDoc): void;
    getRegistry(): OpenAPIRegistry;
    getOptions(): CreateRegistryOptions;
}
