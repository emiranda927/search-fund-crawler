import { z } from 'zod';
import { createHash } from 'crypto';

// Enhanced URL validation schema
export const UrlSchema = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        !parsed.username &&
        !parsed.password &&
        !/^(127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))/.test(parsed.hostname)
      );
    } catch {
      return false;
    }
  },
  { message: 'Invalid or unsafe URL' }
);

// Rate limiting by domain
export class DomainRateLimiter {
  private limits: Map<string, { count: number; resetTime: number }>;
  private readonly maxRequests: number;
  private readonly timeWindow: number;

  constructor(maxRequests = 60, timeWindow = 60000) {
    this.limits = new Map();
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  canMakeRequest(url: string): boolean {
    const domain = new URL(url).hostname;
    const now = Date.now();
    const limit = this.limits.get(domain);

    if (!limit) {
      this.limits.set(domain, { count: 1, resetTime: now + this.timeWindow });
      return true;
    }

    if (now > limit.resetTime) {
      this.limits.set(domain, { count: 1, resetTime: now + this.timeWindow });
      return true;
    }

    if (limit.count >= this.maxRequests) {
      return false;
    }

    limit.count++;
    return true;
  }

  getRemainingRequests(url: string): number {
    const domain = new URL(url).hostname;
    const limit = this.limits.get(domain);
    
    if (!limit) return this.maxRequests;
    
    if (Date.now() > limit.resetTime) {
      this.limits.delete(domain);
      return this.maxRequests;
    }

    return Math.max(0, this.maxRequests - limit.count);
  }

  getResetTime(url: string): number {
    const domain = new URL(url).hostname;
    const limit = this.limits.get(domain);
    return limit ? Math.max(0, limit.resetTime - Date.now()) : 0;
  }
}

// Content sanitization
export function sanitizeContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Request signature validation
export function generateRequestSignature(payload: any, secret: string): string {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return createHash('sha256')
    .update(data + secret)
    .digest('hex');
}