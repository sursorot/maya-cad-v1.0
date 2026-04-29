export interface HistoryBatchTelemetry {
  onBatchBegin(event: { source?: string; timestamp: number }): void;
  onBatchCommit(event: { source?: string; mutations: number; timestamp: number }): void;
  onBatchCancel(event: { source?: string; mutations: number; timestamp: number }): void;
}

export interface HistoryBatchMetrics {
  begins: number;
  commits: number;
  cancels: number;
  mutations: number;
  lastTimestamp: number | null;
}

const UNKNOWN_SOURCE = 'unlabeled';

export class HistoryBatchMetricsCollector implements HistoryBatchTelemetry {
  private readonly metrics = new Map<string, HistoryBatchMetrics>();

  onBatchBegin(event: { source?: string; timestamp: number }) {
    const key = event.source ?? UNKNOWN_SOURCE;
    const stats = this.getOrCreate(key);
    stats.begins += 1;
    stats.lastTimestamp = event.timestamp;
  }

  onBatchCommit(event: { source?: string; mutations: number; timestamp: number }) {
    const key = event.source ?? UNKNOWN_SOURCE;
    const stats = this.getOrCreate(key);
    stats.commits += 1;
    stats.mutations += event.mutations;
    stats.lastTimestamp = event.timestamp;
  }

  onBatchCancel(event: { source?: string; mutations: number; timestamp: number }) {
    const key = event.source ?? UNKNOWN_SOURCE;
    const stats = this.getOrCreate(key);
    stats.cancels += 1;
    stats.mutations += event.mutations;
    stats.lastTimestamp = event.timestamp;
  }

  getMetrics(): Record<string, HistoryBatchMetrics> {
    const entries: Record<string, HistoryBatchMetrics> = {};
    for (const [key, value] of this.metrics.entries()) {
      entries[key] = { ...value };
    }
    return entries;
  }

  reset() {
    this.metrics.clear();
  }

  private getOrCreate(source: string): HistoryBatchMetrics {
    if (!this.metrics.has(source)) {
      this.metrics.set(source, {
        begins: 0,
        commits: 0,
        cancels: 0,
        mutations: 0,
        lastTimestamp: null,
      });
    }
    return this.metrics.get(source)!;
  }
}

