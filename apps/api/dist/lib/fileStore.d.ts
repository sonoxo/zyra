declare class FileStore<T extends {
    id: string;
}> {
    private model;
    private data;
    constructor(model: string, defaultData?: T[]);
    private save;
    findMany(): T[];
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
export declare const usersStore: FileStore<UserData>;
export declare const orgsStore: FileStore<OrgData>;
export declare function isDbAvailable(): boolean;
export declare function getDbStatus(): {
    type: string;
    status: string;
};
export {};
