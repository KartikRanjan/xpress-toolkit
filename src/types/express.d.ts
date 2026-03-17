import 'express';

declare global {
    namespace Express {
        interface Request {
            validated: {
                body: unknown;
                query: unknown;
                params: unknown;
                headers: unknown;
            };
        }
    }
}

// To allow the file to be treated as a module
export {};
