import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
function readJson(model, defaultValue) {
    try {
        const filePath = path.join(DATA_DIR, `${model}.json`);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    }
    catch (e) {
        console.error(`[Storage] Error reading ${model}:`, e);
    }
    return defaultValue;
}
function writeJson(model, data) {
    try {
        const filePath = path.join(DATA_DIR, `${model}.json`);
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
    findMany(query) {
        if (query)
            return this.data.filter(query);
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
export const assetsStore = new FileStore('assets', []);
export const scansStore = new FileStore('scans', []);
// DB Status check
export function isDbAvailable() {
    return true;
}
export function getDbStatus() {
    return { type: 'file-based', status: 'operational' };
}
