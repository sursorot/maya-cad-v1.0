/**
 * Static Shapes Layer
 * 
 * Placeholder component - shapes are rendered directly in Canvas.tsx
 * This file exists for potential future optimization to extract shape rendering
 * into a separate layer for better memoization.
 */

import { memo } from 'react';

interface StaticShapesLayerProps {
  /** Placeholder - shapes are rendered elsewhere */
  enabled?: boolean;
}

/**
 * Placeholder static shapes layer
 * Actual shape rendering happens in Canvas.tsx
 */
export const StaticShapesLayer = memo(function StaticShapesLayer(
  _props: StaticShapesLayerProps
) {
  // Shapes are rendered directly in Canvas.tsx
  // This component is a placeholder for future optimization
  return null;
});
