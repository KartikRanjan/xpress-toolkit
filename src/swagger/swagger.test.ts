import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { describe, it, expect } from 'vitest';
import { createOpenApiRegistry } from './index.js';
import { z } from 'zod';

describe('Swagger Integration', () => {
    it('should generate an OpenAPI path with schema-backed request and response shapes', () => {
        const registry = createOpenApiRegistry({ title: 'Test API', version: '1.0.0' });

        const UserSchema = z
            .object({
                id: z.string(),
                name: z.string(),
            })
            .openapi('User');
        const ParamsSchema = z.object({
            id: z.string(),
        });
        const QuerySchema = z.object({
            verbose: z.boolean().optional(),
        });

        registry.registerSchema('User', UserSchema);

        registry.registerRoute({
            method: 'get',
            path: '/users/{id}',
            summary: 'Get a user',
            request: {
                params: ParamsSchema,
                query: QuerySchema,
            },
            responses: {
                200: {
                    description: 'A user',
                    body: UserSchema,
                },
            },
        });

        const document = new OpenApiGeneratorV3(
            registry.getRegistry().definitions,
        ).generateDocument({
            openapi: '3.0.0',
            info: {
                title: 'Test API',
                version: '1.0.0',
            },
        });

        expect(document.paths['/users/{id}'].get).toMatchObject({
            summary: 'Get a user',
            responses: {
                200: {
                    description: 'A user',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/User',
                            },
                        },
                    },
                },
            },
        });
        expect(document.paths['/users/{id}'].get?.parameters).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'id',
                    in: 'path',
                    required: true,
                }),
                expect.objectContaining({
                    name: 'verbose',
                    in: 'query',
                }),
            ]),
        );
        expect(document.components?.schemas?.User).toEqual({
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
            },
            required: ['id', 'name'],
        });
    });

    it('should keep registry state isolated across instances', () => {
        const registryA = createOpenApiRegistry({ title: 'API A', version: '1.0.0' });
        const registryB = createOpenApiRegistry({ title: 'API B', version: '1.0.0' });

        registryA.registerSchema(
            'OnlyInA',
            z
                .object({
                    id: z.string(),
                })
                .openapi('OnlyInA'),
        );

        const documentA = new OpenApiGeneratorV3(
            registryA.getRegistry().definitions,
        ).generateDocument({
            openapi: '3.0.0',
            info: { title: 'API A', version: '1.0.0' },
        });
        const documentB = new OpenApiGeneratorV3(
            registryB.getRegistry().definitions,
        ).generateDocument({
            openapi: '3.0.0',
            info: { title: 'API B', version: '1.0.0' },
        });

        expect(documentA.components?.schemas?.OnlyInA).toBeDefined();
        expect(documentB.components?.schemas?.OnlyInA).toBeUndefined();
    });

    it('should automatically register security scheme and apply to routes with authenticate: true', () => {
        const registry = createOpenApiRegistry({
            title: 'Auth API',
            version: '1.0.0',
            auth: {
                name: 'bearerAuth',
                scheme: { type: 'http', scheme: 'bearer' },
            },
        });

        registry.registerRoute({
            method: 'get',
            path: '/protected',
            authenticate: true,
            responses: {
                200: {
                    description: 'OK',
                },
            },
        });

        const document = new OpenApiGeneratorV3(
            registry.getRegistry().definitions,
        ).generateDocument({
            openapi: '3.0.0',
            info: { title: 'Auth API', version: '1.0.0' },
        });

        // Check if security scheme is registered
        expect(document.components?.securitySchemes?.bearerAuth).toEqual({
            type: 'http',
            scheme: 'bearer',
        });

        // Check if route has security requirement
        expect(document.paths['/protected'].get?.security).toContainEqual({
            bearerAuth: [],
        });
    });

    it('should allow custom security scheme names in routes', () => {
        const registry = createOpenApiRegistry({
            title: 'Custom Auth API',
            version: '1.0.0',
        });

        registry.registerSecurityScheme('customAuth', {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-KEY',
        });

        registry.registerRoute({
            method: 'get',
            path: '/custom-protected',
            authenticate: 'customAuth',
            responses: { 200: { description: 'OK' } },
        });

        const document = new OpenApiGeneratorV3(
            registry.getRegistry().definitions,
        ).generateDocument({
            openapi: '3.0.0',
            info: { title: 'Custom Auth API', version: '1.0.0' },
        });

        expect(document.paths['/custom-protected'].get?.security).toContainEqual({
            customAuth: [],
        });
    });

    it('should provide access to options via getOptions', () => {
        const options = {
            title: 'Options API',
            version: '2.0.0',
            auth: {
                name: 'jwt',
                scheme: { type: 'http', scheme: 'bearer' } as const,
                autoRefresh: { endpoint: '/refresh', tokenPath: 'token' },
            },
        };
        const registry = createOpenApiRegistry(options);

        expect(registry.getOptions()).toEqual(options);
    });
});
