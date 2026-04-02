import type { FastifyRequest, FastifyReply } from 'fastify';
export interface AuthUser {
    id: string;
    email: string;
    role: string;
    name?: string;
    orgId?: string;
}
declare module 'fastify' {
    interface FastifyRequest {
        user?: AuthUser;
    }
}
export declare function authMiddleware(req: FastifyRequest, reply: FastifyReply): Promise<undefined>;
export declare function requireRole(...roles: string[]): (req: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
