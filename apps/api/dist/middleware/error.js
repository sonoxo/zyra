import { ZodError } from 'zod';
export function errorMiddleware(fastify) {
    fastify.setErrorHandler(async (error, request, reply) => {
        // Log error
        fastify.log.error(error);
        // Zod validation errors
        if (error instanceof ZodError) {
            const issues = error.errors || error.issues;
            return reply.status(400).send({
                success: false,
                error: 'Validation failed',
                details: (Array.isArray(issues) ? issues : []).map((e) => ({
                    path: e.path?.join('.') || '',
                    message: e.message,
                })),
            });
        }
        // Fastify validation errors (query params, body schema)
        if (error.validation) {
            return reply.status(400).send({
                success: false,
                error: 'Validation failed',
                details: error.validation,
            });
        }
        // JWT errors
        if (error.name === 'JsonWebTokenError') {
            return reply.status(401).send({
                success: false,
                error: 'Invalid token',
            });
        }
        if (error.name === 'TokenExpiredError') {
            return reply.status(401).send({
                success: false,
                error: 'Token expired',
            });
        }
        // Default 500
        const message = error.statusCode ? error.message : 'Internal server error';
        const statusCode = error.statusCode || 500;
        return reply.status(statusCode).send({
            success: false,
            error: message,
        });
    });
}
