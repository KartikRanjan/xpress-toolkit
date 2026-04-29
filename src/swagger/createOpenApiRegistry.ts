import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { CreateRegistryOptions, OpenApiRegistry, RouteDoc } from './types.js';
import type { ZodType } from 'zod';
import type { SecuritySchemeObject } from 'openapi3-ts/oas30';

export function createOpenApiRegistry(options: CreateRegistryOptions): OpenApiRegistry {
    const registry = new OpenAPIRegistry();

    // Automatically register the security scheme if provided in options
    if (options.auth) {
        registry.registerComponent('securitySchemes', options.auth.name, options.auth.scheme);
    }

    return {
        registerSchema(name: string, schema: ZodType) {
            registry.register(name, schema);
        },

        registerSecurityScheme(name: string, scheme: SecuritySchemeObject) {
            registry.registerComponent('securitySchemes', name, scheme);
        },

        registerRoute(route: RouteDoc) {
            const security = route.authenticate
                ? [
                      {
                          [typeof route.authenticate === 'string'
                              ? route.authenticate
                              : (options.auth?.name ?? 'bearerAuth')]: [],
                      },
                  ]
                : undefined;

            registry.registerPath({
                method: route.method,
                path: route.path,
                summary: route.summary,
                description: route.description,
                tags: route.tags,
                security,
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

        getOptions() {
            return options;
        },
    };
}
