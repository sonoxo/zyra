import { FastifyInstance, FastifyReply } from 'fastify';
interface TurnstileOptions {
    secretKeyEnvVar?: string;
}
declare function turnstilePlugin(fastify: FastifyInstance, opts: TurnstileOptions): Promise<void>;
declare module 'fastify' {
    interface FastifyInstance {
        verifyTurnstile: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
declare const _default: typeof turnstilePlugin;
export default _default;
