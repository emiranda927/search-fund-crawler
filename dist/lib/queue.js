import pLimit from 'p-limit';
import { EventEmitter } from 'events';
export class RequestQueue extends EventEmitter {
    constructor(concurrency = 5, maxRetries = 3) {
        super();
        this.queue = [];
        this.processing = false;
        this.activeRequests = 0;
        this.concurrency = concurrency;
        this.maxRetries = maxRetries;
        this.limiter = pLimit(concurrency);
    }
    async add(task, priority = 0) {
        return new Promise((resolve, reject) => {
            const wrappedTask = async () => {
                let lastError = null;
                for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
                    try {
                        this.activeRequests++;
                        const result = await this.limiter(task);
                        this.activeRequests--;
                        return resolve(result);
                    }
                    catch (error) {
                        lastError = error;
                        this.emit('error', error);
                        if (attempt < this.maxRetries) {
                            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
                        }
                    }
                    finally {
                        this.activeRequests--;
                    }
                }
                reject(lastError);
            };
            this.queue[priority ? 'unshift' : 'push'](wrappedTask);
            this.process();
        });
    }
    async process() {
        if (this.processing || this.activeRequests >= this.concurrency) {
            return;
        }
        this.processing = true;
        while (this.queue.length > 0 && this.activeRequests < this.concurrency) {
            const task = this.queue.shift();
            if (task) {
                task().catch(error => this.emit('error', error));
            }
        }
        this.processing = false;
    }
    get pending() {
        return this.queue.length;
    }
    get active() {
        return this.activeRequests;
    }
}
