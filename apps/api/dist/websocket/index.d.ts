import type { FastifyInstance } from 'fastify';
export declare function websocketRoutes(fastify: FastifyInstance): Promise<void>;
export declare function broadcast(type: string, payload: any): void;
export declare function sendToOrg(orgId: string, type: string, payload: any): void;
