// In-memory scan storage for when DB is unavailable
import crypto from 'crypto';
// Simple in-memory store with max 1000 entries
const scanStore = new Map();
const MAX_ENTRIES = 1000;
export function storeScan(scan) {
    // Cleanup old entries if at max
    if (scanStore.size >= MAX_ENTRIES) {
        const oldestKey = scanStore.keys().next().value;
        if (oldestKey)
            scanStore.delete(oldestKey);
    }
    scanStore.set(scan.id, scan);
}
export function getScan(id) {
    return scanStore.get(id);
}
export function generateScanId() {
    return crypto.randomBytes(8).toString('hex');
}
