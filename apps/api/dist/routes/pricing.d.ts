import type { FastifyInstance } from 'fastify';
export declare const PLANS: {
    FREE: {
        id: string;
        name: string;
        price: number;
        priceId: null;
        features: {
            scans: number;
            assets: number;
            users: number;
            prioritySupport: boolean;
        };
    };
    PRO: {
        id: string;
        name: string;
        price: number;
        priceId: string;
        features: {
            scans: number;
            assets: number;
            users: number;
            prioritySupport: boolean;
        };
    };
    ENTERPRISE: {
        id: string;
        name: string;
        price: number;
        priceId: string;
        features: {
            scans: number;
            assets: number;
            users: number;
            prioritySupport: boolean;
        };
    };
};
export default function pricingRoutes(fastify: FastifyInstance): Promise<void>;
