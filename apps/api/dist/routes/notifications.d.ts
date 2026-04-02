import type { FastifyInstance } from 'fastify';
export default function notificationRoutes(fastify: FastifyInstance): Promise<void>;
export declare function createNotification(prisma: any, userId: string, type: string, title: string, message?: string): Promise<any>;
