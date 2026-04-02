export interface WebhookPayload {
    event: string;
    timestamp: string;
    data: any;
}
export declare function triggerWebhook(orgId: string, event: string, data: any): Promise<void>;
