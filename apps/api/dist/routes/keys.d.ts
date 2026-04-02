import type { FastifyInstance } from 'fastify';
export default function apiKeyRoutes(fastify: FastifyInstance): Promise<void>;
export declare function verifyApiKey(fastify: FastifyInstance): Promise<void>;
