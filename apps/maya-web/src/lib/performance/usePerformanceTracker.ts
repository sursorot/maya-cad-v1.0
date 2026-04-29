/**
 * Performance Tracker Hook
 * 
 * React hook for tracking component render performance.
 */

import { useEffect, useRef, useCallback } from 'react';
import { PerformanceMonitor } from './PerformanceMonitor';

/**
 * Track component render performance
 */
export function useRenderTracker(componentName: string, enabled: boolean = true) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;
    
    renderCount.current++;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    // Record render timing - use the public endMeasurement method if a measurement was started
    // (This is a simplified approach - render tracking doesn't use the full timing API)
    
    // Log if render seems expensive (>16ms = drops below 60fps)
    if (timeSinceLastRender < 100 && renderCount.current > 1) {
      // This was a re-render triggered quickly after previous
      console.debug(`[Perf] ${componentName} re-rendered (render #${renderCount.current})`);
    }
  });

  return {
    renderCount: renderCount.current,
  };
}

/**
 * Track effect execution time
 */
export function useEffectTiming(
  effectName: string,
  effect: () => void | (() => void),
  deps: React.DependencyList,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) {
      return effect();
    }

    PerformanceMonitor.start(effectName);
    const cleanup = effect();
    const duration = PerformanceMonitor.end(effectName);

    if (duration > 16) {
      console.warn(`[Perf] Slow effect "${effectName}": ${duration.toFixed(1)}ms`);
    }

    return cleanup;
  }, deps);
}

/**
 * Create a timed callback
 */
export function useTimedCallback<T extends (...args: any[]) => any>(
  name: string,
  callback: T,
  enabled: boolean = true
): T {
  return useCallback(
    ((...args: Parameters<T>) => {
      if (!enabled) {
        return callback(...args);
      }
      return PerformanceMonitor.measure(name, () => callback(...args));
    }) as T,
    [callback, name, enabled]
  );
}

/**
 * Hook to print performance stats periodically
 */
export function usePerformanceLogger(intervalMs: number = 5000) {
  useEffect(() => {
    const interval = setInterval(() => {
      const names = PerformanceMonitor.getMetricNames();
      if (names.length > 0) {
        console.log('\n📊 Performance Summary');
        console.log('─'.repeat(60));
        
        for (const name of names) {
          const report = PerformanceMonitor.getReport(name);
          if (report && report.summary.totalMeasurements > 0) {
            console.log(
              `${name.padEnd(35)} | ` +
              `avg: ${report.summary.averageDuration.toFixed(1)}ms | ` +
              `n: ${report.summary.totalMeasurements}`
            );
          }
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);
}

