import { EventEmitter } from 'events';

export class MemoryManager extends EventEmitter {
  private maxMemoryUsage: number;
  private warningThreshold: number;
  private criticalThreshold: number;
  private checkInterval: number;
  private intervalId?: NodeJS.Timeout;

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

  private startMonitoring(): void {
    this.intervalId = setInterval(() => {
      const usage = this.getMemoryUsage();
      
      if (usage.heapUsed > this.criticalThreshold) {
        this.emit('critical', usage);
        this.cleanup();
      } else if (usage.heapUsed > this.warningThreshold) {
        this.emit('warning', usage);
      }
    }, this.checkInterval);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  isWarningLevel(): boolean {
    const usage = this.getMemoryUsage();
    return usage.heapUsed > this.warningThreshold;
  }

  isCriticalLevel(): boolean {
    const usage = this.getMemoryUsage();
    return usage.heapUsed > this.criticalThreshold;
  }

  async cleanup(): Promise<void> {
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

  private clearModuleCache(): void {
    Object.keys(require.cache).forEach(key => {
      delete require.cache[key];
    });
  }

  // Utility to chunk large arrays for processing
  static chunkArray<T>(array: T[], size: number): T[][] {
    return array.reduce((chunks, item, index) => {
      const chunkIndex = Math.floor(index / size);
      if (!chunks[chunkIndex]) {
        chunks[chunkIndex] = [];
      }
      chunks[chunkIndex].push(item);
      return chunks;
    }, [] as T[][]);
  }
}