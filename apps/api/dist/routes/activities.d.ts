import type { FastifyInstance } from 'fastify';
interface ActivityData {
    action: string;
    entityType: string;
    entityId?: string;
    description?: string;
    metadata?: any;
    orgId: string;
    userId: string;
}
export declare function logActivity(prisma: any, data: ActivityData): Promise<any>;
export default function activityRoutes(fastify: FastifyInstance): Promise<void>;
export {};
