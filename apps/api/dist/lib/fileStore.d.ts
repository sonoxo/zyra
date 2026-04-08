declare class FileStore<T extends {
    id: string;
}> {
    private model;
    private data;
    constructor(model: string, defaultData?: T[]);
    private save;
    findMany(query?: (item: T) => boolean): T[];
    findUnique(where: {
        id: string;
    }): T | undefined;
    create(data: Omit<T, 'id'> & {
        id?: string;
    }): T;
    update(where: {
        id: string;
    }, data: Partial<T>): T | undefined;
    delete(where: {
        id: string;
    }): boolean;
    count(): number;
}
export interface UserData {
    id: string;
    email: string;
    name: string | null;
    password: string;
    role: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface OrgData {
    id: string;
    name: string;
    slug: string;
    plan: string;
    createdAt: string;
    updatedAt: string;
}
export interface AssetData {
    id: string;
    name: string;
    type: string;
    url: string | null;
    orgId: string;
    createdAt: string;
    updatedAt: string;
}
export interface ScanData {
    id: string;
    type: string;
    status: string;
    targetUrl: string | null;
    score: number | null;
    riskLevel: string | null;
    summary: string | null;
    orgId: string;
    assetId: string | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    updatedAt: string;
}
export declare const usersStore: FileStore<UserData>;
export declare const orgsStore: FileStore<OrgData>;
export declare const assetsStore: FileStore<AssetData>;
export declare const scansStore: FileStore<ScanData>;
export declare function isDbAvailable(): boolean;
export declare function getDbStatus(): {
    type: string;
    status: string;
};
export {};
