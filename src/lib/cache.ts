import { LRUCache } from 'lru-cache';

interface CacheOptions {
  maxSize?: number;  // Maximum number of items
  ttl?: number;      // Time to live in milliseconds
}

export class RequestCache {
  private cache: LRUCache<string, any>;
  
  constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache({
      max: options.maxSize || 1000,
      ttl: options.ttl || 1000 * 60 * 60, // 1 hour default
      updateAgeOnGet: true
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get(key) as T;
  }

  set(key: string, value: any): void {
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}