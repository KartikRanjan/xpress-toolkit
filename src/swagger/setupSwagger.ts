import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import type { OpenApiRegistry } from './types.js';

export interface SetupSwaggerOptions {
    registry: OpenApiRegistry;
    path?: string;
    title: string;
    version: string;
}

export function setupSwagger(app: Express, options: SetupSwaggerOptions) {
    const { registry, path = '/api-docs', title, version } = options;
    const registryOptions = registry.getOptions();
    const authConfig = registryOptions.auth;

    const generator = new OpenApiGeneratorV3(registry.getRegistry().definitions);
    const document = generator.generateDocument({
        openapi: '3.0.0',
        info: {
            title,
            version,
        },
    });

    const swaggerOptions: Record<string, unknown> = {
        persistAuthorization: true,
    };

    if (authConfig?.autoRefresh) {
        // We use a string for the function to ensure it's passed correctly to the browser
        swaggerOptions.responseInterceptor = `(res) => {
            if (res.status === 401 && !res.url.includes('${authConfig.autoRefresh.endpoint}')) {
                fetch('${authConfig.autoRefresh.endpoint}', { method: 'POST' })
                    .then(r => r.json())
                    .then(data => {
                        const token = ${authConfig.autoRefresh.tokenPath.split('.').reduce((acc, part) => `${acc}?.['${part}']`, 'data')};
                        if (token && window.ui) {
                            window.ui.authActions.authorize({
                                '${authConfig.name}': {
                                    name: '${authConfig.name}',
                                    schema: ${JSON.stringify(authConfig.scheme)},
                                    value: token
                                }
                            });
                        }
                    })
                    .catch(err => console.error('Token refresh failed:', err));
            }
            return res;
        }`;
    }

    // Serve the raw JSON spec for tools like Orval (e.g., /api-docs.json)
    app.get(`${path}.json`, (_req, res) => {
        res.json(document);
    });

    app.use(path, swaggerUi.serve, swaggerUi.setup(document, { swaggerOptions }));
}
