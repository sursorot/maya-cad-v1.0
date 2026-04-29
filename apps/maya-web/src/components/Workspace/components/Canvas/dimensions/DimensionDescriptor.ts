import type { Point } from '../../../types';

export interface LinearDimensionDescriptor {
  type: 'linear';
  id: string;
  start: Point;
  end: Point;
  text: string;
  zoomScale: number;
  offset?: number;
  side?: -1 | 1;
  lineColor?: string;
  extensionColor?: string;
}

export interface ChipDimensionDescriptor {
  type: 'chip';
  id: string;
  position: Point;
  text: string;
  zoomScale: number;
  center?: boolean;
}

export interface ArcDimensionDescriptor {
  type: 'arc';
  id: string;
  center: Point;
  radius: number;
  startAngle: number;
  endAngle: number;
  isCCW: boolean;
  text: string;
  zoomScale: number;
  offset?: number;
}

export interface SpanDimensionDescriptor {
  type: 'span';
  id: string;
  start: Point;
  end: Point;
  text: string;
  zoomScale: number;
  offset?: number;
  lineColor?: string;
  extensionColor?: string;
}

export type DimensionDescriptor =
  | LinearDimensionDescriptor
  | ChipDimensionDescriptor
  | ArcDimensionDescriptor
  | SpanDimensionDescriptor;

