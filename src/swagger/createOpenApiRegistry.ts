import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { OpenApiRegistry, RouteDoc } from './types.js';
import type { ZodType } from 'zod';

export interface CreateRegistryOptions {
    title: string;
    version: string;
}

export function createOpenApiRegistry(_options: CreateRegistryOptions): OpenApiRegistry {
    const registry = new OpenAPIRegistry();

    return {
        registerSchema(name: string, schema: ZodType) {
            registry.register(name, schema);
        },

        registerRoute(route: RouteDoc) {
            registry.registerPath({
                method: route.method,
                path: route.path,
                summary: route.summary,
                description: route.description,
                tags: route.tags,
                request: route.request
                    ? {
                          params: route.request.params,
                          query: route.request.query,
                          headers: route.request.headers,
                          body: route.request.body
                              ? {
                                    content: {
                                        'application/json': {
                                            schema: route.request.body,
                                        },
                                    },
                                }
                              : undefined,
                      }
                    : undefined,
                responses: Object.fromEntries(
                    Object.entries(route.responses).map(([status, res]) => [
                        status,
                        {
                            description: res.description,
                            content: res.body
                                ? {
                                      'application/json': {
                                          schema: res.body,
                                      },
                                  }
                                : undefined,
                        },
                    ]),
                ),
            });
        },

        getRegistry() {
            return registry;
        },
    };
}
