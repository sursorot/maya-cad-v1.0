/**
 * Header Components
 * 
 * Extracted sub-components from the main Header.tsx
 * to improve maintainability and reduce complexity.
 * 
 * Optimization: Components are memoized and use pre-computed styles
 * from theme/componentStyles.ts for zero runtime style generation.
 */

export { ProjectNameEditor } from './ProjectNameEditor';
export { AutoSaveIndicator } from './AutoSaveIndicator';

// New optimized components
export { HeaderButton, getHeaderIconColor, getHeaderIconProps } from './HeaderButton';
export { HeaderNav } from './HeaderNav';
export { HeaderActions } from './HeaderActions';
