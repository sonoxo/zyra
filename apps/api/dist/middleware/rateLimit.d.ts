import type { FastifyRequest, FastifyReply } from 'fastify';
export declare function rateLimit(options?: {
    limit?: number;
    windowMs?: number;
}): (req: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
