/**
 * Wall Geometry Layer
 * 
 * Renders merged wall polygons and seam covers.
 * Memoized to only re-render when wall geometry changes.
 */

import { memo, useCallback } from 'react';
import type { Point, ToolbarStyle } from '../../../types';
import type { MergedWallGeometry, SeamCover } from '../../../utils/walls';

interface WallGeometryLayerProps {
  /** Merged wall geometry from boolean union */
  wallGeometry: MergedWallGeometry;
  /** Seam covers for T-junctions */
  seamCovers: SeamCover[];
  /** Opening gap polygons for masking */
  openingGapPolygons: string[];
  /** Whether zone hover is enabled */
  zoneHoverEnabled: boolean;
  /** Currently hovered interior index */
  hoveredInteriorIndex: number | null;
  /** Flashing interiors for animation */
  flashingInteriors: Set<number>;
  /** Toolbar style for theming */
  toolbarStyle: ToolbarStyle;
  /** Callback for interior hover */
  onInteriorHover: (index: number | null) => void;
  /** Callback for interior click (creates zone) */
  onInteriorClick: (polygon: Point[]) => void;
  /** Callback for zone interaction */
  onZoneInteract?: () => void;
}

/**
 * Memoized wall geometry layer
 */
export const WallGeometryLayer = memo(function WallGeometryLayer({
  wallGeometry,
  seamCovers,
  openingGapPolygons,
  zoneHoverEnabled,
  hoveredInteriorIndex,
  flashingInteriors,
  toolbarStyle,
  onInteriorHover,
  onInteriorClick,
  onZoneInteract,
}: WallGeometryLayerProps) {
  const isClean = toolbarStyle === 'clean';
  const hasMask = openingGapPolygons.length > 0;

  // Handle interior click
  const handleInteriorClick = useCallback((e: React.MouseEvent, hole: Point[]) => {
    e.stopPropagation();
    onInteriorClick(hole);
    onZoneInteract?.();
  }, [onInteriorClick, onZoneInteract]);

  if (wallGeometry.polygons.length === 0) {
    return null;
  }

  return (
    <>
      {/* Merged wall polygons */}
      <g className="merged-walls">
        {/* Define mask for opening cutouts in merged walls */}
        {hasMask && (
          <defs>
            <mask id="merged-walls-opening-mask">
              <rect x="-99999" y="-99999" width="199998" height="199998" fill="white" />
              {openingGapPolygons.map((points, idx) => (
                <polygon key={`opening-mask-${idx}`} points={points} fill="black" />
              ))}
            </mask>
          </defs>
        )}

        {wallGeometry.polygons.map((polygon, polygonIndex) => {
          const { outer, holes } = polygon;
          const hasHoles = holes.length > 0;

          if (hasHoles) {
            // Build SVG path with outer boundary and all holes using evenodd fill-rule
            const outerPath = `M ${outer.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
            const holesPath = holes.map(hole =>
              `M ${hole.map(p => `${p.x} ${p.y}`).join(' L ')} Z`
            ).join(' ');

            return (
              <g key={`merged-wall-group-${polygonIndex}`}>
                {/* Wall fill with mask (cuts out openings) - no stroke */}
                <path
                  d={`${outerPath} ${holesPath}`}
                  fill="#FFFFFF"
                  stroke="none"
                  fillRule="evenodd"
                  pointerEvents="none"
                  mask={hasMask ? "url(#merged-walls-opening-mask)" : undefined}
                />
                {/* Wall stroke without mask (consistent outline) */}
                <path
                  d={`${outerPath} ${holesPath}`}
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth={1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  fillRule="evenodd"
                  pointerEvents="none"
                />
                {/* Interactive interior areas - one for each hole */}
                {zoneHoverEnabled && holes.map((hole, holeIndex) => {
                  // Create a unique index for hover/flash tracking
                  const globalHoleIndex = wallGeometry.polygons
                    .slice(0, polygonIndex)
                    .reduce((acc, p) => acc + p.holes.length, 0) + holeIndex;
                  const isInteriorHovered = hoveredInteriorIndex === globalHoleIndex;
                  const isFlashing = flashingInteriors.has(globalHoleIndex);
                  const showTint = isInteriorHovered || isFlashing;

                  return (
                    <polygon
                      key={`hole-${polygonIndex}-${holeIndex}`}
                      points={hole.map(p => `${p.x},${p.y}`).join(' ')}
                      fill={showTint ? (isClean ? "rgba(0, 0, 0, 0.08)" : "rgba(180, 160, 220, 0.18)") : "transparent"}
                      stroke="none"
                      pointerEvents="auto"
                      style={{ cursor: 'pointer', transition: 'fill 0.3s ease' }}
                      onMouseEnter={() => onInteriorHover(globalHoleIndex)}
                      onMouseLeave={() => onInteriorHover(null)}
                      onClick={(e) => handleInteriorClick(e, hole)}
                    />
                  );
                })}
              </g>
            );
          }

          // No holes - render as simple polygon
          return (
            <g key={`merged-wall-group-simple-${polygonIndex}`}>
              {/* Wall fill with mask (cuts out openings) - no stroke */}
              <polygon
                points={outer.map(p => `${p.x},${p.y}`).join(' ')}
                fill="#FFFFFF"
                stroke="none"
                pointerEvents="none"
                mask={hasMask ? "url(#merged-walls-opening-mask)" : undefined}
              />
              {/* Wall stroke without mask (consistent outline) */}
              <polygon
                points={outer.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#1a1a1a"
                strokeWidth={1}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            </g>
          );
        })}
      </g>

      {/* Seam covers for T-junctions */}
      {seamCovers.length > 0 && (
        <g className="wall-seam-covers" pointerEvents="none">
          {seamCovers.map((cover, index) => (
            <polygon
              key={`seam-cover-${cover.wallId}-${cover.endpoint}-${index}`}
              points={cover.polygon.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="#FFFFFF"
              stroke="none"
              vectorEffect="non-scaling-stroke"
              mask={hasMask ? "url(#merged-walls-opening-mask)" : undefined}
            />
          ))}
        </g>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render when wall geometry actually changes
  if (prevProps.wallGeometry !== nextProps.wallGeometry) return false;
  if (prevProps.seamCovers !== nextProps.seamCovers) return false;
  if (prevProps.openingGapPolygons !== nextProps.openingGapPolygons) return false;
  if (prevProps.zoneHoverEnabled !== nextProps.zoneHoverEnabled) return false;
  if (prevProps.hoveredInteriorIndex !== nextProps.hoveredInteriorIndex) return false;
  if (prevProps.flashingInteriors !== nextProps.flashingInteriors) return false;
  if (prevProps.toolbarStyle !== nextProps.toolbarStyle) return false;
  return true;
});

