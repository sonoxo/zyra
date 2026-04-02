import type { FastifyInstance } from 'fastify';
export declare function logAudit(action: string, entityType: string, entityId?: string, userId?: string, orgId?: string, details?: any, ipAddress?: string, userAgent?: string): Promise<void>;
export default function auditRoutes(fastify: FastifyInstance): Promise<void>;
