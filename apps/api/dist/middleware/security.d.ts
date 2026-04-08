import type { FastifyInstance } from 'fastify';
export declare function securityHeaders(fastify: FastifyInstance): void;
export declare function sanitizeInput(input: any): any;
export declare function rateLimitMiddleware(fastify: FastifyInstance): void;
