export interface Subscription {
    id: string;
    plan: 'FREE' | 'PRO' | 'ENTERPRISE';
    status: 'active' | 'canceled' | 'past_due';
    currentPeriodEnd: Date;
}
export interface Invoice {
    id: string;
    amount: number;
    currency: string;
    status: 'paid' | 'open' | 'void';
    paidAt?: Date;
}
export declare function getPlanPrice(plan: string): number;
export declare function isFeatureIncluded(plan: string, feature: string): boolean;
export declare function getPlanLimits(plan: string): {
    scansPerMonth: number;
    assets: number;
    teamMembers: number;
    apiCallsPerDay: number;
};
export declare function canUpgradePlan(currentPlan: string, newPlan: string): boolean;
