import type { Shape } from '../../types';
import {
  canHaveFill,
  canHaveStroke,
  getPresetsForShape,
} from '../../../../domain/workspace/core/appearanceUtils';

const LINE_BASED_TYPES = new Set<Shape['type']>([
  'line',
  'polyline',
  'curve',
  'arc',
  'guideline',
  'dimension',
]);

const AREA_BASED_TYPES = new Set<Shape['type']>([
  'circle',
  'rectangle',
  'room',
  'zone',
  'wall',
  'opening',
  'asset',
]);

export interface StyleCapabilities {
  total: number;
  shapeLabel: string;
  selectionLabel: string;
  fillShapeIds: string[];
  strokeShapeIds: string[];
  areaShapeIds: string[];
  linearShapeIds: string[];
  canEditFill: boolean;
  canEditStroke: boolean;
  showAdvancedStroke: boolean;
  canEditEffects: boolean;
  canEditBlendMode: boolean;
  canEditShadow: boolean;
  canUsePresets: boolean;
  presetCount: number;
}

export function getStyleCapabilities(shapes: Shape[]): StyleCapabilities {
  const total = shapes.length;
  if (total === 0) {
    return {
      total: 0,
      shapeLabel: 'No selection',
      selectionLabel: 'Select a shape',
      fillShapeIds: [],
      strokeShapeIds: [],
      areaShapeIds: [],
      linearShapeIds: [],
      canEditFill: false,
      canEditStroke: false,
      showAdvancedStroke: false,
      canEditEffects: false,
      canEditBlendMode: false,
      canEditShadow: false,
      canUsePresets: false,
      presetCount: 0,
    };
  }

  const fillShapeIds = shapes.filter(canHaveFill).map((shape) => shape.id);
  const strokeShapeIds = shapes.filter(canHaveStroke).map((shape) => shape.id);
  const areaShapeIds = shapes.filter((shape) => AREA_BASED_TYPES.has(shape.type)).map((shape) => shape.id);
  const linearShapeIds = shapes.filter((shape) => LINE_BASED_TYPES.has(shape.type)).map((shape) => shape.id);

  const isHomogeneousSelection = shapes.every((shape) => shape.type === shapes[0].type);
  const shapeLabel = isHomogeneousSelection ? formatShapeName(shapes[0].type) : 'Mixed Selection';
  const selectionLabel = total === 1 ? 'Single shape' : `${total} shapes selected`;

  const presetCount = isHomogeneousSelection ? getPresetsForShape(shapes[0].type).length : 0;

  return {
    total,
    shapeLabel,
    selectionLabel,
    fillShapeIds,
    strokeShapeIds,
    areaShapeIds,
    linearShapeIds,
    canEditFill: fillShapeIds.length > 0,
    canEditStroke: strokeShapeIds.length > 0,
    showAdvancedStroke: strokeShapeIds.length > 0 && strokeShapeIds.length === linearShapeIds.length,
    canEditEffects: total > 0,
    canEditBlendMode: areaShapeIds.length > 0,
    canEditShadow: areaShapeIds.length > 0,
    canUsePresets: isHomogeneousSelection && presetCount > 0,
    presetCount,
  };
}

function formatShapeName(value: Shape['type']): string {
  return value
    .split(/[-_]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

