# xpress-toolkit

A focused, TypeScript-first utility package for Express applications. This toolkit provides standardized building blocks for request validation, error modeling, logging, and OpenAPI/Swagger documentation without hiding Express itself.

## Features

- ✅ **Request Validation**: Type-safe validation for `body`, `query`, `params`, and `headers` using Zod.
- ✅ **Error Modeling**: Standardized `AppError` and `ValidationError` classes with a `globalErrorHandler`.
- ✅ **Structured Logging**: Minimalist, JSON-ready request logging using `pino`.
- ✅ **OpenAPI/Swagger**: Generate documentation directly from your Zod schemas.
- ✅ **Dual Build**: Supports both ESM and CommonJS.

---

## Installation

```bash
npm install xpress-toolkit zod
```

If you plan to use Swagger/OpenAPI features, install the optional peer dependencies:

```bash
npm install swagger-ui-express @asteasolutions/zod-to-openapi
```

---

## 1. Request Validation

Use the `validateRequest` middleware to ensure incoming data matches your Zod schemas. It automatically handles `ZodError` by throwing a `ValidationError`.

```typescript
import { validateRequest } from 'xpress-toolkit';
import { z } from 'zod';

const loginBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

app.post(
    '/login',
    validateRequest({ body: loginBodySchema }),
    (req, res) => {
        // By default, validated data is stored in `req.validated`
        const { email, password } = req.validated.body as z.infer<typeof loginBodySchema>;
        res.json({ success: true, email });
    }
);
```

**Mutation Mode**: You can optionally mutate the original request object (e.g., `req.body`, `req.query`, `req.params`) with the validated and transformed data.

```typescript
app.post(
    '/login',
    validateRequest({ body: loginBodySchema }, { mode: 'mutate' }),
    (req, res) => {
        // Now `req.body` contains the validated payload
        const { email, password } = req.body;
        res.json({ success: true, email });
    }
);
```

*Note: For TypeScript to recognize `req.validated`, import the types: `import 'xpress-toolkit/types/express';`*

---

## 2. Error Handling

Standardize your API responses using the built-in error classes and the `globalErrorHandler`.

```typescript
import { AppError, globalErrorHandler } from 'xpress-toolkit';

// Throw standard operational errors
app.get('/broken', (req, res) => {
    // message, statusCode, errorCode
    throw new AppError('Resource not found', 404, 'NOT_FOUND');
});

// Use the global error handler at the end of your middleware chain
app.use(globalErrorHandler({
    // Optional: Attach your logger to log errors automatically
    // logger: myLogger,
    // includeStack: process.env.NODE_ENV === 'development',
}));
```

The error response will look like this:

```json
{
    "success": false,
    "message": "Resource not found",
    "errorCode": "NOT_FOUND",
    "errors": [],
    "timestamp": "2026-03-17T18:00:00.000Z"
}
```

---

## 3. Logging

This toolkit includes structured logging built on `pino`. It automatically uses `pino-pretty` in development.

```typescript
import { createLogger, requestLogger } from 'xpress-toolkit';

// 1. Create a logger instance
const logger = createLogger({ level: 'info' });

// 2. Attach the request logger middleware
app.use(requestLogger({
    logger,
    logQuery: true, // Log URL queries (default: true)
    logBody: false, // Log request bodies (default: false, use with caution!)
    requestIdHeader: 'x-request-id', // Optional correlation ID
}));
```

---

## 4. Swagger / OpenAPI Integration

The toolkit provides a dedicated subpath (`/swagger`) for Swagger support to keep your production bundle lean.

### Initialize the Registry & Register Routes

Use your Zod schemas to define your API surface and documentation together.

```typescript
import { createOpenApiRegistry, setupSwagger } from 'xpress-toolkit/swagger';
import { z } from 'zod';
import express from 'express';

const app = express();
app.use(express.json());

// 1. Create a registry
const docs = createOpenApiRegistry({
    title: 'User Service API',
    version: '1.0.0',
});

const UserSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
});

// 2. Register a reusable schema (Optional)
docs.registerSchema('User', UserSchema);

// 3. Register a route
docs.registerRoute({
    method: 'post',
    path: '/users',
    summary: 'Create a new user',
    request: {
        body: UserSchema,
    },
    responses: {
        201: {
            description: 'User created successfully',
            body: UserSchema,
        },
    },
});

// 4. Setup Swagger UI Middleware
setupSwagger(app, {
    registry: docs,
    path: '/api-docs', // Swagger UI URL
    title: 'User Service API',
    version: '1.0.0',
});

app.listen(3000, () => {
    console.log('Docs available at http://localhost:3000/api-docs');
});
```

---

## Development

### Running Tests

```bash
npm test
```

### Running the Swagger Demo

```bash
npm run demo
```

## License

MIT
