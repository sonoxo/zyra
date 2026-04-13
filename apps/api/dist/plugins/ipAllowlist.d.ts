import { FastifyInstance } from 'fastify';
declare module 'fastify' {
    interface FastifyRequest {
        clientIp?: string;
    }
}
declare function ipAllowlistPlugin(fastify: FastifyInstance): Promise<void>;
declare const _default: typeof ipAllowlistPlugin;
export default _default;
