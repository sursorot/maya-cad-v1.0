/**
 * Current Shape Layer
 * 
 * Renders the shape currently being drawn.
 * Memoized to only re-render when current shape changes.
 */

import { memo } from 'react';
import type {
  Shape,
  WallShape,
  OpeningShape,
  ViewBox,
  LengthUnit,
  ToolbarStyle,
  ToolType,
} from '../../../types';
import type { WallJoinOverrides } from '../../../utils/walls';

import { LineShape } from '../LineShape';
import { PolylineShape } from '../PolylineShape';
import { ArcShapeComponent } from '../ArcShape';
import { CurveShapeComponent } from '../CurveShape';
import { CircleShapeComponent } from '../CircleShape';
import { RectangleShapeComponent } from '../RectangleShape';
import { GuidelineShapeComponent } from '../GuidelineShape';
import { WallShapeComponent } from '../WallShape';
import { OpeningShapeComponent } from '../OpeningShape';
import { ZoneShapeComponent } from '../../ZoneShape';
import { DimensionShape } from '../DimensionShape';
import { TextShapeComponent } from '../TextShape';

interface CurrentShapeLayerProps {
  /** Current shape being drawn */
  currentShape: Shape | null;
  /** Whether drawing is active */
  isDrawing: boolean;
  /** Active tool */
  activeTool: ToolType;
  /** Length unit */
  lengthUnit: LengthUnit;
  /** Zoom scale */
  zoomScale: number;
  /** ViewBox */
  viewBox: ViewBox;
  /** Toolbar style */
  toolbarStyle: ToolbarStyle;
  /** Wall join overrides */
  wallJoinOverrides: Record<string, WallJoinOverrides>;
  /** Whether to show wall centerline */
  showWallCenterline: boolean;
  /** Callbacks - matching useCanvasInteraction signatures */
  onMouseDown: (e: React.MouseEvent<Element>, shapeId?: string) => void;
  onWallCurveHandleStart: (e: React.MouseEvent<SVGElement>, shapeId?: string) => void;
  /** Force re-render token */
  renderToken?: number;
}

/**
 * Memoized current shape layer
 */
export const CurrentShapeLayer = memo(function CurrentShapeLayer({
  currentShape,
  isDrawing,
  activeTool,
  lengthUnit,
  zoomScale,
  viewBox,
  toolbarStyle,
  wallJoinOverrides,
  showWallCenterline,
  onMouseDown,
  onWallCurveHandleStart,
  renderToken,
}: CurrentShapeLayerProps) {
  if (!currentShape) {
    return null;
  }

  const noopEnter = () => { };
  const noopLeave = () => { };

  // Wrap onMouseDown to include shapeId
  const handleMouseDown = (e: React.MouseEvent) => {
    onMouseDown(e, currentShape.id);
  };

  switch (currentShape.type) {
    case 'line':
      return (
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
          onMouseEnter={noopEnter}
          onMouseLeave={noopLeave}
        />
      );

    case 'polyline':
      return (
        <PolylineShape
          shape={currentShape}
          showMeasurements={isDrawing}
          forceHatch={true}
          isSelected={false}
          isHovered={false}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          onMouseDown={handleMouseDown}
          onMouseEnter={noopEnter}
          onMouseLeave={noopLeave}
        />
      );

    case 'curve':
      return (
        <CurveShapeComponent
          shape={currentShape}
          showMeasurements={isDrawing}
          forceHatch={true}
          isSelected={false}
          isHovered={false}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          useDimensionLayer={true}
          onMouseDown={handleMouseDown}
          onMouseEnter={noopEnter}
          onMouseLeave={noopLeave}
        />
      );

    case 'arc':
      return (
        <ArcShapeComponent
          shape={currentShape}
          showMeasurements={isDrawing}
          forceHatch={true}
          isSelected={false}
          isHovered={false}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          useDimensionLayer={true}
          onMouseDown={handleMouseDown}
          onMouseEnter={noopEnter}
          onMouseLeave={noopLeave}
        />
      );

    case 'circle':
      return (
        <CircleShapeComponent
          shape={currentShape}
          showMeasurements={isDrawing}
          forceHatch={true}
          isSelected={false}
          isHovered={false}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          useDimensionLayer={true}
          onMouseDown={handleMouseDown}
          onMouseEnter={noopEnter}
          onMouseLeave={noopLeave}
        />
      );

    case 'rectangle':
      return (
        <RectangleShapeComponent
          shape={currentShape}
          showMeasurements={isDrawing}
          forceHatch={true}
          isSelected={false}
          isHovered={false}
          activeTool={activeTool}
          lengthUnit={lengthUnit}
          zoomScale={zoomScale}
          useDimensionLayer={true}
          onMouseDown={handleMouseDown}
          onMouseEnter={noopEnter}
          onMouseLeave={noopLeave}
        />
      );

    case 'wall':
      return (
        <WallShapeComponent
          shape={currentShape as WallShape}
          joinCaps={wallJoinOverrides[currentShape.id]}
          openings={[]}
          isSelected={true}
          zoomScale={zoomScale}
          lengthUnit={lengthUnit}
          showMeasurements={isDrawing}
          showCenterline={showWallCenterline}
          hideStrokes={false}
          onMouseDown={handleMouseDown}
          onCurveHandleMouseDown={(e) => onWallCurveHandleStart(e, currentShape.id)}
          onMouseEnter={noopEnter}
          onMouseLeave={noopLeave}
          renderToken={renderToken}
        />
      );

    case 'opening':
      return (
        <OpeningShapeComponent
          shape={currentShape as OpeningShape}
          isSelected={false}
          isHovered={false}
          zoomScale={zoomScale}
          lengthUnit={lengthUnit}
          showMeasurements={isDrawing}
          toolbarStyle={toolbarStyle}
          onMouseDown={handleMouseDown}
          onMouseEnter={noopEnter}
          onMouseLeave={noopLeave}
        />
      );

    case 'zone':
      return (
        <ZoneShapeComponent
          shape={currentShape}
          isSelected={false}
          isHovered={false}
          lengthUnit={lengthUnit}
          showMeasurements={isDrawing}
          onMouseDown={handleMouseDown}
          onMouseEnter={noopEnter}
          onMouseLeave={noopLeave}
        />
      );

    case 'dimension':
      return (
        <DimensionShape
          shape={currentShape}
          isSelected={false}
          zoomScale={zoomScale}
          lengthUnit={lengthUnit}
        />
      );

    case 'text':
      return (
        <TextShapeComponent
          shape={currentShape}
          isSelected={true}
          isHovered={false}
          zoomScale={zoomScale}
          onMouseDown={handleMouseDown}
          onMouseEnter={noopEnter}
          onMouseLeave={noopLeave}
        />
      );

    case 'guideline':
      return (
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
          onMouseEnter={noopEnter}
          onMouseLeave={noopLeave}
        />
      );

    default:
      return null;
  }
}, (prevProps, nextProps) => {
  // Only re-render when current shape changes
  if (prevProps.currentShape !== nextProps.currentShape) return false;
  if (prevProps.isDrawing !== nextProps.isDrawing) return false;
  if (prevProps.zoomScale !== nextProps.zoomScale) return false;
  if (prevProps.lengthUnit !== nextProps.lengthUnit) return false;
  if (prevProps.renderToken !== nextProps.renderToken) return false;
  return true;
});

