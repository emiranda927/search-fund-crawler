import pLimit from 'p-limit';
export async function fetchWithRetry(url, options = {}, retryOpts = {}) {
    const { maxRetries = 3, delay = 1000, backoff = 2 } = retryOpts;
    let lastError;
    let waitTime = delay;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; WebContentAnalyzer/1.0)',
                    ...options.headers,
                },
            });
            // Only retry on specific status codes
            if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response;
        }
        catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
                waitTime *= backoff;
            }
        }
    }
    throw lastError || new Error('Failed to fetch after retries');
}
// Create a rate limiter per domain
export class DomainRateLimiter {
    constructor(concurrency = 2) {
        this.concurrency = concurrency;
        this.limiters = new Map();
    }
    getLimiter(url) {
        const domain = new URL(url).hostname;
        if (!this.limiters.has(domain)) {
            this.limiters.set(domain, pLimit(this.concurrency));
        }
        return this.limiters.get(domain);
    }
}
