import { LRUCache } from 'lru-cache';
export class RequestCache {
    constructor(options = {}) {
        this.cache = new LRUCache({
            max: options.maxSize || 1000,
            ttl: options.ttl || 1000 * 60 * 60, // 1 hour default
            updateAgeOnGet: true
        });
    }
    async get(key) {
        return this.cache.get(key);
    }
    set(key, value) {
        this.cache.set(key, value);
    }
    has(key) {
        return this.cache.has(key);
    }
    delete(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
}
