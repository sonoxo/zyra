export interface ScanResult {
    id: string;
    targetUrl: string;
    type: string;
    status: string;
    score: number;
    riskLevel: string;
    summary: string;
    findings: Array<{
        severity: string;
        title: string;
        description: string;
        cve?: string;
    }>;
    completedAt: string;
}
export declare function storeScan(scan: ScanResult): void;
export declare function getScan(id: string): ScanResult | undefined;
export declare function generateScanId(): string;
