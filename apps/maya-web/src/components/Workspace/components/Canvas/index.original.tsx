import { useMemo, useState, useEffect, useRef, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import type {
  ViewBox,
  GridSystem,
  Shape,
  Point,
  LengthUnit,
  SnapSettings,
  ArcShape,
  WallShape,
  WallDrawingMode,
  RoomShape,
  OpeningShape,
  ToolbarStyle,
} from '../../types';
import type { OpeningPlacementOptions, WallCreationOptions } from '@maya/workspace-domain/workspace';
import { CUSTOM_CURSOR, CURSOR_HOTSPOT } from '../../constants';
import { calculateCurveBounds, getArcBounds, calculateLength, calculateAngle, formatLength, formatAngle } from '../../utils/measurements';
import { getVisibleShapes } from '../../utils/viewportCulling';
import { GridPatterns } from '../GridPatterns';
import { LineShape } from './LineShape';
import { PolylineShape } from './PolylineShape';
import { ArcShapeComponent } from './ArcShape';
import { CurveShapeComponent } from './CurveShape';
import { CircleShapeComponent } from './CircleShape';
import { RectangleShapeComponent } from './RectangleShape';
import { GuidelineShapeComponent } from './GuidelineShape';
import { MarkerShapeComponent } from './MarkerShape';
import { BoundingBox } from './BoundingBox';
import { useCanvasInteraction } from './useCanvasInteraction';
import { useSnapping } from '../../hooks/useSnapping';
import { MULTI_SELECT_ID } from './constants';

const computeArcBounds = (arc: ArcShape) => getArcBounds(arc.start, arc.end, arc.controlPoint);
import { useWorkspaceControllerContext } from '../../context/WorkspaceControllerContext';
import { WallShapeComponent } from './WallShape';
import { RoomShapeComponent } from './RoomShape';
import { computeWallJoins, getWallPolygonPoints, computeWallUnion, getSeamCovers } from '../../utils/walls';
import { getInteractiveClosedRegions } from '../../utils/closedRegions';
import { OpeningShapeComponent } from './OpeningShape';
import { DimensionCollectorProvider } from './dimensions/DimensionContext';
import { ZoneShapeComponent } from '../ZoneShape';
import { DimensionShape } from './DimensionShape';
import { TextShapeComponent } from './TextShape';
import { AppearanceRenderer } from './AppearanceRenderer';

import type { MeasurementSettings } from '../../types';

const isShapeRotatable = (shape: Shape): boolean => {
  if (shape.type === 'rectangle') {
    return false;
  }
  if (shape.type === 'guideline') {
    return shape.orientation === 'freeform' && Boolean(shape.start && shape.end);
  }
  return true;
};

interface CanvasProps {
  svgRef: RefObject<SVGSVGElement>;
  viewBox: ViewBox;
  showGrid: boolean;
  gridSystem: GridSystem;
  lengthUnit: LengthUnit;
  snapSettings?: SnapSettings;
  showMeasurements?: boolean; // Legacy boolean, prefer measurementSettings.enabled
  measurementSettings?: MeasurementSettings;
  wallOptions?: WallCreationOptions & { offsetDistance?: number };
  wallMode?: WallDrawingMode;
  openingOptions?: OpeningPlacementOptions;
  showWallCenterline?: boolean;
  zoneHoverEnabled?: boolean;
  showMarkers?: boolean;
  onRoomLabelEditRequest?: (roomId: string) => void;
  onOpeningPlaced?: () => void;
  onZoneInteract?: () => void;
  toolbarStyle?: ToolbarStyle;
  simulationOverlay?: React.ReactNode; // Optional simulation overlay
}

export const Canvas: React.FC<CanvasProps> = ({
  svgRef,
  viewBox,
  showGrid,
  gridSystem,
  lengthUnit,
  snapSettings,
  showMeasurements = true,
  measurementSettings,
  wallOptions,
  wallMode = 'single',
  openingOptions,
  showWallCenterline = true,
  zoneHoverEnabled = true,
  showMarkers = true,
  onRoomLabelEditRequest,
  onOpeningPlaced,
  onZoneInteract,
  toolbarStyle = 'modern',
  simulationOverlay,
}) => {
  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isCyber = toolbarStyle === 'cyber';
  const isClean = toolbarStyle === 'clean';
  const [snapIndicator, setSnapIndicator] = useState<{ point: Point; type: string } | null>(null);
  const [hoveredInteriorIndex, setHoveredInteriorIndex] = useState<number | null>(null);
  const [hoveredClosedRegionIndex, setHoveredClosedRegionIndex] = useState<number | null>(null);
  const [flashingInteriors, setFlashingInteriors] = useState<Set<number>>(new Set());
  const [flashingClosedRegions, setFlashingClosedRegions] = useState<Set<number>>(new Set());
  // Initialize refs to -1 to indicate "not yet initialized"
  // This prevents flashing existing shapes on mount
  const prevInnerPolygonCountRef = useRef<number>(-1);
  const prevClosedRegionCountRef = useRef<number>(-1);
  const controller = useWorkspaceControllerContext();
  
  // Subscribe to controller state changes to ensure Canvas re-renders
  // when shapes are updated (e.g., editing marker properties)
  useSyncExternalStore(
    controller.subscribe,
    () => controller.snapshot,
    () => controller.snapshot
  );
  
  const { snapshot } = controller;
  const {
    activeTool,
    shapes,
    currentShape,
    isDrawing,
    selectedShapeId,
    selectedShapeIds,
    chainSessionShapeIds,
    drawingMode,
  } = snapshot;
  const extension = Math.max(viewBox.width, viewBox.height) * 2;

  // Calculate zoom scale (based on initial viewBox width of 10)
  const baseViewBoxWidth = 10;
  const zoomScale = viewBox.width / baseViewBoxWidth;

  // Snapping hook
  const { findSnapPoint } = useSnapping(shapes, snapSettings, gridSystem.minor, zoomScale);

  const {
    hoveredShapeId,
    setHoveredShapeId,
    isResizing,
    isResizingPolylineCorner,
    isResizingRectangleEdge,
    isResizingRoomCorner,
    isResizingText,
    isCurvingWall,
    curvingWallId,
    rectanglePreview,
    handleClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleCanvasClick,
    handleResizeStart,
    handlePolylineCornerResizeStart,
    handleRectangleEdgeResizeStart,
    handleRoomCornerResizeStart,
    handleWallCurveHandleStart,
    handleRotateHandleStart,
    rotationPreview,
    selectionRect,
    isSelecting,
    // Measure tool state
    measureStart,
    measureEnd,
    isMeasuring,
    // Marker chain state
    markerChainStart,
    markerChainEnd,
    isMarkerChaining,
    // Multi-select method tracking
    multiSelectViaBox,
  } = useCanvasInteraction({
    svgRef,
    controller,
    snapshot,
    findSnapPoint,
    setSnapIndicator,
    wallOptions,
    wallMode,
    snapSettings,
    gridSpacing: gridSystem.minor, // Pass grid spacing for ortho-grid integration
    openingOptions,
    onOpeningPlaced,
    drawingMode,
  });

  const wallJoinOverrides = useMemo(() => {
    const joinShapes =
      currentShape && currentShape.type === 'wall' ? [...shapes, currentShape] : shapes;
    return computeWallJoins(joinShapes);
  }, [shapes, currentShape]);

  // Compute merged wall geometry using boolean union
  const mergedWallGeometry = useMemo(() => {
    const joinShapes =
      currentShape && currentShape.type === 'wall' ? [...shapes, currentShape] : shapes;
    return computeWallUnion(joinShapes, wallJoinOverrides);
  }, [shapes, currentShape, wallJoinOverrides]);

  const seamCovers = useMemo(() => getSeamCovers(wallJoinOverrides), [wallJoinOverrides]);

  // Compute closed regions from non-wall shapes (circles, rectangles, polylines, arcs, curves)
  const closedRegions = useMemo(() => {
    // Include current shape if it's being drawn
    const allShapes = currentShape ? [...shapes, currentShape] : shapes;
    return getInteractiveClosedRegions(allShapes);
  }, [shapes, currentShape]);

  // Detect when new closed loops are created and flash the interior
  useEffect(() => {
    const currentCount = mergedWallGeometry.innerPolygons.length;
    const prevCount = prevInnerPolygonCountRef.current;
    
    // On first run (ref is -1), just initialize without flashing
    if (prevCount === -1) {
      prevInnerPolygonCountRef.current = currentCount;
      return;
    }
    
    // New closed loop(s) detected
    if (currentCount > prevCount) {
      // Flash the new interior(s) - use requestAnimationFrame to signal intentional visual update
      const newIndices = new Set<number>();
      for (let i = prevCount; i < currentCount; i++) {
        newIndices.add(i);
      }
      const rafId = requestAnimationFrame(() => {
        setFlashingInteriors(newIndices);
      });
      
      // Clear the flash after 1.5 seconds
      const timeout = setTimeout(() => {
        setFlashingInteriors(new Set());
      }, 1500);
      
      prevInnerPolygonCountRef.current = currentCount;
      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timeout);
      };
    }
    
    prevInnerPolygonCountRef.current = currentCount;
  }, [mergedWallGeometry.innerPolygons.length]);

  // Detect when new closed regions are created from shapes and flash them
  useEffect(() => {
    const currentCount = closedRegions.length;
    const prevCount = prevClosedRegionCountRef.current;
    
    // On first run (ref is -1), just initialize without flashing
    if (prevCount === -1) {
      prevClosedRegionCountRef.current = currentCount;
      return;
    }
    
    // New closed region(s) detected
    if (currentCount > prevCount) {
      // Flash the new region(s) - use requestAnimationFrame to signal intentional visual update
      const newIndices = new Set<number>();
      for (let i = prevCount; i < currentCount; i++) {
        newIndices.add(i);
      }
      const rafId = requestAnimationFrame(() => {
        setFlashingClosedRegions(newIndices);
      });
      
      // Clear the flash after 1.5 seconds
      const timeout = setTimeout(() => {
        setFlashingClosedRegions(new Set());
      }, 1500);
      
      prevClosedRegionCountRef.current = currentCount;
      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timeout);
      };
    }
    
    prevClosedRegionCountRef.current = currentCount;
  }, [closedRegions.length]);

  useEffect(() => {
    if (!zoneHoverEnabled) {
      // Use requestAnimationFrame to signal intentional visual update
      const rafId = requestAnimationFrame(() => {
        setHoveredInteriorIndex(null);
        setHoveredClosedRegionIndex(null);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [zoneHoverEnabled]);

  // Performance optimization: viewport culling
  // Only render shapes that are visible in the current viewport
  // Selected shapes are always rendered to ensure they stay visible during interaction
  const visibleShapes = useMemo(() => {
    // Always include selected shapes to ensure they render during drag/resize
    const selectedSet = new Set(selectedShapeIds);
    if (selectedShapeId) selectedSet.add(selectedShapeId);
    
    // Filter to visible shapes, always including selected ones
    const visible = shapes.filter(shape => {
      // Always render selected shapes
      if (selectedSet.has(shape.id)) return true;
      // Always render chain session shapes (being drawn)
      if (chainSessionShapeIds.includes(shape.id)) return true;
      // Use viewport culling for the rest
      return getVisibleShapes([shape], viewBox, 0.5).length > 0;
    });
    
    // Sort to ensure openings are always rendered after their host walls
    // This guarantees openings are on top in SVG z-order and can be clicked/selected independently
    const sorted = [...visible].sort((a, b) => {
      // Openings should render last (on top)
      if (a.type === 'opening' && b.type !== 'opening') return 1;
      if (a.type !== 'opening' && b.type === 'opening') return -1;
      // Keep original order for same types
      return 0;
    });
    
    return sorted;
  }, [shapes, viewBox, selectedShapeId, selectedShapeIds, chainSessionShapeIds]);

  const openingsByWallId = useMemo(() => {
    const map = new Map<string, OpeningShape[]>();
    shapes.forEach((shape) => {
      if (shape.type === 'opening' && shape.host) {
        const existing = map.get(shape.host.wallId);
        if (existing) {
          existing.push(shape);
        } else {
          map.set(shape.host.wallId, [shape]);
        }
      }
    });
    return map;
  }, [shapes]);

  // Compute opening gap polygons for all openings (for merged wall mask)
  const allOpeningGapPolygons = useMemo(() => {
    const gaps: string[] = [];
    shapes.forEach((shape) => {
      if (shape.type === 'opening' && shape.host) {
        const wall = shapes.find((s): s is WallShape => s.type === 'wall' && s.id === shape.host?.wallId);
        if (!wall) return;
        
        const halfThickness = Math.max(wall.thickness / 2, 0.001);
        const padding = Math.max(0.03, Math.min(wall.thickness * 0.2, 0.2));
        const extent = halfThickness + padding;
        const halfWidth = Math.max(shape.width / 2, 0.01);
        
        const dirLen = Math.hypot(shape.direction.x, shape.direction.y) || 1;
        const direction = { x: shape.direction.x / dirLen, y: shape.direction.y / dirLen };
        const normLen = Math.hypot(shape.normal.x, shape.normal.y) || 1;
        const normal = { x: shape.normal.x / normLen, y: shape.normal.y / normLen };
        
        const startCenter = {
          x: shape.anchor.x - direction.x * halfWidth,
          y: shape.anchor.y - direction.y * halfWidth,
        };
        const endCenter = {
          x: shape.anchor.x + direction.x * halfWidth,
          y: shape.anchor.y + direction.y * halfWidth,
        };
        const startPositive = { x: startCenter.x + normal.x * extent, y: startCenter.y + normal.y * extent };
        const startNegative = { x: startCenter.x - normal.x * extent, y: startCenter.y - normal.y * extent };
        const endPositive = { x: endCenter.x + normal.x * extent, y: endCenter.y + normal.y * extent };
        const endNegative = { x: endCenter.x - normal.x * extent, y: endCenter.y - normal.y * extent };
        
        gaps.push(`${startPositive.x},${startPositive.y} ${startNegative.x},${startNegative.y} ${endNegative.x},${endNegative.y} ${endPositive.x},${endPositive.y}`);
      }
    });
    return gaps;
  }, [shapes]);

  const rectanglePreviewElement = useMemo(() => {
    if (wallMode !== 'rectangle' || !rectanglePreview) {
      return null;
    }
    const { start, end } = rectanglePreview;
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const width = maxX - minX;
    const height = maxY - minY;
    if (width < 0.0005 || height < 0.0005) {
      return null;
    }

    // Get wall thickness from options or use default (0.1524m = 6 inches)
    const thickness = wallOptions?.thickness ?? 0.1524;
    const half = thickness / 2;

    // Create a connected wall ring using outer and inner rectangles
    // Outer rectangle (centerline + half thickness outward)
    const outerPoints: Point[] = [
      { x: minX - half, y: minY - half }, // top-left outer
      { x: maxX + half, y: minY - half }, // top-right outer
      { x: maxX + half, y: maxY + half }, // bottom-right outer
      { x: minX - half, y: maxY + half }, // bottom-left outer
    ];

    // Inner rectangle (centerline - half thickness inward)
    const innerPoints: Point[] = [
      { x: minX + half, y: minY + half }, // top-left inner
      { x: maxX - half, y: minY + half }, // top-right inner
      { x: maxX - half, y: maxY - half }, // bottom-right inner
      { x: minX + half, y: maxY - half }, // bottom-left inner
    ];

    // Note: outerPoints and innerPoints used below for wall segment calculations

    // Wall segment data for measurements
    const wallSegments = [
      { // Top wall
        start: { x: minX, y: minY },
        end: { x: maxX, y: minY },
        midpoint: { x: (minX + maxX) / 2, y: minY },
        length: width,
        angle: 0,
        offsetDir: { x: 0, y: -1 }, // measure above
      },
      { // Right wall
        start: { x: maxX, y: minY },
        end: { x: maxX, y: maxY },
        midpoint: { x: maxX, y: (minY + maxY) / 2 },
        length: height,
        angle: 90,
        offsetDir: { x: 1, y: 0 }, // measure to the right
      },
      { // Bottom wall
        start: { x: maxX, y: maxY },
        end: { x: minX, y: maxY },
        midpoint: { x: (minX + maxX) / 2, y: maxY },
        length: width,
        angle: 180,
        offsetDir: { x: 0, y: 1 }, // measure below
      },
      { // Left wall
        start: { x: minX, y: maxY },
        end: { x: minX, y: minY },
        midpoint: { x: minX, y: (minY + maxY) / 2 },
        length: height,
        angle: -90,
        offsetDir: { x: -1, y: 0 }, // measure to the left
      },
    ];

    // Format length for measurements
    const formatWallLength = (length: number): string => {
      const meters = length;
      switch (lengthUnit) {
        case 'ft-in': {
          const totalInches = meters * 39.3701;
          const feet = Math.floor(totalInches / 12);
          const inches = totalInches % 12;
          if (totalInches < 1) return `${totalInches.toFixed(2)}"`;
          if (totalInches < 12) return `${totalInches.toFixed(1)}"`;
          if (inches < 0.5) return `${feet}'`;
          if (inches < 1) return `${feet}' ${inches.toFixed(1)}"`;
          return `${feet}' ${Math.round(inches)}"`;
        }
        case 'ft': {
          const feet = meters * 3.28084;
          if (feet < 1) return `${(feet * 12).toFixed(1)}"`;
          if (feet < 10) return `${feet.toFixed(2)}'`;
          return `${feet.toFixed(1)}'`;
        }
        case 'm': {
          if (meters < 0.1) return `${(meters * 100).toFixed(1)} cm`;
          return `${meters.toFixed(2)} m`;
        }
        case 'cm': {
          return `${(meters * 100).toFixed(1)} cm`;
        }
        case 'mm': {
          return `${Math.round(meters * 1000)} mm`;
        }
        case 'in': {
          const inches = meters * 39.3701;
          return `${inches.toFixed(1)}"`;
        }
        default:
          return `${meters.toFixed(2)} m`;
      }
    };

    const fontSize = 0.08 * zoomScale;
    const chipPadding = 0.02 * zoomScale;
    const measurementOffset = (half + 0.12) * zoomScale;

    return (
      <g pointerEvents="none">
        {/* Connected wall ring using SVG path with fill-rule evenodd */}
        <path
          d={`M ${outerPoints[0].x} ${outerPoints[0].y} 
              L ${outerPoints[1].x} ${outerPoints[1].y} 
              L ${outerPoints[2].x} ${outerPoints[2].y} 
              L ${outerPoints[3].x} ${outerPoints[3].y} Z 
              M ${innerPoints[0].x} ${innerPoints[0].y} 
              L ${innerPoints[3].x} ${innerPoints[3].y} 
              L ${innerPoints[2].x} ${innerPoints[2].y} 
              L ${innerPoints[1].x} ${innerPoints[1].y} Z`}
          fill="transparent"
          stroke={isClean ? "#000000" : "#6F62A4"}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          fillRule="evenodd"
        />
        
        {/* Measurement labels for each wall */}
        {wallSegments.map((wall, index) => {
          const textX = wall.midpoint.x + wall.offsetDir.x * measurementOffset;
          const textY = wall.midpoint.y + wall.offsetDir.y * measurementOffset;
          
          // Adjust text angle to be readable (horizontal or vertical)
          let textAngle = wall.angle;
          if (textAngle > 90 || textAngle < -90) {
            textAngle += 180;
          }
          // For vertical walls, rotate text to be readable
          if (Math.abs(wall.angle) === 90) {
            textAngle = 0; // Keep horizontal for readability
          }

          const lengthText = formatWallLength(wall.length);
          const chipWidth = lengthText.length * fontSize * 0.55 + chipPadding * 2;
          const chipHeight = fontSize + chipPadding * 2;

          return (
            <g key={index} transform={`translate(${textX}, ${textY})`}>
              <rect
                x={-chipWidth / 2}
                y={-chipHeight / 2}
                width={chipWidth}
                height={chipHeight}
                fill={isClean ? "#000000" : "rgba(255, 255, 255, 0.95)"}
                stroke={isClean ? "#000000" : "#6F62A4"}
                strokeWidth={0.5}
                vectorEffect="non-scaling-stroke"
                rx={chipHeight / 4}
              />
              <text
                x={0}
                y={fontSize * 0.35}
                textAnchor="middle"
                fontSize={fontSize}
                fill={isClean ? "#ffffff" : "#333"}
                fontFamily={isClean ? "'IBM Plex Mono', monospace" : "system-ui, -apple-system, sans-serif"}
              >
                {lengthText}
              </text>
            </g>
          );
        })}
      </g>
    );
  }, [rectanglePreview, wallMode, wallOptions, lengthUnit, zoomScale, isClean]);

  // Determine cursor style based on active tool and state
  const getCursorStyle = () => {
    // Select tool - custom pointer, move when hovering, grabbing when dragging
    if (activeTool === 'select') {
      if (isResizing || isResizingPolylineCorner || isResizingRectangleEdge || isResizingRoomCorner || isResizingText) {
        return 'grabbing';
      }
      if (hoveredShapeId) {
        return 'move';
      }
      // Use custom cursor that matches toolbar select icon (filled)
      return `url("${CUSTOM_CURSOR}") ${CURSOR_HOTSPOT}, auto`;
    }

    // Zoom tool
    if (activeTool === 'zoom') {
      return 'zoom-in';
    }

    // Trim tool - scissors cursor
    if (activeTool === 'trim') {
      // Use a scissors cursor SVG data URL
      const scissorsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(scissorsSvg)}") 12 12, crosshair`;
    }

    // Drawing tools - show crosshair immediately when tool is selected
    if (
      activeTool === 'line' ||
      activeTool === 'polyline' ||
      activeTool === 'curve' ||
      activeTool === 'arc' ||
      activeTool === 'circle' ||
      activeTool === 'rectangle' ||
      activeTool === 'guideline' ||
      activeTool === 'wall' ||
      activeTool === 'opening' ||
      activeTool === 'zone' ||
      activeTool === 'dimension' ||
      activeTool === 'text'
    ) {
      return 'crosshair'; // Crosshair for all drawing tools
    }

    // Default custom cursor
    return `url("${CUSTOM_CURSOR}") ${CURSOR_HOTSPOT}, auto`;
  };

  const sceneContent = (
    <>
      {rectanglePreviewElement}

      {/* Merged wall polygons - boolean union of all walls for clean joins */}
      {mergedWallGeometry.polygons.length > 0 && (
        <g className="merged-walls">
          {/* Define mask for opening cutouts in merged walls */}
          {allOpeningGapPolygons.length > 0 && (
            <defs>
              <mask id="merged-walls-opening-mask">
                <rect x="-99999" y="-99999" width="199998" height="199998" fill="white" />
                {allOpeningGapPolygons.map((points, idx) => (
                  <polygon key={`opening-mask-${idx}`} points={points} fill="black" />
                ))}
              </mask>
            </defs>
          )}
          {mergedWallGeometry.polygons.map((polygon, polygonIndex) => {
            const { outer, holes } = polygon;
            const hasHoles = holes.length > 0;
            
            if (hasHoles) {
              // Build SVG path with outer boundary and all holes using evenodd fill-rule
              const outerPath = `M ${outer.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
              const holesPath = holes.map(hole => 
                `M ${hole.map(p => `${p.x} ${p.y}`).join(' L ')} Z`
              ).join(' ');
              const hasMask = allOpeningGapPolygons.length > 0;
              
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
                  {zoneHoverEnabled ? holes.map((hole, holeIndex) => {
                    // Create a unique index for hover/flash tracking
                    const globalHoleIndex = mergedWallGeometry.polygons
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
                        onMouseEnter={() => setHoveredInteriorIndex(globalHoleIndex)}
                        onMouseLeave={() => setHoveredInteriorIndex(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Create zone directly from the hole polygon
                          controller.createZoneFromPolygon(hole);
                          // Notify parent that a zone was interacted with
                          onZoneInteract?.();
                        }}
                      />
                    );
                  }) : null}
                </g>
              );
            }
            
            // No holes - render as simple polygon
            const hasMaskSimple = allOpeningGapPolygons.length > 0;
            return (
              <g key={`merged-wall-group-simple-${polygonIndex}`}>
                {/* Wall fill with mask (cuts out openings) - no stroke */}
                <polygon
                  points={outer.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="#FFFFFF"
                  stroke="none"
                  pointerEvents="none"
                  mask={hasMaskSimple ? "url(#merged-walls-opening-mask)" : undefined}
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
      )}

      {seamCovers.length > 0 && (
        <g className="wall-seam-covers" pointerEvents="none">
          {seamCovers.map((cover, index) => (
            <polygon
              key={`seam-cover-${cover.wallId}-${cover.endpoint}-${index}`}
              points={cover.polygon.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="#FFFFFF"
              stroke="none"
              vectorEffect="non-scaling-stroke"
              mask={allOpeningGapPolygons.length > 0 ? "url(#merged-walls-opening-mask)" : undefined}
            />
          ))}
        </g>
      )}

      {/* Trim tool visualization */}
      {activeTool === 'trim' && snapshot.trimState?.firstPoint && (() => {
        const trimState = snapshot.trimState;
        const firstPoint = trimState.firstPoint!;
        const secondPoint = trimState.secondPoint;
        const highlightSegment = trimState.highlightSegment;
        const wallId = trimState.wallId;

        return (
          <g className="trim-visualization" pointerEvents="none" data-export-exclude="true">
            {/* First trim point marker */}
            <g>
              {/* Cross marker - thin red lines */}
              <line
                x1={firstPoint.x - 0.06 * zoomScale}
                y1={firstPoint.y}
                x2={firstPoint.x + 0.06 * zoomScale}
                y2={firstPoint.y}
                stroke="#E53935"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={firstPoint.x}
                y1={firstPoint.y - 0.06 * zoomScale}
                x2={firstPoint.x}
                y2={firstPoint.y + 0.06 * zoomScale}
                stroke="#E53935"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={firstPoint.x}
                cy={firstPoint.y}
                r={0.01 * zoomScale}
                fill="#E53935"
              />
            </g>

            {/* Second trim point marker */}
            {secondPoint && (
              <g>
                {/* Cross marker - thin red lines */}
                <line
                  x1={secondPoint.x - 0.06 * zoomScale}
                  y1={secondPoint.y}
                  x2={secondPoint.x + 0.06 * zoomScale}
                  y2={secondPoint.y}
                  stroke="#E53935"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={secondPoint.x}
                  y1={secondPoint.y - 0.06 * zoomScale}
                  x2={secondPoint.x}
                  y2={secondPoint.y + 0.06 * zoomScale}
                  stroke="#E53935"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={secondPoint.x}
                  cy={secondPoint.y}
                  r={0.01 * zoomScale}
                  fill="#E53935"
                />
              </g>
            )}

            {/* Highlighted section between the two points */}
            {highlightSegment && wallId && (() => {
              const wall = shapes.find(s => s.type === 'wall' && s.id === wallId) as WallShape | undefined;
              if (!wall) return null;

              const { start, end } = highlightSegment;
              const thickness = wall.thickness || 0.1524;
              const half = thickness / 2;
              const alignment = wall.alignment || 'center';

              // Calculate perpendicular direction (matches wall geometry calculation)
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const len = Math.hypot(dx, dy);
              if (len < 0.001) return null;
              
              const perpX = -dy / len;
              const perpY = dx / len;

              // Calculate alignment shift (same logic as walls.ts buildGeometry)
              // 'center': alignmentShift = 0
              // 'inside': alignmentShift = half (shifts wall towards positive perpendicular)
              // 'outside': alignmentShift = -half (shifts wall towards negative perpendicular)
              let alignmentShift = 0;
              if (alignment === 'inside') {
                alignmentShift = half;
              } else if (alignment === 'outside') {
                alignmentShift = -half;
              }

              // Left edge offset: alignmentShift + half
              // Right edge offset: alignmentShift - half
              const offsetLeft = alignmentShift + half;
              const offsetRight = alignmentShift - half;

              // Create a rectangle for the highlighted section
              // Points: start-left, end-left, end-right, start-right
              const p1 = { x: start.x + perpX * offsetLeft, y: start.y + perpY * offsetLeft };
              const p2 = { x: end.x + perpX * offsetLeft, y: end.y + perpY * offsetLeft };
              const p3 = { x: end.x + perpX * offsetRight, y: end.y + perpY * offsetRight };
              const p4 = { x: start.x + perpX * offsetRight, y: start.y + perpY * offsetRight };

              return (
                <polygon
                  points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                  fill="#E53935"
                  opacity={0.2}
                  stroke="#E53935"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })()}

            {/* Length measurement and instruction label */}
            {highlightSegment && (() => {
              const segmentLength = Math.hypot(
                highlightSegment.end.x - highlightSegment.start.x,
                highlightSegment.end.y - highlightSegment.start.y
              );
              const formattedLength = formatLength(segmentLength, lengthUnit);
              const midX = (highlightSegment.start.x + highlightSegment.end.x) / 2;
              const midY = (highlightSegment.start.y + highlightSegment.end.y) / 2;
              
              // Calculate angle for positioning the label perpendicular to the wall
              const dx = highlightSegment.end.x - highlightSegment.start.x;
              const dy = highlightSegment.end.y - highlightSegment.start.y;
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              
              // Adjust text rotation to keep it readable (not upside down)
              const textAngle = (angle > 90 || angle < -90) ? angle + 180 : angle;

              // Standard measurement chip sizing (matching other measurements)
              const fontSize = 0.08 * zoomScale;
              const chipPadding = 0.025 * zoomScale;
              const charWidth = fontSize * 0.55;
              const chipWidth = formattedLength.length * charWidth + chipPadding * 2;
              const chipHeight = 0.12 * zoomScale;
              
              // Instruction text based on confirmation status
              const isConfirmed = trimState.isConfirmed;
              const instructionText = isConfirmed ? 'Enter or Delete to trim' : 'Click to confirm';
              const instructionWidth = isConfirmed ? 1.2 * zoomScale : 0.85 * zoomScale;

              return (
                <g>
                  {/* Length measurement along the segment */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    {/* Background for length text */}
                    <g transform={`rotate(${textAngle})`}>
                      <rect
                        x={-chipWidth / 2}
                        y={-chipHeight / 2}
                        width={chipWidth}
                        height={chipHeight}
                        fill="#E53935"
                        rx={0.03 * zoomScale}
                      />
                      <text
                        x={0}
                        y={0}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="600"
                        fontFamily="'Courier New', Courier, monospace"
                        style={{ userSelect: 'none' }}
                      >
                        {formattedLength}
                      </text>
                    </g>
                  </g>
                  
                  {/* Instruction label above */}
                  <g transform={`translate(${midX}, ${midY - 0.25 * zoomScale})`}>
                    <rect
                      x={-instructionWidth / 2}
                      y={-chipHeight / 2}
                      width={instructionWidth}
                      height={chipHeight}
                      fill={isConfirmed ? 'rgba(33, 150, 83, 0.9)' : 'rgba(0,0,0,0.8)'}
                      rx={0.03 * zoomScale}
                    />
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={fontSize}
                      fontWeight="600"
                      style={{ userSelect: 'none' }}
                    >
                      {instructionText}
                    </text>
                  </g>
                </g>
              );
            })()}
          </g>
        );
      })()}

      {/* Render all completed shapes (viewport-culled for performance) */}
      {visibleShapes.map(shape => {
        const isInMultiSelection = selectedShapeIds.length > 1 && selectedShapeIds.includes(shape.id);
        const shouldHideMeasurements = isInMultiSelection; // Only hide in multi-select to avoid clutter
        // Show individual selection indicators:
        // - Always for single selection
        // - For multi-selection via click (not box) - show individual indicators
        // - For multi-selection via box - don't show individual indicators (consolidated box is shown)
        const showAsSelected = (shape.id === selectedShapeId && selectedShapeIds.length <= 1) || 
          (isInMultiSelection && !multiSelectViaBox);

        if (shape.type === 'line') {
          return (
            <LineShape
              key={shape.id}
              shape={shape}
              showMeasurements={showMeasurements && !shouldHideMeasurements}
              measurementSettings={measurementSettings}
              isSelected={showAsSelected}
              isHovered={shape.id === hoveredShapeId && !isInMultiSelection}
              activeTool={activeTool}
              lengthUnit={lengthUnit}
              zoomScale={zoomScale}
              onMouseDown={handleMouseDown}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
              useDimensionLayer={true}
            />
          );
        } else if (shape.type === 'polyline') {
          const isActivePolyline = showAsSelected;
          const polylineIsBeingResized = isActivePolyline && (isResizing || isResizingPolylineCorner);
          return (
            <PolylineShape
              key={shape.id}
              shape={shape}
              showMeasurements={(showMeasurements && !shouldHideMeasurements) || polylineIsBeingResized}
              measurementSettings={measurementSettings}
              isSelected={isActivePolyline}
              isHovered={shape.id === hoveredShapeId && !isInMultiSelection}
              activeTool={activeTool}
              lengthUnit={lengthUnit}
              zoomScale={zoomScale}
              onMouseDown={handleMouseDown}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
              useDimensionLayer={true}
            />
          );
        } else if (shape.type === 'curve') {
          return (
            <CurveShapeComponent
              key={shape.id}
              shape={shape}
              showMeasurements={showMeasurements && !shouldHideMeasurements}
              measurementSettings={measurementSettings}
              isSelected={showAsSelected}
              isHovered={shape.id === hoveredShapeId && !isInMultiSelection}
              activeTool={activeTool}
              lengthUnit={lengthUnit}
              zoomScale={zoomScale}
              onMouseDown={handleMouseDown}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
              useDimensionLayer={true}
            />
          );
        } else if (shape.type === 'arc') {
          return (
            <ArcShapeComponent
              key={shape.id}
              shape={shape}
              showMeasurements={showMeasurements && !shouldHideMeasurements}
              measurementSettings={measurementSettings}
              isSelected={showAsSelected}
              isHovered={shape.id === hoveredShapeId && !isInMultiSelection}
              activeTool={activeTool}
              lengthUnit={lengthUnit}
              zoomScale={zoomScale}
              onMouseDown={handleMouseDown}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
              useDimensionLayer={true}
            />
          );
        } else if (shape.type === 'circle') {
          return (
            <CircleShapeComponent
              key={shape.id}
              shape={shape}
              showMeasurements={showMeasurements && !shouldHideMeasurements}
              measurementSettings={measurementSettings}
              isSelected={showAsSelected}
              isHovered={shape.id === hoveredShapeId && !isInMultiSelection}
              activeTool={activeTool}
              lengthUnit={lengthUnit}
              zoomScale={zoomScale}
              onMouseDown={handleMouseDown}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
              useDimensionLayer={true}
            />
          );
        } else if (shape.type === 'rectangle') {
          return (
            <RectangleShapeComponent
              key={shape.id}
              shape={shape}
              showMeasurements={showMeasurements && !shouldHideMeasurements}
              measurementSettings={measurementSettings}
              isSelected={showAsSelected}
              isHovered={shape.id === hoveredShapeId && !isInMultiSelection}
              activeTool={activeTool}
              lengthUnit={lengthUnit}
              zoomScale={zoomScale}
              onMouseDown={handleMouseDown}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
              useDimensionLayer={true}
            />
          );
        } else if (shape.type === 'wall') {
          const isWallBeingCurved = isCurvingWall && curvingWallId === shape.id;
          // Hide measurements for walls in an active chain session (except the one being drawn)
          // In chain mode, completed walls are added to chainSessionShapeIds while user continues drawing
          const isInActiveChainSession =
            wallMode === 'chain' &&
            chainSessionShapeIds.length > 0 &&
            chainSessionShapeIds.includes(shape.id);
          const showWallMeasurements =
            !isInActiveChainSession &&
            (
              (showMeasurements && !shouldHideMeasurements) ||
              (showAsSelected && (isResizing || isWallBeingCurved))
            );
          return (
            <WallShapeComponent
              key={shape.id}
              shape={shape}
              joinCaps={wallJoinOverrides[shape.id]}
              openings={openingsByWallId.get(shape.id)}
              isSelected={showAsSelected}
              zoomScale={zoomScale}
              lengthUnit={lengthUnit}
              showMeasurements={showWallMeasurements}
              measurementSettings={measurementSettings}
              showCenterline={showWallCenterline}
              hideStrokes={true}
              onMouseDown={handleMouseDown}
              onCurveHandleMouseDown={handleWallCurveHandleStart}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
            />
          );
        } else if (shape.type === 'room') {
          const roomShape = shape as RoomShape;
          return (
            <RoomShapeComponent
              key={roomShape.id}
              shape={roomShape}
              lengthUnit={lengthUnit}
              isSelected={showAsSelected}
              activeTool={activeTool}
              showMeasurements={showMeasurements && !shouldHideMeasurements}
              measurementSettings={measurementSettings}
              useDimensionLayer={true}
              onMouseDown={handleMouseDown}
              zoomScale={zoomScale}
              onMouseEnter={(id) => setHoveredShapeId(id)}
              onMouseLeave={() => setHoveredShapeId(null)}
              onLabelClick={onRoomLabelEditRequest}
            />
          );
        } else if (shape.type === 'guideline') {
          return (
            <GuidelineShapeComponent
              key={shape.id}
              shape={shape}
              showMeasurements={showMeasurements && !showAsSelected}
              isSelected={showAsSelected}
              isHovered={shape.id === hoveredShapeId && !isInMultiSelection}
              activeTool={activeTool}
              lengthUnit={lengthUnit}
              zoomScale={zoomScale}
              viewBox={viewBox}
              onMouseDown={handleMouseDown}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
            />
          );
        } else if (shape.type === 'marker') {
          // Markers should show selection even in multi-select (they're small, won't clutter)
          const markerIsSelected = showAsSelected || isInMultiSelection;
          return (
            <MarkerShapeComponent
              key={shape.id}
              shape={shape}
              isSelected={markerIsSelected}
              isHovered={shape.id === hoveredShapeId && !isInMultiSelection}
              activeTool={activeTool}
              zoomScale={zoomScale}
              showMarkers={showMarkers}
              onMouseDown={handleMouseDown}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
            />
          );
        } else if (shape.type === 'opening') {
          // Respect global toggle, but allow showing for selected openings (only when single selection)
          const shouldShowOpeningMeasurements =
            (showMeasurements && !shouldHideMeasurements) ||
            showAsSelected;
          return (
            <OpeningShapeComponent
              key={shape.id}
              shape={shape}
              isSelected={showAsSelected}
              isHovered={shape.id === hoveredShapeId && !isInMultiSelection}
              zoomScale={zoomScale}
              lengthUnit={lengthUnit}
              showMeasurements={shouldShowOpeningMeasurements}
              measurementSettings={measurementSettings}
              useDimensionLayer={true}
              toolbarStyle={toolbarStyle}
              onMouseDown={handleMouseDown}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
              onFlip={controller.openingFlip}
            />
          );
        } else if (shape.type === 'zone') {
          // Disabled zones return null from the component, but we still render them
          // so that the component can decide whether to show
          return (
            <ZoneShapeComponent
              key={shape.id}
              shape={shape}
              isSelected={showAsSelected}
              isHovered={shape.id === hoveredShapeId && !isInMultiSelection}
              lengthUnit={lengthUnit}
              showMeasurements={showMeasurements && !shouldHideMeasurements}
              measurementSettings={measurementSettings}
              onMouseDown={handleMouseDown}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
            />
          );
        } else if (shape.type === 'dimension') {
          return (
            <DimensionShape
              key={shape.id}
              shape={shape}
              isSelected={showAsSelected}
              zoomScale={zoomScale}
              lengthUnit={lengthUnit}
              onMouseDown={handleMouseDown}
            />
          );
        } else if (shape.type === 'text') {
          return (
            <TextShapeComponent
              key={shape.id}
              shape={shape}
              isSelected={showAsSelected}
              isHovered={shape.id === hoveredShapeId && !isInMultiSelection}
              zoomScale={zoomScale}
              onMouseDown={handleMouseDown}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
            />
          );
        }
        return null;
      })}

      {/* Render current shape being drawn with measurements */}
      {currentShape && currentShape.type === 'line' && (
        <LineShape
          shape={currentShape}
          showMeasurements={isDrawing}
          isSelected={false}
          isHovered={false}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          useDimensionLayer={true}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => { }}
          onMouseLeave={() => { }}
        />
      )}

      {currentShape && currentShape.type === 'polyline' && (
        <PolylineShape
          shape={currentShape}
          showMeasurements={isDrawing}
          isSelected={false}
          isHovered={false}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => { }}
          onMouseLeave={() => { }}
        />
      )}

      {currentShape && currentShape.type === 'curve' && (
        <CurveShapeComponent
          shape={currentShape}
          showMeasurements={isDrawing}
          isSelected={false}
          isHovered={false}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          useDimensionLayer={true}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => { }}
          onMouseLeave={() => { }}
        />
      )}

      {currentShape && currentShape.type === 'arc' && (
        <ArcShapeComponent
          shape={currentShape}
          showMeasurements={isDrawing}
          isSelected={false}
          isHovered={false}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          useDimensionLayer={true}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => { }}
          onMouseLeave={() => { }}
        />
      )}

      {currentShape && currentShape.type === 'circle' && (
        <CircleShapeComponent
          shape={currentShape}
          showMeasurements={isDrawing}
          isSelected={false}
          isHovered={false}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          useDimensionLayer={true}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => { }}
          onMouseLeave={() => { }}
        />
      )}

      {currentShape && currentShape.type === 'rectangle' && (
        <RectangleShapeComponent
          shape={currentShape}
          showMeasurements={isDrawing}
          isSelected={false}
          isHovered={false}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          useDimensionLayer={true}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => { }}
          onMouseLeave={() => { }}
        />
      )}

      {currentShape && currentShape.type === 'wall' && (
        <WallShapeComponent
          shape={currentShape as WallShape}
          joinCaps={wallJoinOverrides[currentShape.id]}
          openings={[]}
          isSelected={false}
          zoomScale={zoomScale}
          lengthUnit={lengthUnit}
          showMeasurements={isDrawing}
          showCenterline={showWallCenterline}
          hideStrokes={true}
          onMouseDown={handleMouseDown}
          onCurveHandleMouseDown={handleWallCurveHandleStart}
          onMouseEnter={() => { }}
          onMouseLeave={() => { }}
        />
      )}

      {currentShape && currentShape.type === 'opening' && (
        <OpeningShapeComponent
          shape={currentShape}
          isSelected={false}
          isHovered={false}
          zoomScale={zoomScale}
          lengthUnit={lengthUnit}
          showMeasurements={isDrawing}
          toolbarStyle={toolbarStyle}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => { }}
          onMouseLeave={() => { }}
        />
      )}

      {currentShape && currentShape.type === 'zone' && (
        <ZoneShapeComponent
          shape={currentShape}
          isSelected={false}
          isHovered={false}
          lengthUnit={lengthUnit}
          showMeasurements={isDrawing}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => { }}
          onMouseLeave={() => { }}
        />
      )}

      {currentShape && currentShape.type === 'dimension' && (
        <DimensionShape
          shape={currentShape}
          isSelected={false}
          zoomScale={zoomScale}
          lengthUnit={lengthUnit}
        />
      )}

      {currentShape && currentShape.type === 'text' && (
        <TextShapeComponent
          shape={currentShape}
          isSelected={true}
          isHovered={false}
          zoomScale={zoomScale}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => { }}
          onMouseLeave={() => { }}
        />
      )}

      {currentShape && currentShape.type === 'guideline' && (
        <GuidelineShapeComponent
          shape={currentShape}
          showMeasurements={currentShape.orientation === 'freeform' && isDrawing}
          isSelected={false}
          isHovered={false}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          viewBox={viewBox}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => { }}
          onMouseLeave={() => { }}
        />
      )}

      {/* Closed regions from non-wall shapes (circles, rectangles, polylines, arcs, curves) */}
      {/* Rendered AFTER shapes so the highlight overlays appear on top */}
      {/* Only show fill on hover (same behavior as wall interior holes) */}
      {zoneHoverEnabled && closedRegions.length > 0 && (
        <g className="closed-shape-regions" data-export-exclude="true">
          {closedRegions.map((region, regionIndex) => {
            const isHovered = hoveredClosedRegionIndex === regionIndex;
            const isFlashing = flashingClosedRegions.has(regionIndex);
            const showTint = isHovered || isFlashing;
            
            return (
              <polygon
                key={`closed-region-${regionIndex}`}
                points={region.polygon.map(p => `${p.x},${p.y}`).join(' ')}
                fill={showTint ? (isClean ? "rgba(0, 0, 0, 0.08)" : "rgba(180, 160, 220, 0.18)") : "transparent"}
                stroke="none"
                pointerEvents="auto"
                style={{ cursor: 'pointer', transition: 'fill 0.3s ease' }}
                onMouseEnter={() => setHoveredClosedRegionIndex(regionIndex)}
                onMouseLeave={() => setHoveredClosedRegionIndex(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  // Create zone from the closed region polygon
                  controller.createZoneFromPolygon(region.polygon);
                  // Notify parent that a zone was interacted with
                  onZoneInteract?.();
                }}
              />
            );
          })}
        </g>
      )}

      {/* Render bounding box for selected shape - only for single selection */}
      {activeTool === 'select' && selectedShapeId && selectedShapeIds.length <= 1 && shapes.find(s => s.id === selectedShapeId) && (() => {
        const selectedShape = shapes.find(s => s.id === selectedShapeId)!;
        let roomWallBounds: { minX: number; maxX: number; minY: number; maxY: number } | undefined;
        if (selectedShape.type === 'room') {
          if (selectedShape.bounds) {
            roomWallBounds = selectedShape.bounds;
          } else if (selectedShape.wallIds && selectedShape.wallIds.length > 0) {
            const wallPoints: Point[] = [];
            selectedShape.wallIds.forEach((wallId) => {
              const wallShape = shapes.find((shape): shape is WallShape => shape.type === 'wall' && shape.id === wallId);
              if (!wallShape) return;
              const polygon = getWallPolygonPoints(wallShape, wallJoinOverrides[wallShape.id]);
              if (polygon && polygon.length > 0) {
                wallPoints.push(...polygon);
              }
            });
            if (wallPoints.length > 0) {
              const xs = wallPoints.map((p) => p.x);
              const ys = wallPoints.map((p) => p.y);
              roomWallBounds = {
                minX: Math.min(...xs),
                maxX: Math.max(...xs),
                minY: Math.min(...ys),
                maxY: Math.max(...ys),
              };
            }
          }
        }
        const showBoundingMeasurements =
          (isResizing ||
            isResizingPolylineCorner ||
            isResizingRectangleEdge ||
            isResizingRoomCorner) &&
          selectedShape.type !== 'wall';
        return (
          <BoundingBox
            shape={selectedShape}
            selectionTargetId={selectedShapeId ?? undefined}
            zoomScale={zoomScale}
            onMouseDown={handleMouseDown}
            onResizeStart={handleResizeStart}
            onPolylineCornerResizeStart={handlePolylineCornerResizeStart}
            onRectangleEdgeResizeStart={handleRectangleEdgeResizeStart}
            onRoomCornerResizeStart={handleRoomCornerResizeStart}
            showMeasurements={showBoundingMeasurements}
            measurementSettings={measurementSettings}
            lengthUnit={lengthUnit}
            roomWallBounds={roomWallBounds}
          />
        );
      })()}

      {/* Render consolidated bounding box for multiple selected shapes - only when selected via box (not shift/ctrl+click) */}
      {multiSelectViaBox && activeTool === 'select' && selectedShapeIds.length > 1 && (() => {
        const selectedShapes = shapes.filter(s => selectedShapeIds.includes(s.id));
        if (selectedShapes.length === 0) return null;

        // Calculate consolidated bounding box from all selected shapes
        const allPoints: Point[] = [];
        selectedShapes.forEach(shape => {
          if (shape.type === 'line') {
            allPoints.push(shape.start, shape.end);
          } else if (shape.type === 'polyline') {
            allPoints.push(...shape.points);
          } else if (shape.type === 'curve') {
            // For curves, sample the actual spline path to get accurate bounds
            const bounds = calculateCurveBounds(shape.points, 20, 0);
            allPoints.push(
              { x: bounds.minX, y: bounds.minY },
              { x: bounds.maxX, y: bounds.minY },
              { x: bounds.maxX, y: bounds.maxY },
              { x: bounds.minX, y: bounds.maxY }
            );
          } else if (shape.type === 'arc') {
            const bounds = computeArcBounds(shape);
            allPoints.push(
              { x: bounds.minX, y: bounds.minY },
              { x: bounds.maxX, y: bounds.minY },
              { x: bounds.maxX, y: bounds.maxY },
              { x: bounds.minX, y: bounds.maxY },
            );
          } else if (shape.type === 'circle') {
            // Add 4 cardinal points on the circle perimeter to define bounding box
            allPoints.push(
              { x: shape.center.x - shape.radius, y: shape.center.y }, // left
              { x: shape.center.x + shape.radius, y: shape.center.y }, // right
              { x: shape.center.x, y: shape.center.y - shape.radius }, // top
              { x: shape.center.x, y: shape.center.y + shape.radius }  // bottom
            );
          } else if (shape.type === 'rectangle') {
            allPoints.push(shape.start, shape.end);
          } else if (shape.type === 'room') {
            allPoints.push(...shape.points);
          } else if (shape.type === 'wall') {
            const polygon = getWallPolygonPoints(shape, wallJoinOverrides[shape.id]);
            allPoints.push(...polygon);
          } else if (shape.type === 'zone') {
            allPoints.push(...shape.points);
          } else if (shape.type === 'text') {
            // Add text bounds
            const textAnchor = shape.textAlign === 'center' ? 'middle' :
              shape.textAlign === 'right' ? 'end' : 'start';
            const width = shape.content.length * shape.fontSize * 0.6;
            const height = shape.fontSize * 1.2;
            const x = shape.position.x - (textAnchor === 'middle' ? width / 2 : textAnchor === 'end' ? width : 0);
            const y = shape.position.y - shape.fontSize * 0.7;
            allPoints.push(
              { x, y },
              { x: x + width, y },
              { x: x + width, y: y + height },
              { x, y: y + height }
            );
          }
        });

        if (allPoints.length < 2) return null;

        const xs = allPoints.map(p => p.x);
        const ys = allPoints.map(p => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        const canRotateSelection = selectedShapes.every(isShapeRotatable);

        // Create a virtual polyline shape for the consolidated bounding box
        const consolidatedShape: Shape = {
          type: 'polyline',
          id: 'multi-select',
          points: [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY },
          ],
          stroke: '#000000',
          strokeWidth: 1,
        };

        const rotationHandle = canRotateSelection ? (() => {
          const pivotPoint: Point = {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
          };
          const offset = 0.35 * zoomScale;
          const handleRadius = 0.04 * zoomScale;
          const handlePoint: Point = {
            x: pivotPoint.x,
            y: minY - offset,
          };
          const anglePreview = rotationPreview ? rotationPreview : null;

          const label = anglePreview ? (() => {
            const formattedAbs = `${anglePreview.absoluteAngle.toFixed(1)}°`;
            const formattedDelta = anglePreview.deltaAngle !== 0
              ? ` (Δ${anglePreview.deltaAngle >= 0 ? '+' : ''}${anglePreview.deltaAngle.toFixed(1)}°)`
              : '';
            const labelText = `${formattedAbs}${formattedDelta}`;
            const chipPadding = 0.02;
            const fontSize = 0.065;
            const charWidth = fontSize * 0.6; // Slightly wider for monospace
            const chipWidth = labelText.length * charWidth + chipPadding * 2;
            const chipHeight = fontSize + chipPadding * 2;
            const labelOffset = 0.15 * zoomScale;
            const labelPoint = {
              x: handlePoint.x,
              y: handlePoint.y - labelOffset,
            };
            const chipColor = anglePreview.absoluteAngle >= 0 ? '#00BFA5' : '#F59E0B';
            const textColor = '#ffffff';
            return (
              <g transform={`translate(${labelPoint.x}, ${labelPoint.y}) scale(${zoomScale})`}>
                <rect
                  x={-chipWidth / 2}
                  y={-chipHeight / 2}
                  width={chipWidth}
                  height={chipHeight}
                  fill={chipColor}
                  rx={0.02}
                  opacity={0.9}
                />
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={textColor}
                  fontSize={fontSize}
                  fontWeight="600"
                  fontFamily="'Courier New', Courier, monospace"
                  style={{ userSelect: 'none' }}
                >
                  {labelText}
                </text>
              </g>
            );
          })() : null;

          return (
            <g key="multi-rotate-handle" data-export-exclude="true">
              <line
                x1={pivotPoint.x}
                y1={minY}
                x2={handlePoint.x}
                y2={handlePoint.y}
                stroke="#4A90E2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
              <circle
                cx={handlePoint.x}
                cy={handlePoint.y}
                r={handleRadius}
                fill="#ffffff"
                stroke="#4A90E2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                cursor="grab"
                onMouseDown={(e) => handleRotateHandleStart(e, pivotPoint)}
              />
              {label}
            </g>
          );
        })() : null;

        return (
          <>
            <BoundingBox
              shape={consolidatedShape}
              selectionTargetId={MULTI_SELECT_ID}
              zoomScale={zoomScale}
              onMouseDown={handleMouseDown}
              onResizeStart={handleResizeStart}
              onPolylineCornerResizeStart={handlePolylineCornerResizeStart}
              onRectangleEdgeResizeStart={handleRectangleEdgeResizeStart}
              showMeasurements={isResizing || isResizingPolylineCorner || isResizingRectangleEdge}
              lengthUnit={lengthUnit}
            />
            {rotationHandle}
          </>
        );
      })()}

      {/* Snap indicator */}
      {snapIndicator && snapSettings?.enabled && (
        <g className="snap-indicator" data-export-exclude="true">
          {(() => {
            const getSnapColor = (type: string) => {
              switch (type) {
                case 'endpoint': return '#7B8CDE';
                case 'midpoint': return '#8FBC8F';
                case 'semicircle': return '#B26DFF';
                case 'nearest': return '#DDA15E';
                case 'intersection': return '#E07A7A';
                case 'grid': return '#6B8FCC';
                case 'quadrant': return '#D4A5A5';
                case 'center': return '#81B29A';
                case 'parallel': return '#FFB703';
                case 'perpendicular': return '#219EBC';
                case 'ortho-horizontal': return '#00BFA5'; // Teal for horizontal ortho
                case 'ortho-vertical': return '#00BFA5';   // Teal for vertical ortho
                case 'ortho-grid': return '#00897B';       // Darker teal for ortho+grid precision
                case 'wall-extended': return '#E91E63'; // Distinct pink/magenta for wall-extended
                default: return '#95A5A6';
              }
            };

            const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
            const getSnapLabel = (type: string) => {
              switch (type) {
                case 'ortho-horizontal': return 'Horizontal';
                case 'ortho-vertical': return 'Vertical';
                case 'ortho-grid': return 'Ortho+Grid';
                case 'wall-extended': return 'Wall Extended';
                default: return capitalize(type);
              }
            };
            const color = getSnapColor(snapIndicator.type);
            const chipPadding = 0.02;
            const fontSize = 0.065;
            const charWidth = fontSize * 0.55;
            const labelText = getSnapLabel(snapIndicator.type);
            const chipWidth = labelText.length * charWidth + chipPadding * 2;
            const chipHeight = fontSize + chipPadding * 2;

            return (
              <>
                {snapIndicator.type === 'endpoint' && (
                  <circle
                    cx={snapIndicator.point.x}
                    cy={snapIndicator.point.y}
                    r={0.03 * zoomScale}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.01 * zoomScale}
                    pointerEvents="none"
                  />
                )}
                {snapIndicator.type === 'midpoint' && (
                  <g transform={`translate(${snapIndicator.point.x}, ${snapIndicator.point.y}) scale(${zoomScale})`}>
                    <path
                      d="M 0,-0.035 L 0.035,0 L 0,0.035 L -0.035,0 Z"
                      fill="none"
                      stroke={color}
                      strokeWidth={0.01}
                      pointerEvents="none"
                    />
                  </g>
                )}
                {snapIndicator.type === 'nearest' && (
                  <circle
                    cx={snapIndicator.point.x}
                    cy={snapIndicator.point.y}
                    r={0.02 * zoomScale}
                    fill={color}
                    pointerEvents="none"
                  />
                )}
                {snapIndicator.type === 'intersection' && (
                  <g>
                    <line
                      x1={snapIndicator.point.x - 0.035 * zoomScale}
                      y1={snapIndicator.point.y - 0.035 * zoomScale}
                      x2={snapIndicator.point.x + 0.035 * zoomScale}
                      y2={snapIndicator.point.y + 0.035 * zoomScale}
                      stroke={color}
                      strokeWidth={0.01 * zoomScale}
                      pointerEvents="none"
                    />
                    <line
                      x1={snapIndicator.point.x + 0.035 * zoomScale}
                      y1={snapIndicator.point.y - 0.035 * zoomScale}
                      x2={snapIndicator.point.x - 0.035 * zoomScale}
                      y2={snapIndicator.point.y + 0.035 * zoomScale}
                      stroke={color}
                      strokeWidth={0.01 * zoomScale}
                      pointerEvents="none"
                    />
                  </g>
                )}
                {snapIndicator.type === 'wall-extended' && (
                  <g transform={`translate(${snapIndicator.point.x}, ${snapIndicator.point.y}) scale(${zoomScale})`}>
                    {/* Square with arrow indicating extended point */}
                    <rect
                      x={-0.025}
                      y={-0.025}
                      width={0.05}
                      height={0.05}
                      fill="none"
                      stroke={color}
                      strokeWidth={0.01}
                      pointerEvents="none"
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r={0.015}
                      fill={color}
                      pointerEvents="none"
                    />
                  </g>
                )}
                {!['endpoint', 'midpoint', 'nearest', 'intersection', 'wall-extended'].includes(snapIndicator.type) && (
                  <circle
                    cx={snapIndicator.point.x}
                    cy={snapIndicator.point.y}
                    r={0.02 * zoomScale}
                    fill={color}
                    pointerEvents="none"
                  />
                )}
                <g transform={`translate(${snapIndicator.point.x}, ${snapIndicator.point.y - 0.15 * zoomScale}) scale(${zoomScale})`}>
                  <rect
                    x={-chipWidth / 2}
                    y={-chipHeight / 2}
                    width={chipWidth}
                    height={chipHeight}
                    fill={color}
                    rx="0.02"
                    opacity="0.9"
                  />
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={fontSize}
                    fontWeight="600"
                    style={{ userSelect: 'none' }}
                  >
                    {labelText}
                  </text>
                </g>
              </>
            );
          })()}
        </g>
      )}
    </>
  );

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      style={{
        display: 'block',
        backgroundColor: isClean ? '#ffffff' : isCyber ? '#0a2540' : isFunk ? '#f0f0f0' : isWindows95 ? '#008080' : '#ffffff',
        margin: 0,
        padding: 0,
        cursor: getCursorStyle(),
      }}
      onClick={(e) => {
        handleClick(e);
        handleCanvasClick();
      }}
      onMouseDown={(e) => {
        // Only handle mouse down on canvas background if select tool is active and not clicking on a shape
        if (activeTool === 'select' && e.target === e.currentTarget) {
          handleMouseDown(e);
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Grid patterns - 3-tier hierarchical system */}
      <GridPatterns gridSystem={gridSystem} toolbarStyle={toolbarStyle} />

      {/* Appearance definitions - patterns, gradients, filters */}
      <AppearanceRenderer />

      {/* Infinite grid background - layered from finest to coarsest */}
      {showGrid && (
        <>
          {/* Minor grid - finest */}
          <rect
            x={viewBox.x - extension}
            y={viewBox.y - extension}
            width={viewBox.width + extension * 2}
            height={viewBox.height + extension * 2}
            fill="url(#minorGrid)"
            pointerEvents="none"
          />

          {/* Medium grid - intermediate */}
          <rect
            x={viewBox.x - extension}
            y={viewBox.y - extension}
            width={viewBox.width + extension * 2}
            height={viewBox.height + extension * 2}
            fill="url(#mediumGrid)"
            pointerEvents="none"
          />

          {/* Major grid - coarsest */}
          <rect
            x={viewBox.x - extension}
            y={viewBox.y - extension}
            width={viewBox.width + extension * 2}
            height={viewBox.height + extension * 2}
            fill="url(#majorGrid)"
            pointerEvents="none"
          />

        </>
      )}

      <DimensionCollectorProvider>{sceneContent}</DimensionCollectorProvider>

      {/* Measure tool temporary overlay */}
      {isMeasuring && measureStart && measureEnd && (() => {
        const length = calculateLength(measureStart, measureEnd);
        const angle = calculateAngle(measureStart, measureEnd);
        const lengthText = formatLength(length, lengthUnit);
        const angleText = formatAngle(angle);

        // Calculate midpoint for length label
        const midX = (measureStart.x + measureEnd.x) / 2;
        const midY = (measureStart.y + measureEnd.y) / 2;

        // Calculate label offset perpendicular to the line
        const dx = measureEnd.x - measureStart.x;
        const dy = measureEnd.y - measureStart.y;
        const lineLength = Math.hypot(dx, dy);
        const perpX = lineLength > 0 ? -dy / lineLength : 0;
        const perpY = lineLength > 0 ? dx / lineLength : 1;
        const labelOffset = 0.15 * zoomScale;

        // Chip styling
        const chipPadding = 0.025 * zoomScale;
        const fontSize = 0.08 * zoomScale;
        const charWidth = fontSize * 0.55;
        const getChipWidth = (text: string) => text.length * charWidth + chipPadding * 2;
        const chipHeight = fontSize + chipPadding * 2;

        // Arc visualization for angle
        const arcRadius = 0.25 * zoomScale;
        const lineAngleRad = Math.atan2(dy, dx);
        const horizontalX = measureStart.x + arcRadius;
        const horizontalY = measureStart.y;
        const lineEndX = measureStart.x + arcRadius * Math.cos(lineAngleRad);
        const lineEndY = measureStart.y + arcRadius * Math.sin(lineAngleRad);
        const sweepFlag = lineAngleRad > 0 ? 1 : 0;

        const measureColor = '#FF0000'; // Red for measure tool

        return (
          <g pointerEvents="none">
            {/* Measurement line */}
            <line
              x1={measureStart.x}
              y1={measureStart.y}
              x2={measureEnd.x}
              y2={measureEnd.y}
              stroke={measureColor}
              strokeWidth={1}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />

            {/* Start point crosshair indicator */}
            <g>
              {/* Vertical line */}
              <line
                x1={measureStart.x}
                y1={measureStart.y - 0.08 * zoomScale}
                x2={measureStart.x}
                y2={measureStart.y + 0.08 * zoomScale}
                stroke={measureColor}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              {/* Horizontal line */}
              <line
                x1={measureStart.x - 0.08 * zoomScale}
                y1={measureStart.y}
                x2={measureStart.x + 0.08 * zoomScale}
                y2={measureStart.y}
                stroke={measureColor}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </g>

            {/* End point crosshair indicator */}
            <g>
              {/* Vertical line */}
              <line
                x1={measureEnd.x}
                y1={measureEnd.y - 0.08 * zoomScale}
                x2={measureEnd.x}
                y2={measureEnd.y + 0.08 * zoomScale}
                stroke={measureColor}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              {/* Horizontal line */}
              <line
                x1={measureEnd.x - 0.08 * zoomScale}
                y1={measureEnd.y}
                x2={measureEnd.x + 0.08 * zoomScale}
                y2={measureEnd.y}
                stroke={measureColor}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </g>

            {/* Length label chip at midpoint */}
            {length > 0.01 && (
              <g transform={`translate(${midX + perpX * labelOffset}, ${midY + perpY * labelOffset})`}>
                <rect
                  x={-getChipWidth(lengthText) / 2}
                  y={-chipHeight / 2}
                  width={getChipWidth(lengthText)}
                  height={chipHeight}
                  fill={measureColor}
                  rx={chipHeight / 4}
                />
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={fontSize}
                  fontWeight="600"
                  fontFamily="'Courier New', Courier, monospace"
                  style={{ userSelect: 'none' }}
                >
                  {lengthText}
                </text>
              </g>
            )}

            {/* Angle arc visualization */}
            {length > 0.01 && Math.abs(angle) > 0.1 && (
              <path
                d={`
                  M ${measureStart.x},${measureStart.y}
                  L ${horizontalX},${horizontalY}
                  A ${arcRadius},${arcRadius} 0 0,${sweepFlag} ${lineEndX},${lineEndY}
                  Z
                `}
                fill={measureColor}
                opacity="0.2"
              />
            )}

            {/* Angle label chip at start point */}
            {length > 0.01 && (
              <g transform={`translate(${measureStart.x}, ${measureStart.y})`}>
                <rect
                  x={-getChipWidth(angleText) / 2}
                  y={-chipHeight / 2}
                  width={getChipWidth(angleText)}
                  height={chipHeight}
                  fill="#000000"
                  rx={chipHeight / 4}
                />
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={fontSize}
                  fontWeight="600"
                  fontFamily="'Courier New', Courier, monospace"
                  style={{ userSelect: 'none' }}
                >
                  {angleText}
                </text>
              </g>
            )}
          </g>
        );
      })()}

      {/* Marker chain mode preview line - shows distance/angle from last marker to cursor */}
      {activeTool === 'marker' && drawingMode === 'chain' && isMarkerChaining && markerChainStart && markerChainEnd && (() => {
        const length = calculateLength(markerChainStart, markerChainEnd);
        const angle = calculateAngle(markerChainStart, markerChainEnd);
        const lengthText = formatLength(length, lengthUnit);
        const angleText = formatAngle(angle);

        // Calculate midpoint for length label
        const midX = (markerChainStart.x + markerChainEnd.x) / 2;
        const midY = (markerChainStart.y + markerChainEnd.y) / 2;

        // Calculate label offset perpendicular to the line
        const dx = markerChainEnd.x - markerChainStart.x;
        const dy = markerChainEnd.y - markerChainStart.y;
        const lineLength = Math.hypot(dx, dy);
        const perpX = lineLength > 0 ? -dy / lineLength : 0;
        const perpY = lineLength > 0 ? dx / lineLength : 1;
        const labelOffset = 0.15 * zoomScale;

        // Chip styling
        const chipPadding = 0.025 * zoomScale;
        const fontSize = 0.08 * zoomScale;
        const charWidth = fontSize * 0.55;
        const getChipWidth = (text: string) => text.length * charWidth + chipPadding * 2;
        const chipHeight = fontSize + chipPadding * 2;

        // Arc visualization for angle
        const arcRadius = 0.25 * zoomScale;
        const lineAngleRad = Math.atan2(dy, dx);
        const horizontalX = markerChainStart.x + arcRadius;
        const horizontalY = markerChainStart.y;
        const lineEndX = markerChainStart.x + arcRadius * Math.cos(lineAngleRad);
        const lineEndY = markerChainStart.y + arcRadius * Math.sin(lineAngleRad);
        const sweepFlag = lineAngleRad > 0 ? 1 : 0;

        const markerChainColor = '#1976D2'; // Blue for marker chain mode

        return (
          <g pointerEvents="none">
            {/* Preview line */}
            <line
              x1={markerChainStart.x}
              y1={markerChainStart.y}
              x2={markerChainEnd.x}
              y2={markerChainEnd.y}
              stroke={markerChainColor}
              strokeWidth={1}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />

            {/* Angle arc fill */}
            {length > 0.05 && (
              <path
                d={`
                  M ${markerChainStart.x},${markerChainStart.y}
                  L ${horizontalX},${horizontalY}
                  A ${arcRadius},${arcRadius} 0 0,${sweepFlag} ${lineEndX},${lineEndY}
                  Z
                `}
                fill={markerChainColor}
                opacity="0.15"
              />
            )}

            {/* Length chip */}
            {length > 0.05 && (
              <g transform={`translate(${midX + perpX * labelOffset}, ${midY + perpY * labelOffset})`}>
                <rect
                  x={-getChipWidth(lengthText) / 2}
                  y={-chipHeight / 2}
                  width={getChipWidth(lengthText)}
                  height={chipHeight}
                  rx={chipHeight / 4}
                  fill={markerChainColor}
                  opacity="0.95"
                />
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={fontSize}
                  fontWeight="600"
                  fontFamily="'Courier New', Courier, monospace"
                  style={{ userSelect: 'none' }}
                >
                  {lengthText}
                </text>
              </g>
            )}

            {/* Angle chip */}
            {length > 0.05 && (
              <g transform={`translate(${markerChainStart.x + (arcRadius + 0.1 * zoomScale) * Math.cos(lineAngleRad / 2)}, ${markerChainStart.y + (arcRadius + 0.1 * zoomScale) * Math.sin(lineAngleRad / 2)})`}>
                <rect
                  x={-getChipWidth(angleText) / 2}
                  y={-chipHeight / 2}
                  width={getChipWidth(angleText)}
                  height={chipHeight}
                  rx={chipHeight / 4}
                  fill={markerChainColor}
                  opacity="0.95"
                />
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={fontSize}
                  fontWeight="600"
                  fontFamily="'Courier New', Courier, monospace"
                  style={{ userSelect: 'none' }}
                >
                  {angleText}
                </text>
              </g>
            )}
          </g>
        );
      })()}

      {/* Selection rectangle */}
      {isSelecting && selectionRect && (
        <rect
          x={Math.min(selectionRect.start.x, selectionRect.end.x)}
          y={Math.min(selectionRect.start.y, selectionRect.end.y)}
          width={Math.abs(selectionRect.end.x - selectionRect.start.x)}
          height={Math.abs(selectionRect.end.y - selectionRect.start.y)}
          fill={isClean ? 'rgba(0, 0, 0, 0.08)' : isFunk ? 'rgba(255, 105, 180, 0.2)' : isWindows95 ? 'rgba(0, 0, 128, 0.25)' : 'rgba(100, 149, 237, 0.15)'}
          stroke={isClean ? '#000000' : isFunk ? '#ff69b4' : isWindows95 ? '#000080' : 'rgba(65, 105, 225, 0.9)'}
          strokeWidth={isClean ? '1' : isFunk ? '2' : isWindows95 ? '1' : '0.5'}
          strokeDasharray={isClean ? 'none' : isWindows95 ? '2 2' : 'none'}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}

      {/* Simulation overlay (navigation agent) */}
      {simulationOverlay}
    </svg>
  );
};
