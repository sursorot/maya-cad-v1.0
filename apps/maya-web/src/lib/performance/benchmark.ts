/**
 * Performance Benchmark Utilities
 * 
 * Functions to benchmark specific operations and compare
 * optimized vs non-optimized implementations.
 */


export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

/**
 * Run a benchmark
 */
export async function runBenchmark(
  name: string,
  fn: () => void | Promise<void>,
  options: {
    iterations?: number;
    warmupIterations?: number;
  } = {}
): Promise<BenchmarkResult> {
  const { iterations = 100, warmupIterations = 10 } = options;
  const times: number[] = [];

  // Warmup
  console.log(`🔥 Warming up: ${name}`);
  for (let i = 0; i < warmupIterations; i++) {
    await fn();
  }

  // Actual benchmark
  console.log(`⏱️  Running benchmark: ${name} (${iterations} iterations)`);
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }

  times.sort((a, b) => a - b);
  const totalTime = times.reduce((a, b) => a + b, 0);
  const averageTime = totalTime / iterations;

  const result: BenchmarkResult = {
    name,
    iterations,
    totalTime,
    averageTime,
    minTime: times[0],
    maxTime: times[times.length - 1],
    opsPerSecond: 1000 / averageTime,
  };

  console.log(`\n📊 Benchmark Result: ${name}`);
  console.log('─'.repeat(50));
  console.log(`  Iterations:    ${result.iterations}`);
  console.log(`  Total time:    ${result.totalTime.toFixed(2)}ms`);
  console.log(`  Average:       ${result.averageTime.toFixed(3)}ms`);
  console.log(`  Min:           ${result.minTime.toFixed(3)}ms`);
  console.log(`  Max:           ${result.maxTime.toFixed(3)}ms`);
  console.log(`  Ops/sec:       ${result.opsPerSecond.toFixed(0)}`);

  return result;
}

/**
 * Compare two implementations
 */
export async function compareBenchmarks(
  baseline: { name: string; fn: () => void | Promise<void> },
  optimized: { name: string; fn: () => void | Promise<void> },
  iterations: number = 50
): Promise<{
  baseline: BenchmarkResult;
  optimized: BenchmarkResult;
  improvement: number;
  speedup: string;
}> {
  console.log('\n🏁 Starting benchmark comparison...\n');

  const baselineResult = await runBenchmark(baseline.name, baseline.fn, { iterations });
  const optimizedResult = await runBenchmark(optimized.name, optimized.fn, { iterations });

  const improvement = ((baselineResult.averageTime - optimizedResult.averageTime) / baselineResult.averageTime) * 100;
  const speedup = (baselineResult.averageTime / optimizedResult.averageTime).toFixed(2);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('📈 COMPARISON RESULTS');
  console.log('═══════════════════════════════════════════════════');
  console.log(`\nBaseline (${baseline.name}):  ${baselineResult.averageTime.toFixed(3)}ms avg`);
  console.log(`Optimized (${optimized.name}): ${optimizedResult.averageTime.toFixed(3)}ms avg`);
  console.log(`\n🚀 Improvement: ${improvement.toFixed(1)}%`);
  console.log(`⚡ Speedup: ${speedup}x faster`);
  console.log('═══════════════════════════════════════════════════\n');

  return {
    baseline: baselineResult,
    optimized: optimizedResult,
    improvement,
    speedup,
  };
}

/**
 * Benchmark wall geometry calculations
 * Run this in the browser console with test shapes
 */
export function createWallGeometryBenchmark(
  shapes: any[],
  computeWallJoins: (shapes: any[]) => any,
  computeWallUnion: (shapes: any[], joins: any) => any
) {
  return {
    name: 'Wall Geometry',
    async run() {
      const iterations = 20;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const joins = computeWallJoins(shapes);
        computeWallUnion(shapes, joins);
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Wall Geometry (${shapes.filter((s: any) => s.type === 'wall').length} walls):`);
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  Min: ${Math.min(...times).toFixed(2)}ms`);
      console.log(`  Max: ${Math.max(...times).toFixed(2)}ms`);
      
      return { average: avg, times };
    },
  };
}

/**
 * Quick performance test you can run from console
 */
export function quickPerfTest() {
  console.log('🧪 Running quick performance test...\n');

  // Test 1: Object creation
  runBenchmark('Object Creation (1000 objects)', () => {
    const objects = [];
    for (let i = 0; i < 1000; i++) {
      objects.push({ x: i, y: i * 2, id: `obj-${i}` });
    }
  }, { iterations: 100 });

  // Test 2: Array filtering
  const testArray = Array.from({ length: 10000 }, (_, i) => ({ id: i, value: Math.random() }));
  runBenchmark('Array Filter (10000 items)', () => {
    testArray.filter(item => item.value > 0.5);
  }, { iterations: 100 });

  // Test 3: Map operations
  runBenchmark('Map Set/Get (1000 ops)', () => {
    const map = new Map();
    for (let i = 0; i < 1000; i++) {
      map.set(`key-${i}`, { value: i });
    }
    for (let i = 0; i < 1000; i++) {
      map.get(`key-${i}`);
    }
  }, { iterations: 100 });
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).runBenchmark = runBenchmark;
  (window as any).compareBenchmarks = compareBenchmarks;
  (window as any).quickPerfTest = quickPerfTest;
}

