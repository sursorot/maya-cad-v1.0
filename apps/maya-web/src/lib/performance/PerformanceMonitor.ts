/**
 * Performance Monitor
 * 
 * Utility for measuring and reporting performance metrics.
 * Use this to benchmark optimization improvements.
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    totalMeasurements: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
  };
}

/**
 * Performance Monitor singleton
 */
class PerformanceMonitorClass {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private enabled: boolean = true;

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Start timing an operation
   */
  start(name: string): void {
    if (!this.enabled) return;
    this.activeTimers.set(name, performance.now());
  }

  /**
   * End timing and record the metric
   */
  end(name: string, metadata?: Record<string, unknown>): number {
    if (!this.enabled) return 0;
    
    const startTime = this.activeTimers.get(name);
    if (startTime === undefined) {
      console.warn(`[PerfMonitor] No start time found for: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.activeTimers.delete(name);

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(metric);

    return duration;
  }

  /**
   * Measure a function execution time
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
    if (!this.enabled) return fn();
    
    this.start(name);
    try {
      const result = fn();
      this.end(name, metadata);
      return result;
    } catch (error) {
      this.end(name, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Measure an async function execution time
   */
  async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, unknown>
  ): Promise<T> {
    if (!this.enabled) return fn();
    
    this.start(name);
    try {
      const result = await fn();
      this.end(name, metadata);
      return result;
    } catch (error) {
      this.end(name, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Get report for a specific metric
   */
  getReport(name: string): PerformanceReport | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      metrics,
      summary: {
        totalMeasurements: durations.length,
        averageDuration: sum / durations.length,
        minDuration: durations[0],
        maxDuration: durations[durations.length - 1],
        p50Duration: this.percentile(durations, 50),
        p95Duration: this.percentile(durations, 95),
        p99Duration: this.percentile(durations, 99),
      },
    };
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get summary of all metrics
   */
  getAllReports(): Record<string, PerformanceReport> {
    const reports: Record<string, PerformanceReport> = {};
    for (const name of this.metrics.keys()) {
      const report = this.getReport(name);
      if (report) {
        reports[name] = report;
      }
    }
    return reports;
  }

  /**
   * Print a formatted report to console
   */
  printReport(name?: string): void {
    if (name) {
      const report = this.getReport(name);
      if (report) {
        console.log(`\n📊 Performance Report: ${name}`);
        console.log('─'.repeat(50));
        console.log(`  Measurements: ${report.summary.totalMeasurements}`);
        console.log(`  Average:      ${report.summary.averageDuration.toFixed(2)}ms`);
        console.log(`  Min:          ${report.summary.minDuration.toFixed(2)}ms`);
        console.log(`  Max:          ${report.summary.maxDuration.toFixed(2)}ms`);
        console.log(`  P50:          ${report.summary.p50Duration.toFixed(2)}ms`);
        console.log(`  P95:          ${report.summary.p95Duration.toFixed(2)}ms`);
        console.log(`  P99:          ${report.summary.p99Duration.toFixed(2)}ms`);
      }
    } else {
      console.log('\n📊 Performance Report: All Metrics');
      console.log('═'.repeat(50));
      for (const metricName of this.metrics.keys()) {
        this.printReport(metricName);
      }
    }
  }

  /**
   * Clear all metrics
   */
  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.getAllReports(), null, 2);
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, index)];
  }
}

// Export singleton instance
export const PerformanceMonitor = new PerformanceMonitorClass();

// Export for window access in dev
if (typeof window !== 'undefined') {
  (window as any).PerformanceMonitor = PerformanceMonitor;
}

