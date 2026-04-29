/**
 * Performance Monitoring Module
 * 
 * Tools for measuring and benchmarking performance.
 * 
 * Usage in browser console:
 *   PerformanceMonitor.printReport()
 *   quickPerfTest()
 *   runBenchmark('test', () => { ... })
 */

export { PerformanceMonitor } from './PerformanceMonitor';
export type { PerformanceMetric, PerformanceReport } from './PerformanceMonitor';

export { 
  useRenderTracker, 
  useEffectTiming, 
  useTimedCallback,
  usePerformanceLogger 
} from './usePerformanceTracker';

export { 
  runBenchmark, 
  compareBenchmarks, 
  createWallGeometryBenchmark,
  quickPerfTest 
} from './benchmark';
export type { BenchmarkResult } from './benchmark';

