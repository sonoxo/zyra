// Simple JSON file-based storage - fallback when DB unavailable
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
function getFilePath(model) {
    return path.join(DATA_DIR, `${model}.json`);
}
function readJson(model, defaultValue) {
    try {
        const filePath = getFilePath(model);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (e) {
        console.error(`[Storage] Error reading ${model}:`, e);
    }
    return defaultValue;
}
function writeJson(model, data) {
    try {
        const filePath = getFilePath(model);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    catch (e) {
        console.error(`[Storage] Error writing ${model}:`, e);
    }
}
// In-memory cache with file persistence
class FileStore {
    model;
    data;
    constructor(model, defaultData = []) {
        this.model = model;
        this.data = readJson(model, defaultData);
    }
    save() {
        writeJson(this.model, this.data);
    }
    findMany() {
        return this.data;
    }
    findUnique(where) {
        return this.data.find(item => item.id === where.id);
    }
    create(data) {
        const item = { ...data, id: data.id || crypto.randomBytes(8).toString('hex') };
        this.data.push(item);
        this.save();
        return item;
    }
    update(where, data) {
        const index = this.data.findIndex(item => item.id === where.id);
        if (index === -1)
            return undefined;
        this.data[index] = { ...this.data[index], ...data };
        this.save();
        return this.data[index];
    }
    delete(where) {
        const index = this.data.findIndex(item => item.id === where.id);
        if (index === -1)
            return false;
        this.data.splice(index, 1);
        this.save();
        return true;
    }
    count() {
        return this.data.length;
    }
}
// Initialize stores with defaults
export const usersStore = new FileStore('users', []);
export const orgsStore = new FileStore('orgs', [
    {
        id: 'default-org',
        name: 'Default Organization',
        slug: 'default',
        plan: 'FREE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
]);
// DB Status check
export function isDbAvailable() {
    return true; // File storage always available
}
export function getDbStatus() {
    return { type: 'file-based', status: 'operational' };
}
