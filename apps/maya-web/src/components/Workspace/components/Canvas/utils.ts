import type { RefObject } from 'react';
import type { Point } from '../../types';

/**
 * Convert mouse event to SVG coordinates
 */
export const getSVGPoint = (
  e: React.MouseEvent<SVGSVGElement>,
  svgRef: RefObject<SVGSVGElement>
): Point => {
  if (!svgRef.current) return { x: 0, y: 0 };

  const svg = svgRef.current;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;

  const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
  return { x: svgP.x, y: svgP.y };
};

