/**
 * Footer Components
 * 
 * Extracted sub-components from the main Footer.tsx
 * to improve maintainability and reduce complexity.
 * 
 * Optimization: Components are memoized and use pre-computed styles
 * from theme/componentStyles.ts for zero runtime style generation.
 */

export { ZoomControls } from './ZoomControls';
export { UnitSelector } from './UnitSelector';
export { ToolbarStylePicker } from './ToolbarStylePicker';

// New optimized components
export { FooterButton, getIconProps, useIconColor } from './FooterButton';
export { FooterLeftControls } from './FooterLeftControls';
export { FooterRightControls } from './FooterRightControls';
export type { LengthUnit, DrawingMode } from './types';
