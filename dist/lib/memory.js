import { EventEmitter } from 'events';
export class MemoryManager extends EventEmitter {
    constructor(options = {
        maxMemoryMB: 512,
        warningThresholdPercent: 70,
        criticalThresholdPercent: 85,
        checkIntervalMs: 5000
    }) {
        super();
        this.maxMemoryUsage = options.maxMemoryMB * 1024 * 1024;
        this.warningThreshold = this.maxMemoryUsage * (options.warningThresholdPercent / 100);
        this.criticalThreshold = this.maxMemoryUsage * (options.criticalThresholdPercent / 100);
        this.checkInterval = options.checkIntervalMs;
        this.startMonitoring();
    }
    startMonitoring() {
        this.intervalId = setInterval(() => {
            const usage = this.getMemoryUsage();
            if (usage.heapUsed > this.criticalThreshold) {
                this.emit('critical', usage);
                this.cleanup();
            }
            else if (usage.heapUsed > this.warningThreshold) {
                this.emit('warning', usage);
            }
        }, this.checkInterval);
    }
    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
    getMemoryUsage() {
        return process.memoryUsage();
    }
    isWarningLevel() {
        const usage = this.getMemoryUsage();
        return usage.heapUsed > this.warningThreshold;
    }
    isCriticalLevel() {
        const usage = this.getMemoryUsage();
        return usage.heapUsed > this.criticalThreshold;
    }
    async cleanup() {
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        // Clear module caches if needed
        if (this.isCriticalLevel()) {
            this.clearModuleCache();
        }
        // Allow time for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    clearModuleCache() {
        Object.keys(require.cache).forEach(key => {
            delete require.cache[key];
        });
    }
    // Utility to chunk large arrays for processing
    static chunkArray(array, size) {
        return array.reduce((chunks, item, index) => {
            const chunkIndex = Math.floor(index / size);
            if (!chunks[chunkIndex]) {
                chunks[chunkIndex] = [];
            }
            chunks[chunkIndex].push(item);
            return chunks;
        }, []);
    }
}
