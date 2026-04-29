/**
 * Feature Flags for Maya
 * 
 * Performance flags allow disabling heavy features that may cause lag.
 * 
 * Performance tiers based on shape count:
 * - Tier 1 (0-199 shapes): All features enabled
 * - Tier 2 (200-399 shapes): Disable intersection snapping
 * - Tier 3 (400-599 shapes): Also disable wall union rendering
 * - Tier 4 (600+ shapes): Also disable wall join calculations
 */
export interface FeatureFlags {
  /**
   * Enable closed region detection for zone creation.
   * HEAVY: Uses polygon-clipping and planar graph algorithms.
   * Disable if experiencing lag with many shapes.
   */
  enableClosedRegionDetection: boolean;
  
  /**
   * Enable real-time wall union rendering (merged wall display).
   * HEAVY: Performs boolean polygon operations on all walls.
   * Disable if experiencing lag with many walls.
   */
  enableWallUnionRendering: boolean;
  
  /**
   * Enable intersection snapping (snap to where lines cross).
   * MODERATE: O(n²) algorithm checking all shape pairs.
   * Disable if snapping feels sluggish.
   */
  enableIntersectionSnapping: boolean;
  
  /**
   * Enable wall join calculations (clean wall corners).
   * MODERATE: Checks all wall endpoints for connections.
   * Disable for simpler wall rendering.
   */
  enableWallJoinCalculations: boolean;
  
  /**
   * Maximum shapes before disabling heavy features automatically.
   * When shape count exceeds this, heavy features are auto-disabled.
   */
  autoDisableThreshold: number;
  
  /**
   * Throttle interval (ms) for expensive calculations during interaction.
   * Higher values = less lag during drawing, but less responsive updates.
   */
  calculationThrottleMs: number;
  
  /**
   * Enable precision input overlay (AutoCAD-style dynamic input).
   * Shows distance/angle fields near cursor during drawing.
   * Allows typing exact coordinates, distances, and angles.
   */
  enablePrecisionInput: boolean;
}

/**
 * Performance tier thresholds
 */
export const PERFORMANCE_TIERS = {
  /** Below this: all features enabled */
  TIER_1_MAX: 200,
  /** Below this: intersection snapping disabled */
  TIER_2_MAX: 400,
  /** Below this: wall union rendering also disabled */
  TIER_3_MAX: 600,
  /** Above this: wall join calculations also disabled */
} as const;

const featureFlags: FeatureFlags = {
  enableClosedRegionDetection: false, // Disabled - uses O(n²) planar graph algorithms
  enableWallUnionRendering: true,
  enableIntersectionSnapping: true,
  enableWallJoinCalculations: true,
  autoDisableThreshold: PERFORMANCE_TIERS.TIER_2_MAX, // Start degrading at 200 shapes
  calculationThrottleMs: 100, // Throttle expensive calculations to 100ms
  enablePrecisionInput: true, // Enable AutoCAD-style precision input overlay
};

/**
 * Get current feature flags
 */
export const getFeatureFlags = (): FeatureFlags => featureFlags;

/**
 * Update feature flags at runtime (for debugging/performance tuning)
 */
export const setFeatureFlag = <K extends keyof FeatureFlags>(
  flag: K,
  value: FeatureFlags[K]
): void => {
  featureFlags[flag] = value;
};

/**
 * Check if heavy features should be enabled based on shape count
 */
export const shouldEnableHeavyFeatures = (shapeCount: number): boolean => {
  return shapeCount <= featureFlags.autoDisableThreshold;
};

/**
 * Get the current performance tier based on shape count
 */
export const getPerformanceTier = (shapeCount: number): 1 | 2 | 3 | 4 => {
  if (shapeCount <= PERFORMANCE_TIERS.TIER_1_MAX) return 1;
  if (shapeCount <= PERFORMANCE_TIERS.TIER_2_MAX) return 2;
  if (shapeCount <= PERFORMANCE_TIERS.TIER_3_MAX) return 3;
  return 4;
};

/**
 * Get performance-adjusted flags based on current state
 * Uses tiered degradation for smooth performance at high shape counts:
 * 
 * - Tier 1 (0-200): All features ON
 * - Tier 2 (201-400): Intersection snapping OFF (O(n²) algorithm)
 * - Tier 3 (401-600): Wall union rendering OFF (heavy polygon ops)
 * - Tier 4 (601+): Wall join calculations OFF (reduced visual quality)
 */
export const getPerformanceAdjustedFlags = (shapeCount: number): FeatureFlags => {
  const tier = getPerformanceTier(shapeCount);
  
  // Tier 1: All features enabled
  if (tier === 1) {
    return { ...featureFlags };
  }
  
  // Tier 2: Disable intersection snapping (biggest O(n²) offender)
  if (tier === 2) {
    return {
      ...featureFlags,
      enableIntersectionSnapping: false,
      // Increase throttle for smoother interactions
      calculationThrottleMs: 150,
    };
  }
  
  // Tier 3: Also disable wall union rendering
  if (tier === 3) {
    return {
      ...featureFlags,
      enableIntersectionSnapping: false,
      enableWallUnionRendering: false,
      calculationThrottleMs: 200,
    };
  }
  
  // Tier 4: Maximum performance mode - disable all heavy features
  return {
    ...featureFlags,
    enableClosedRegionDetection: false,
    enableWallUnionRendering: false,
    enableIntersectionSnapping: false,
    enableWallJoinCalculations: false,
    calculationThrottleMs: 250,
  };
};

/**
 * Get a human-readable description of current performance mode
 */
export const getPerformanceModeDescription = (shapeCount: number): string => {
  const tier = getPerformanceTier(shapeCount);
  switch (tier) {
    case 1: return 'Full Quality';
    case 2: return 'Optimized (basic snapping)';
    case 3: return 'Performance Mode (simplified walls)';
    case 4: return 'Maximum Performance (reduced visuals)';
  }
};

