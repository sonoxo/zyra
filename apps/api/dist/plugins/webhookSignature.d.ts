import { FastifyInstance, FastifyReply } from 'fastify';
interface WebhookSignatureOptions {
    headerName?: string;
    signatureAlgorithm?: 'sha256' | 'sha384' | 'sha512';
    secretEnvVar?: string;
}
declare function webhookSignaturePlugin(fastify: FastifyInstance, opts: WebhookSignatureOptions): Promise<void>;
declare module 'fastify' {
    interface FastifyInstance {
        verifyWebhookSignature: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
declare const _default: typeof webhookSignaturePlugin;
export default _default;
export declare const WEBHOOK_SIGNATURE_HEADER = "x-webhook-signature";
