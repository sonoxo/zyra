import { FastifyInstance } from 'fastify';
declare function botDetectionPlugin(fastify: FastifyInstance): Promise<void>;
export declare function recordFailedAttempt(ip: string): boolean;
export declare function clearFailedAttempts(ip: string): void;
declare const _default: typeof botDetectionPlugin;
export default _default;
