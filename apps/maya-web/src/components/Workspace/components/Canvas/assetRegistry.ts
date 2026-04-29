/**
 * Asset Registry
 * 
 * Manages available 2D assets (furniture, fixtures, etc.) for placement on the canvas.
 * Each asset has an SVG representation and metadata for rendering.
 */

import type { AssetCategory } from '../../types';

export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  // Default dimensions in meters (real-world scale)
  defaultWidth: number;
  defaultHeight: number;
  // SVG viewBox for proper scaling
  viewBox: string;
  // SVG content (paths, shapes, etc.)
  svgContent: string;
}

// King Bed SVG content (from king-bed.svg)
const KING_BED_SVG = `
  <rect x="-380" y="-400" width="760" height="800" rx="8" ry="8" fill="rgba(0,0,0,0.04)" stroke-width="3.0" stroke="currentColor"/>
  <rect x="-380" y="-400" width="760" height="60" rx="8" ry="8" fill="rgba(0,0,0,0.06)" stroke-width="3.0" stroke="currentColor"/>
  <line x1="-380" y1="-340" x2="380" y2="-340" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-360" y="-320" width="720" height="680" rx="6" ry="6" fill="rgba(255,255,255,0.5)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-340" y="-300" width="160" height="100" rx="20" ry="20" fill="rgba(255,255,255,0.8)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-320" y="-280" width="120" height="60" rx="12" ry="12" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <rect x="180" y="-300" width="160" height="100" rx="20" ry="20" fill="rgba(255,255,255,0.8)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="200" y="-280" width="120" height="60" rx="12" ry="12" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <path d="M -360 -160 Q 0 -120 360 -160" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <line x1="0" y1="-320" x2="0" y2="360" stroke-width="1.0" stroke="currentColor" stroke-dasharray="10,10" opacity="0.5"/>
  <line x1="-360" y1="360" x2="360" y2="360" stroke-width="2.0" stroke="currentColor"/>
  <circle cx="-365" cy="-385" r="12" fill="rgba(0,0,0,0.06)" stroke-width="2.0" stroke="currentColor"/>
  <circle cx="365" cy="-385" r="12" fill="rgba(0,0,0,0.06)" stroke-width="2.0" stroke="currentColor"/>
  <circle cx="-365" cy="385" r="12" fill="rgba(0,0,0,0.06)" stroke-width="2.0" stroke="currentColor"/>
  <circle cx="365" cy="385" r="12" fill="rgba(0,0,0,0.06)" stroke-width="2.0" stroke="currentColor"/>
`;

// Queen Bed SVG content (from queen-bed.svg)
const QUEEN_BED_SVG = `
  <rect x="-300" y="-400" width="600" height="800" rx="8" ry="8" fill="rgba(0,0,0,0.04)" stroke-width="3.0" stroke="currentColor"/>
  <rect x="-300" y="-400" width="600" height="60" rx="8" ry="8" fill="rgba(0,0,0,0.06)" stroke-width="3.0" stroke="currentColor"/>
  <line x1="-300" y1="-340" x2="300" y2="-340" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-280" y="-320" width="560" height="680" rx="6" ry="6" fill="rgba(255,255,255,0.5)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-260" y="-300" width="130" height="90" rx="18" ry="18" fill="rgba(255,255,255,0.8)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-242" y="-282" width="94" height="54" rx="10" ry="10" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <rect x="130" y="-300" width="130" height="90" rx="18" ry="18" fill="rgba(255,255,255,0.8)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="148" y="-282" width="94" height="54" rx="10" ry="10" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <path d="M -280 -160 Q 0 -120 280 -160" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <line x1="-280" y1="360" x2="280" y2="360" stroke-width="2.0" stroke="currentColor"/>
  <circle cx="-285" cy="-385" r="12" fill="rgba(0,0,0,0.06)" stroke-width="2.0" stroke="currentColor"/>
  <circle cx="285" cy="-385" r="12" fill="rgba(0,0,0,0.06)" stroke-width="2.0" stroke="currentColor"/>
  <circle cx="-285" cy="385" r="12" fill="rgba(0,0,0,0.06)" stroke-width="2.0" stroke="currentColor"/>
  <circle cx="285" cy="385" r="12" fill="rgba(0,0,0,0.06)" stroke-width="2.0" stroke="currentColor"/>
`;

// Dining table
const DINING_TABLE_SVG = `
  <rect x="-120" y="-75" width="240" height="150" rx="5" ry="5" fill="rgba(0,0,0,0.04)" stroke-width="2.0" stroke="currentColor"/>
  <circle cx="-105" cy="-60" r="8" fill="rgba(0,0,0,0.06)" stroke-width="1.5" stroke="currentColor"/>
  <circle cx="105" cy="-60" r="8" fill="rgba(0,0,0,0.06)" stroke-width="1.5" stroke="currentColor"/>
  <circle cx="-105" cy="60" r="8" fill="rgba(0,0,0,0.06)" stroke-width="1.5" stroke="currentColor"/>
  <circle cx="105" cy="60" r="8" fill="rgba(0,0,0,0.06)" stroke-width="1.5" stroke="currentColor"/>
`;

// Chair
const CHAIR_SVG = `
  <rect x="-25" y="-25" width="50" height="50" rx="3" ry="3" fill="rgba(0,0,0,0.04)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-25" y="-40" width="50" height="18" rx="3" ry="3" fill="rgba(0,0,0,0.06)" stroke-width="2.0" stroke="currentColor"/>
`;

// ==================== RUGS & MATS ====================

// Area Rug (rectangular with decorative pattern)
const AREA_RUG_SVG = `
  <rect x="-200" y="-150" width="400" height="300" rx="2" ry="2" fill="rgba(139,90,43,0.15)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-185" y="-135" width="370" height="270" rx="1" ry="1" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.6"/>
  <rect x="-170" y="-120" width="340" height="240" rx="1" ry="1" fill="rgba(139,90,43,0.08)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <line x1="-170" y1="-60" x2="170" y2="-60" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <line x1="-170" y1="0" x2="170" y2="0" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <line x1="-170" y1="60" x2="170" y2="60" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <line x1="-85" y1="-120" x2="-85" y2="120" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <line x1="0" y1="-120" x2="0" y2="120" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <line x1="85" y1="-120" x2="85" y2="120" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <circle cx="0" cy="0" r="40" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.4"/>
  <circle cx="0" cy="0" r="20" fill="rgba(139,90,43,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
`;

// Round Rug (circular with concentric pattern)
const ROUND_RUG_SVG = `
  <circle cx="0" cy="0" r="150" fill="rgba(70,130,180,0.12)" stroke-width="2.0" stroke="currentColor"/>
  <circle cx="0" cy="0" r="135" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <circle cx="0" cy="0" r="110" fill="rgba(70,130,180,0.08)" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <circle cx="0" cy="0" r="85" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <circle cx="0" cy="0" r="60" fill="rgba(70,130,180,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <circle cx="0" cy="0" r="35" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.4"/>
  <circle cx="0" cy="0" r="15" fill="rgba(70,130,180,0.15)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <path d="M -100 0 Q -50 -30 0 0 Q 50 30 100 0" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <path d="M 0 -100 Q -30 -50 0 0 Q 30 50 0 100" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
`;

// Runner Rug (long hallway rug)
const RUNNER_RUG_SVG = `
  <rect x="-300" y="-50" width="600" height="100" rx="2" ry="2" fill="rgba(128,0,32,0.12)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-285" y="-40" width="570" height="80" rx="1" ry="1" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <rect x="-270" y="-30" width="540" height="60" rx="1" ry="1" fill="rgba(128,0,32,0.08)" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <line x1="-200" y1="-30" x2="-200" y2="30" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <line x1="-100" y1="-30" x2="-100" y2="30" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <line x1="0" y1="-30" x2="0" y2="30" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <line x1="100" y1="-30" x2="100" y2="30" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <line x1="200" y1="-30" x2="200" y2="30" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <ellipse cx="-150" cy="0" rx="30" ry="15" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <ellipse cx="0" cy="0" rx="30" ry="15" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <ellipse cx="150" cy="0" rx="30" ry="15" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
`;

// Bath Mat
const BATH_MAT_SVG = `
  <rect x="-60" y="-40" width="120" height="80" rx="4" ry="4" fill="rgba(176,196,222,0.2)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-50" y="-32" width="100" height="64" rx="3" ry="3" fill="rgba(176,196,222,0.15)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <line x1="-40" y1="-20" x2="40" y2="-20" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <line x1="-40" y1="-8" x2="40" y2="-8" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <line x1="-40" y1="4" x2="40" y2="4" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <line x1="-40" y1="16" x2="40" y2="16" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
`;

// ==================== PLANTS & PLANTERS ====================

// Large Floor Planter (top view)
const FLOOR_PLANTER_SVG = `
  <circle cx="0" cy="0" r="45" fill="rgba(139,69,19,0.15)" stroke-width="2.5" stroke="currentColor"/>
  <circle cx="0" cy="0" r="38" fill="rgba(34,139,34,0.1)" stroke-width="1.5" stroke="currentColor" opacity="0.6"/>
  <circle cx="0" cy="0" r="30" fill="rgba(34,139,34,0.15)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <ellipse cx="0" cy="-8" rx="20" ry="15" fill="rgba(34,139,34,0.2)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <path d="M 0 -25 Q -15 -10 -8 5" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <path d="M 0 -25 Q 15 -10 8 5" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <path d="M -5 -20 Q -25 -5 -20 10" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <path d="M 5 -20 Q 25 -5 20 10" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <circle cx="0" cy="0" r="5" fill="rgba(34,139,34,0.3)" stroke-width="0.5" stroke="currentColor" opacity="0.5"/>
`;

// Small Potted Plant (top view)
const SMALL_PLANT_SVG = `
  <circle cx="0" cy="0" r="25" fill="rgba(139,69,19,0.12)" stroke-width="2.0" stroke="currentColor"/>
  <circle cx="0" cy="0" r="20" fill="rgba(34,139,34,0.08)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <ellipse cx="0" cy="-5" rx="12" ry="10" fill="rgba(34,139,34,0.2)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <path d="M 0 -12 L -6 2" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <path d="M 0 -12 L 6 2" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <path d="M 0 -12 L 0 5" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <circle cx="0" cy="-5" r="3" fill="rgba(34,139,34,0.3)" stroke-width="0.5" stroke="currentColor" opacity="0.6"/>
`;

// Indoor Tree (Fiddle Leaf Fig style - top view)
const INDOOR_TREE_SVG = `
  <circle cx="0" cy="0" r="55" fill="rgba(139,69,19,0.12)" stroke-width="2.5" stroke="currentColor"/>
  <circle cx="0" cy="0" r="48" fill="rgba(34,139,34,0.06)" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <ellipse cx="-15" cy="-20" rx="25" ry="18" fill="rgba(34,139,34,0.15)" stroke-width="1.5" stroke="currentColor" opacity="0.6"/>
  <ellipse cx="18" cy="-15" rx="22" ry="16" fill="rgba(34,139,34,0.15)" stroke-width="1.5" stroke="currentColor" opacity="0.6"/>
  <ellipse cx="-20" cy="10" rx="20" ry="15" fill="rgba(34,139,34,0.15)" stroke-width="1.5" stroke="currentColor" opacity="0.6"/>
  <ellipse cx="15" cy="15" rx="23" ry="17" fill="rgba(34,139,34,0.15)" stroke-width="1.5" stroke="currentColor" opacity="0.6"/>
  <ellipse cx="0" cy="-5" rx="18" ry="14" fill="rgba(34,139,34,0.18)" stroke-width="1.5" stroke="currentColor" opacity="0.7"/>
  <circle cx="0" cy="0" r="8" fill="rgba(139,69,19,0.2)" stroke-width="1.5" stroke="currentColor" opacity="0.6"/>
  <path d="M 0 0 L -15 -20" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <path d="M 0 0 L 18 -15" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <path d="M 0 0 L -20 10" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <path d="M 0 0 L 15 15" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
`;

// Square Planter Box
const SQUARE_PLANTER_SVG = `
  <rect x="-35" y="-35" width="70" height="70" rx="4" ry="4" fill="rgba(139,69,19,0.12)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-28" y="-28" width="56" height="56" rx="2" ry="2" fill="rgba(34,139,34,0.08)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <circle cx="0" cy="0" r="18" fill="rgba(34,139,34,0.15)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <path d="M -12 -5 Q 0 -20 12 -5" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <path d="M -8 5 Q 0 -10 8 5" fill="none" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <circle cx="0" cy="2" r="4" fill="rgba(34,139,34,0.25)" stroke-width="0.5" stroke="currentColor" opacity="0.5"/>
`;

// ==================== KITCHEN EQUIPMENT ====================

// Refrigerator (top view)
const REFRIGERATOR_SVG = `
  <rect x="-45" y="-90" width="90" height="180" rx="3" ry="3" fill="rgba(192,192,192,0.15)" stroke-width="2.5" stroke="currentColor"/>
  <line x1="-45" y1="0" x2="45" y2="0" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-40" y="-85" width="80" height="80" rx="2" ry="2" fill="rgba(255,255,255,0.3)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <rect x="-40" y="5" width="80" height="80" rx="2" ry="2" fill="rgba(255,255,255,0.3)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <rect x="30" y="-70" width="8" height="40" rx="2" ry="2" fill="rgba(0,0,0,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <rect x="30" y="20" width="8" height="50" rx="2" ry="2" fill="rgba(0,0,0,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <circle cx="-30" cy="-45" r="3" fill="rgba(0,0,0,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <circle cx="-30" cy="45" r="3" fill="rgba(0,0,0,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
`;

// Stove/Range (top view with 4 burners)
const STOVE_SVG = `
  <rect x="-75" y="-45" width="150" height="90" rx="3" ry="3" fill="rgba(64,64,64,0.12)" stroke-width="2.5" stroke="currentColor"/>
  <rect x="-70" y="-40" width="140" height="80" rx="2" ry="2" fill="rgba(32,32,32,0.08)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <circle cx="-35" cy="-15" r="20" fill="none" stroke-width="2.0" stroke="currentColor" opacity="0.7"/>
  <circle cx="-35" cy="-15" r="14" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <circle cx="-35" cy="-15" r="8" fill="rgba(0,0,0,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <circle cx="35" cy="-15" r="20" fill="none" stroke-width="2.0" stroke="currentColor" opacity="0.7"/>
  <circle cx="35" cy="-15" r="14" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <circle cx="35" cy="-15" r="8" fill="rgba(0,0,0,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <circle cx="-35" cy="20" r="16" fill="none" stroke-width="2.0" stroke="currentColor" opacity="0.7"/>
  <circle cx="-35" cy="20" r="10" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <circle cx="-35" cy="20" r="5" fill="rgba(0,0,0,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <circle cx="35" cy="20" r="16" fill="none" stroke-width="2.0" stroke="currentColor" opacity="0.7"/>
  <circle cx="35" cy="20" r="10" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.5"/>
  <circle cx="35" cy="20" r="5" fill="rgba(0,0,0,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <rect x="-70" y="-40" width="20" height="10" rx="1" ry="1" fill="rgba(0,0,0,0.08)" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
`;

// Kitchen Sink (top view with double basin)
const KITCHEN_SINK_SVG = `
  <rect x="-80" y="-40" width="160" height="80" rx="5" ry="5" fill="rgba(192,192,192,0.12)" stroke-width="2.5" stroke="currentColor"/>
  <rect x="-70" y="-32" width="60" height="56" rx="8" ry="8" fill="rgba(128,128,128,0.1)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="10" y="-32" width="60" height="56" rx="8" ry="8" fill="rgba(128,128,128,0.1)" stroke-width="2.0" stroke="currentColor"/>
  <circle cx="-40" cy="0" r="8" fill="rgba(64,64,64,0.15)" stroke-width="1.5" stroke="currentColor"/>
  <circle cx="-40" cy="0" r="3" fill="rgba(0,0,0,0.2)" stroke-width="1.0" stroke="currentColor"/>
  <circle cx="40" cy="0" r="8" fill="rgba(64,64,64,0.15)" stroke-width="1.5" stroke="currentColor"/>
  <circle cx="40" cy="0" r="3" fill="rgba(0,0,0,0.2)" stroke-width="1.0" stroke="currentColor"/>
  <ellipse cx="0" cy="-25" rx="8" ry="5" fill="rgba(192,192,192,0.2)" stroke-width="1.5" stroke="currentColor"/>
  <rect x="-3" y="-35" width="6" height="15" rx="2" ry="2" fill="rgba(192,192,192,0.15)" stroke-width="1.0" stroke="currentColor"/>
`;

// Dishwasher (top view)
const DISHWASHER_SVG = `
  <rect x="-60" y="-30" width="120" height="60" rx="3" ry="3" fill="rgba(192,192,192,0.12)" stroke-width="2.5" stroke="currentColor"/>
  <rect x="-55" y="-25" width="110" height="50" rx="2" ry="2" fill="rgba(255,255,255,0.2)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <line x1="-50" y1="-10" x2="50" y2="-10" stroke-width="1.5" stroke="currentColor" opacity="0.4"/>
  <line x1="-50" y1="5" x2="50" y2="5" stroke-width="1.5" stroke="currentColor" opacity="0.4"/>
  <rect x="-50" y="-22" width="100" height="8" rx="1" ry="1" fill="rgba(0,0,0,0.08)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <circle cx="45" cy="-18" r="3" fill="rgba(0,128,0,0.3)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
`;

// Kitchen Island (top view with seating overhang)
const KITCHEN_ISLAND_SVG = `
  <rect x="-120" y="-60" width="240" height="120" rx="4" ry="4" fill="rgba(139,90,43,0.1)" stroke-width="2.5" stroke="currentColor"/>
  <rect x="-115" y="-55" width="230" height="90" rx="3" ry="3" fill="rgba(160,120,80,0.08)" stroke-width="1.5" stroke="currentColor" opacity="0.6"/>
  <line x1="-100" y1="-55" x2="-100" y2="35" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <line x1="0" y1="-55" x2="0" y2="35" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <line x1="100" y1="-55" x2="100" y2="35" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <rect x="-115" y="35" width="230" height="20" rx="2" ry="2" fill="rgba(139,90,43,0.15)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <circle cx="-80" cy="-10" r="15" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.4"/>
  <circle cx="-80" cy="-10" r="8" fill="rgba(0,0,0,0.05)" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
  <circle cx="80" cy="-10" r="15" fill="none" stroke-width="1.5" stroke="currentColor" opacity="0.4"/>
  <circle cx="80" cy="-10" r="8" fill="rgba(0,0,0,0.05)" stroke-width="1.0" stroke="currentColor" opacity="0.3"/>
`;

// Microwave (top view)
const MICROWAVE_SVG = `
  <rect x="-50" y="-30" width="100" height="60" rx="3" ry="3" fill="rgba(64,64,64,0.12)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-45" y="-25" width="70" height="50" rx="2" ry="2" fill="rgba(32,32,32,0.08)" stroke-width="1.5" stroke="currentColor" opacity="0.6"/>
  <rect x="30" y="-20" width="15" height="40" rx="1" ry="1" fill="rgba(0,0,0,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <circle cx="37" cy="-10" r="3" fill="rgba(0,0,0,0.15)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <circle cx="37" cy="0" r="3" fill="rgba(0,0,0,0.15)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <circle cx="37" cy="10" r="3" fill="rgba(0,0,0,0.15)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <rect x="-40" y="-20" width="60" height="40" rx="1" ry="1" fill="rgba(100,100,100,0.08)" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
`;

// Oven (top view - countertop style)
const OVEN_SVG = `
  <rect x="-55" y="-35" width="110" height="70" rx="4" ry="4" fill="rgba(64,64,64,0.12)" stroke-width="2.5" stroke="currentColor"/>
  <rect x="-50" y="-30" width="100" height="55" rx="3" ry="3" fill="rgba(32,32,32,0.1)" stroke-width="1.5" stroke="currentColor" opacity="0.6"/>
  <rect x="-45" y="-25" width="90" height="45" rx="2" ry="2" fill="rgba(0,0,0,0.05)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <line x1="-45" y1="-5" x2="45" y2="-5" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <line x1="-45" y1="10" x2="45" y2="10" stroke-width="1.0" stroke="currentColor" opacity="0.4"/>
  <rect x="-50" y="25" width="100" height="8" rx="1" ry="1" fill="rgba(0,0,0,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <circle cx="-35" cy="29" r="2" fill="rgba(0,0,0,0.15)" stroke-width="0.5" stroke="currentColor"/>
  <circle cx="-20" cy="29" r="2" fill="rgba(0,0,0,0.15)" stroke-width="0.5" stroke="currentColor"/>
  <circle cx="20" cy="29" r="2" fill="rgba(0,0,0,0.15)" stroke-width="0.5" stroke="currentColor"/>
  <circle cx="35" cy="29" r="2" fill="rgba(0,0,0,0.15)" stroke-width="0.5" stroke="currentColor"/>
`;

// Coffee Machine (top view)
const COFFEE_MACHINE_SVG = `
  <rect x="-30" y="-25" width="60" height="50" rx="3" ry="3" fill="rgba(64,64,64,0.15)" stroke-width="2.0" stroke="currentColor"/>
  <rect x="-25" y="-20" width="50" height="35" rx="2" ry="2" fill="rgba(32,32,32,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.6"/>
  <circle cx="0" cy="-5" r="12" fill="rgba(0,0,0,0.08)" stroke-width="1.5" stroke="currentColor" opacity="0.6"/>
  <circle cx="0" cy="-5" r="6" fill="rgba(139,69,19,0.2)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <rect x="-20" y="15" width="40" height="8" rx="1" ry="1" fill="rgba(0,0,0,0.1)" stroke-width="1.0" stroke="currentColor" opacity="0.5"/>
  <circle cx="15" cy="19" r="2" fill="rgba(0,128,0,0.4)" stroke-width="0.5" stroke="currentColor"/>
`;

// ==================== NEW FURNITURE SVGs (exact from files) ====================

// Round Table (from round-table.svg) - exact SVG content
const ROUND_TABLE_SVG = `
  <path d="M 460.0370 -762.3113 Q 451.0618 -767.0990 446.2965 -765.1637 Q 433.9921 -757.5973 421.3122 -750.6783 Q 421.4356 -756.6455 421.5591 -762.6128 Q 420.8448 -772.0052 411.5003 -773.1908 Q 402.1557 -774.3764 399.1184 -765.4601 Q 394.7196 -750.2299 390.3207 -734.9997 Q 369.6858 -723.2006 302.1654 -651.7191 Q 226.6893 -570.3994 149.5152 -490.6895 Q 132.6323 -472.7421 130.3703 -448.2058 Q 107.9430 -441.9656 85.5156 -435.7253 Q 76.4255 -432.5623 78.4236 -423.1474 Q 80.4216 -413.7324 90.0128 -414.5340 Q 112.3627 -415.3999 134.7126 -416.2658 Q 135.6828 -413.7050 136.8458 -411.2259 Q 146.0615 -390.4621 179.9903 -356.4238 Q 261.5587 -278.6048 343.1270 -200.7859 Q 378.7230 -168.4952 399.8972 -160.2660 Q 402.4283 -159.2208 405.0318 -158.3721 Q 405.2178 -136.0062 405.4038 -113.6403 Q 405.0541 -104.0221 414.5526 -102.4689 Q 424.0511 -100.9158 426.7831 -110.1446 Q 431.9619 -132.8405 437.1407 -155.5365 Q 461.5434 -158.9497 478.6772 -176.6578 Q 554.6701 -257.4947 632.3508 -336.7110 Q 700.5783 -407.5179 711.3941 -428.6848 Q 726.4006 -433.7950 741.4071 -438.9051 Q 750.1708 -442.3582 748.5471 -451.6367 Q 746.9233 -460.9152 737.5078 -461.1870 Q 731.5529 -460.7832 725.5981 -460.3793 Q 731.9132 -473.3704 738.8927 -486.0171 Q 740.6018 -490.8680 735.3974 -499.6083 Q 683.4788 -581.0012 613.6300 -647.6393 Q 543.7812 -714.2774 460.0370 -762.3113 Z" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M 725.5981 -460.3793 Q 718.0021 -444.7534 711.3941 -428.6848" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M 437.1407 -155.5365 Q 420.7587 -153.2451 405.0318 -158.3721" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M 421.3122 -750.6783 Q 406.0608 -742.3560 390.3207 -734.9997" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M 615.9167 -484.6361 Q 658.2026 -407.2228 601.1955 -339.9093 Q 536.5448 -262.7287 471.8202 -185.6101 Q 454.8373 -165.2525 428.3758 -163.6293 Q 401.9142 -162.0062 382.5705 -180.1355 Q 325.1682 -231.4237 268.8343 -285.1682 Q 212.5004 -338.9126 157.5081 -394.8527 Q 138.4892 -413.3225 138.8663 -439.8311 Q 139.2434 -466.3398 158.7800 -484.2611 Q 232.7698 -552.5403 306.8251 -620.7486 Q 371.3836 -680.8578 450.6996 -642.2588 Q 503.4125 -616.8699 545.7449 -576.4834 Q 588.0773 -536.0969 615.9167 -484.6361 Z" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M 446.2965 -765.1637 C 567.0645 -698.9647 667.0883 -603.5387 738.8927 -486.0171" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M 130.3703 -448.2058 Q 128.8518 -431.7342 134.7126 -416.2658" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M 776.6465 464.3374 Q 781.4342 455.3621 779.4989 450.5969 Q 771.9324 438.2924 765.0134 425.6126 Q 770.9807 425.7360 776.9480 425.8594 Q 786.3403 425.1452 787.5260 415.8006 Q 788.7116 406.4560 779.7952 403.4188 Q 764.5651 399.0200 749.3349 394.6211 Q 737.5358 373.9861 666.0542 306.4658 Q 584.7346 230.9897 505.0247 153.8155 Q 487.0772 136.9326 462.5410 134.6707 Q 456.3007 112.2433 450.0604 89.8160 Q 446.8975 80.7259 437.4826 82.7239 Q 428.0676 84.7220 428.8692 94.3132 Q 429.7351 116.6630 430.6010 139.0129 Q 428.0402 139.9832 425.5610 141.1462 Q 404.7972 150.3619 370.7590 184.2907 Q 292.9400 265.8590 215.1211 347.4274 Q 182.8303 383.0233 174.6011 404.1975 Q 173.5560 406.7286 172.7072 409.3322 Q 150.3414 409.5182 127.9755 409.7042 Q 118.3572 409.3545 116.8041 418.8530 Q 115.2510 428.3515 124.4797 431.0834 Q 147.1757 436.2623 169.8716 441.4411 Q 173.2849 465.8438 190.9930 482.9776 Q 271.8299 558.9704 351.0462 636.6511 Q 421.8531 704.8787 443.0200 715.6945 Q 448.1301 730.7010 453.2403 745.7075 Q 456.6934 754.4712 465.9719 752.8474 Q 475.2504 751.2237 475.5222 741.8081 Q 475.1183 735.8533 474.7145 729.8984 Q 487.7056 736.2136 500.3522 743.1930 Q 505.2032 744.9021 513.9434 739.6977 Q 595.3364 687.7792 661.9745 617.9304 Q 728.6126 548.0816 776.6465 464.3374 Z" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M 474.7145 729.8984 Q 459.0886 722.3025 443.0200 715.6945" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M 169.8716 441.4411 Q 167.5803 425.0591 172.7072 409.3322" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M 765.0134 425.6126 Q 756.6912 410.3612 749.3349 394.6211" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M 498.9713 620.2171 Q 421.5580 662.5029 354.2445 605.4959 Q 277.0639 540.8452 199.9453 476.1206 Q 179.5877 459.1377 177.9645 432.6761 Q 176.3413 406.2145 194.4707 386.8709 Q 245.7589 329.4686 299.5033 273.1347 Q 353.2478 216.8008 409.1879 161.8084 Q 427.6577 142.7896 454.1663 143.1667 Q 480.6749 143.5438 498.5963 163.0803 Q 566.8755 237.0702 635.0838 311.1255 Q 695.1930 375.6840 656.5940 455.0000 Q 631.2051 507.7129 590.8186 550.0453 Q 550.4321 592.3776 498.9713 620.2171 Z" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M 779.4989 450.5969 C 713.2999 571.3649 617.8738 671.3886 500.3522 743.1930" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M 462.5410 134.6707 Q 446.0694 133.1521 430.6010 139.0129" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M -759.0094 -474.7423 Q -763.7970 -465.7670 -761.8617 -461.0018 Q -754.2953 -448.6973 -747.3763 -436.0175 Q -753.3436 -436.1409 -759.3108 -436.2643 Q -768.7032 -435.5501 -769.8888 -426.2055 Q -771.0745 -416.8610 -762.1581 -413.8237 Q -746.9279 -409.4249 -731.6977 -405.0260 Q -719.8986 -384.3911 -648.4171 -316.8707 Q -567.0975 -241.3946 -487.3876 -164.2205 Q -469.4401 -147.3376 -444.9039 -145.0756 Q -438.6636 -122.6482 -432.4233 -100.2209 Q -429.2604 -91.1308 -419.8454 -93.1289 Q -410.4305 -95.1269 -411.2321 -104.7181 Q -412.0980 -127.0680 -412.9638 -149.4178 Q -410.4031 -150.3881 -407.9239 -151.5511 Q -387.1601 -160.7668 -353.1218 -194.6956 Q -275.3029 -276.2639 -197.4839 -357.8323 Q -165.1932 -393.4283 -156.9640 -414.6024 Q -155.9189 -417.1336 -155.0701 -419.7371 Q -132.7042 -419.9231 -110.3384 -420.1091 Q -100.7201 -419.7594 -99.1670 -429.2579 Q -97.6139 -438.7564 -106.8426 -441.4884 Q -129.5386 -446.6672 -152.2345 -451.8460 Q -155.6477 -476.2487 -173.3559 -493.3825 Q -254.1927 -569.3754 -333.4091 -647.0561 Q -404.2159 -715.2836 -425.3829 -726.0994 Q -430.4930 -741.1059 -435.6031 -756.1124 Q -439.0563 -764.8761 -448.3348 -763.2524 Q -457.6133 -761.6286 -457.8851 -752.2131 Q -457.4812 -746.2582 -457.0773 -740.3033 Q -470.0685 -746.6185 -482.7151 -753.5980 Q -487.5661 -755.3071 -496.3063 -750.1027 Q -577.6992 -698.1841 -644.3373 -628.3353 Q -710.9755 -558.4865 -759.0094 -474.7423 Z" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M -457.0773 -740.3033 Q -441.4515 -732.7074 -425.3829 -726.0994" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M -152.2345 -451.8460 Q -149.9432 -435.4640 -155.0701 -419.7371" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M -747.3763 -436.0175 Q -739.0540 -420.7661 -731.6977 -405.0260" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M -481.3342 -630.6220 Q -403.9209 -672.9078 -336.6073 -615.9008 Q -259.4268 -551.2501 -182.3081 -486.5255 Q -161.9505 -469.5426 -160.3274 -443.0810 Q -158.7042 -416.6195 -176.8335 -397.2758 Q -228.1218 -339.8735 -281.8662 -283.5396 Q -335.6107 -227.2057 -391.5507 -172.2134 Q -410.0205 -153.1945 -436.5292 -153.5716 Q -463.0378 -153.9487 -480.9591 -173.4852 Q -549.2384 -247.4751 -617.4467 -321.5304 Q -677.5559 -386.0889 -638.9569 -465.4049 Q -613.5680 -518.1178 -573.1815 -560.4502 Q -532.7950 -602.7825 -481.3342 -630.6220 Z" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M -761.8617 -461.0018 C -695.6628 -581.7698 -600.2367 -681.7935 -482.7151 -753.5980" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M -444.9039 -145.0756 Q -428.4322 -143.5571 -412.9638 -149.4178" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M -479.1825 767.6076 Q -470.2456 772.4664 -465.4651 770.5690 Q -453.1009 763.1007 -440.3665 756.2826 Q -440.5373 762.2487 -440.7082 768.2148 Q -440.0686 777.6126 -430.7337 778.8725 Q -421.3989 780.1323 -418.2909 771.2404 Q -413.7711 756.0457 -409.2514 740.8509 Q -388.5232 729.2162 -320.4368 658.2736 Q -244.3168 577.5564 -166.5115 498.4625 Q -149.4865 480.6498 -147.0296 456.1323 Q -124.5534 450.0704 -102.0771 444.0086 Q -92.9622 440.9181 -94.8853 431.4875 Q -96.8085 422.0570 -106.4057 422.7823 Q -128.7618 423.4705 -151.1179 424.1587 Q -152.0677 421.5903 -153.2110 419.1020 Q -162.2614 398.2656 -195.9185 363.9587 Q -276.8658 285.4939 -357.8130 207.0291 Q -393.1512 174.4564 -414.2593 166.0592 Q -416.7820 164.9940 -419.3787 164.1246 Q -419.3870 141.7579 -419.3952 119.3913 Q -418.9691 109.7761 -428.4549 108.1475 Q -437.9407 106.5190 -440.7460 115.7257 Q -446.1051 138.3798 -451.4641 161.0338 Q -475.8932 164.2530 -493.1672 181.8244 Q -569.8001 262.0547 -648.1080 340.6511 Q -716.8962 410.9134 -727.8799 431.9938 Q -742.9265 436.9844 -757.9732 441.9751 Q -766.7640 445.3585 -765.2141 454.6496 Q -763.6642 463.9407 -754.2511 464.2873 Q -748.2932 463.9308 -742.3353 463.5743 Q -748.7535 476.5148 -755.8333 489.1056 Q -757.5809 493.9428 -752.4461 502.7242 Q -701.1761 584.5272 -631.8592 651.7183 Q -562.5423 718.9095 -479.1825 767.6076 Z" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M -742.3353 463.5743 Q -734.6154 448.0093 -727.8799 431.9938" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M -451.4641 161.0338 Q -435.0644 158.8728 -419.3787 164.1246" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M -440.3665 756.2826 Q -425.0494 748.0819 -409.2514 740.8509" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M -632.8502 488.7022 Q -674.5194 410.9552 -616.9792 344.0969 Q -551.7170 267.4326 -486.3815 190.8309 Q -469.2374 170.6089 -442.7637 169.1961 Q -416.2901 167.7833 -397.0911 186.0658 Q -340.0983 237.8087 -284.1934 291.9992 Q -228.2884 346.1897 -173.7424 402.5651 Q -154.8710 421.1855 -155.4588 447.6903 Q -156.0466 474.1951 -175.7249 491.9606 Q -250.2552 559.6496 -324.8502 627.2671 Q -389.8845 686.8613 -468.8912 647.6330 Q -521.4006 621.8260 -563.4107 581.1043 Q -605.4207 540.3826 -632.8502 488.7022 Z" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M -465.4651 770.5690 C -585.7031 703.4123 -684.9652 607.1942 -755.8333 489.1056" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M -147.0296 456.1323 Q -145.3802 439.6732 -151.1179 424.1587" fill="none" stroke-width="3.1154" stroke="currentColor"/>
  <path d="M 602.1659 -13.1183 C 602.1659 -343.7639 334.1246 -611.8052 3.4789 -611.8052 C -327.1668 -611.8052 -595.2081 -343.7639 -595.2081 -13.1183 C -595.2081 317.5274 -327.1668 585.5687 3.4789 585.5687 C 334.1246 585.5687 602.1659 317.5274 602.1659 -13.1183 Z" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
`;

// 3-Seat Sofa (from 3-seat-sofa.svg) - exact SVG content
const THREE_SEAT_SOFA_SVG = `
  <path d="M -991.6786 425.4497 Q -991.7306 425.4499 -991.7825 425.4499 Q -1024.6024 425.4499 -1057.4229 425.4499 Q -1066.7997 425.4499 -1066.7997 415.3457 Q -1066.7997 -25.8750 -1066.7997 -467.0957 Q -1066.7997 -477.1999 -1057.4229 -477.1999 Q -241.6121 -477.1999 1024.3008 -477.1999 Q 1033.6769 -477.1999 1033.6769 -467.0957 Q 1033.6769 -25.8750 1033.6769 415.3457 Q 1033.6769 425.4499 1024.3008 425.4499 Q 991.4803 425.4499 958.6599 425.4499 Q 958.6082 425.4499 958.5563 425.4497 Q 925.6600 425.4497 892.7631 425.4495 Q 892.6060 425.4499 892.4490 425.4499 Q 750.5147 425.4499 608.5810 425.4499 Q 504.1554 425.4499 362.2213 425.4499 Q 362.0641 425.4499 361.9069 425.4495 Q 305.3871 425.4495 248.8668 425.4495 Q 248.7093 425.4499 248.5524 425.4499 Q 106.6187 425.4499 2.1931 425.4499 Q -139.7411 425.4499 -281.6749 425.4499 Q -281.8319 425.4499 -281.9889 425.4495 Q -338.5096 425.4495 -395.0294 425.4495 Q -395.1865 425.4499 -395.3436 425.4499 Q -537.2778 425.4499 -641.7029 425.4499 Q -783.6371 425.4499 -925.5711 425.4499 Q -925.7286 425.4499 -925.8855 425.4495 Q -958.7819 425.4497 -991.6786 425.4497" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M 2.1931 -133.7305 Q 115.3352 -133.7305 232.4527 -133.7305 Q 305.3871 -133.7305 305.3871 -210.8365 Q 305.3871 -292.2022 305.3871 -343.8051 Q 305.3871 -386.2614 265.9864 -386.2614 Q 115.3352 -386.2614 2.1931 -386.2614 Q -148.4576 -386.2614 -299.1083 -386.2614 Q -338.5096 -386.2614 -338.5096 -343.8051 Q -338.5096 -292.2022 -338.5096 -210.8365 Q -338.5096 -133.7305 -265.5751 -133.7305 Q -148.4576 -133.7305 2.1931 -133.7305" fill="none" stroke-width="4.2010" stroke="currentColor"/>
  <path d="M -338.5096 339.4142 Q -338.5096 351.8111 -338.5096 364.2081 Q -338.5096 425.4499 -281.6749 425.4499 Q -139.7411 425.4499 2.1931 425.4499 Q 106.6187 425.4499 248.5524 425.4499 Q 305.3871 425.4499 305.3871 364.2081" fill="none" stroke-width="4.2010" stroke="currentColor"/>
  <path d="M 608.5810 -133.7305 Q 495.4386 -133.7305 378.3214 -133.7305 Q 305.3871 -133.7305 305.3871 -210.8365 Q 305.3871 -292.2022 305.3871 -343.8051 Q 305.3871 -386.2614 344.7877 -386.2614 Q 495.4386 -386.2614 608.5810 -386.2614 Q 759.2317 -386.2614 909.8824 -386.2614 Q 949.2831 -386.2614 949.2831 -343.8051 Q 949.2831 -292.2022 949.2831 -210.8365 Q 949.2831 -133.7305 876.3489 -133.7305 Q 759.2317 -133.7305 608.5810 -133.7305" fill="none" stroke-width="4.2010" stroke="currentColor"/>
  <path d="M -641.7029 -133.7305 Q -528.5607 -133.7305 -411.4437 -133.7305 Q -338.5096 -133.7305 -338.5096 -210.8365 Q -338.5096 -292.2022 -338.5096 -343.8051 Q -338.5096 -386.2614 -377.9101 -386.2614 Q -528.5607 -386.2614 -641.7029 -386.2614 Q -792.3538 -386.2614 -943.0048 -386.2614 Q -982.4054 -386.2614 -982.4054 -343.8051 Q -982.4054 -292.2022 -982.4054 -210.8365 Q -982.4054 -133.7305 -909.4710 -133.7305 Q -792.3538 -133.7305 -641.7029 -133.7305" fill="none" stroke-width="4.2010" stroke="currentColor"/>
  <path d="M 949.2831 -210.8365 Q 949.2831 -198.4396 949.2831 364.2081 Q 949.2831 425.4499 892.4490 425.4499 Q 750.5147 425.4499 608.5810 425.4499 Q 504.1554 425.4499 362.2213 425.4499 Q 305.3871 425.4499 305.3871 364.2081 Q 305.3871 351.8111 305.3871 339.4142 Q 305.3871 64.2887 305.3871 -210.8365" fill="none" stroke-width="4.2010" stroke="currentColor"/>
  <path d="M -982.4054 -210.8365 Q -982.4054 -198.4396 -982.4054 364.2081 Q -982.4054 425.4499 -925.5711 425.4499 Q -783.6371 425.4499 -641.7029 425.4499 Q -537.2778 425.4499 -395.3436 425.4499 Q -338.5096 425.4499 -338.5096 364.2081 Q -338.5096 351.8111 -338.5096 339.4142 Q -338.5096 64.2887 -338.5096 -210.8365" fill="none" stroke-width="4.2010" stroke="currentColor"/>
`;

// 2-Seat Sofa / Loveseat (from 2-seat-sofa.svg) - exact SVG content
const TWO_SEAT_SOFA_SVG = `
  <path d="M -686.0585 472.1406 Q -686.0957 472.1408 -686.1328 472.1408 Q -709.6017 472.1408 -733.0711 472.1408 Q -739.7763 472.1408 -739.7763 462.0932 Q -739.7763 23.3455 -739.7763 -415.4024 Q -739.7763 -425.4499 -733.0711 -425.4499 Q -149.6987 -425.4499 755.5340 -425.4499 Q 762.2387 -425.4499 762.2387 -415.4024 Q 762.2387 23.3455 762.2387 462.0932 Q 762.2387 472.1408 755.5340 472.1408 Q 732.0647 472.1408 708.5953 472.1408 Q 708.5584 472.1408 708.5213 472.1406 Q 684.9977 472.1406 661.4736 472.1404 Q 661.3613 472.1408 661.2490 472.1408 Q 559.7542 472.1408 458.2599 472.1408 Q 383.5869 472.1408 282.0923 472.1408 Q 281.9798 472.1408 281.8674 472.1404 Q 241.4511 472.1404 201.0344 472.1404 Q 200.9218 472.1408 200.8096 472.1408 Q 99.3152 472.1408 24.6422 472.1408 Q -76.8525 472.1408 -178.3469 472.1408 Q -178.4592 472.1408 -178.5715 472.1404 Q -218.9885 472.1404 -259.4048 472.1404 Q -259.5171 472.1408 -259.6295 472.1408 Q -361.1242 472.1408 -435.7968 472.1408 Q -537.2915 472.1408 -638.7861 472.1408 Q -638.8988 472.1408 -639.0110 472.1404 Q -662.5346 472.1406 -686.0585 472.1406" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M 362.5591 -83.9056 Q 479.2302 -83.9056 600.0006 -83.9056 Q 675.2098 -83.9056 675.2098 -160.5794 Q 675.2098 -241.4891 675.2098 -292.8028 Q 675.2098 -335.0211 634.5802 -335.0211 Q 479.2302 -335.0211 362.5591 -335.0211 Q 207.2095 -335.0211 51.8599 -335.0211 Q 11.2296 -335.0211 11.2296 -292.8028 Q 11.2296 -241.4891 11.2296 -160.5794 Q 11.2296 -83.9056 86.4390 -83.9056 Q 207.2095 -83.9056 362.5591 -83.9056" fill="none" stroke-width="3.0040" stroke="currentColor"/>
  <path d="M 11.2296 386.5873 Q 11.2296 398.9147 11.2296 411.2423 Q 11.2296 472.1408 69.8371 472.1408 Q 216.1979 472.1408 362.5591 472.1408 Q 470.2418 472.1408 616.6025 472.1408 Q 675.2098 472.1408 675.2098 411.2423" fill="none" stroke-width="3.0040" stroke="currentColor"/>
  <path d="M -301.4204 -83.9056 Q -184.7492 -83.9056 -63.9793 -83.9056 Q 11.2296 -83.9056 11.2296 -160.5794 Q 11.2296 -241.4891 11.2296 -292.8028 Q 11.2296 -335.0211 -29.3998 -335.0211 Q -184.7492 -335.0211 -301.4204 -335.0211 Q -456.7703 -335.0211 -612.1201 -335.0211 Q -652.7497 -335.0211 -652.7497 -292.8028 Q -652.7497 -241.4891 -652.7497 -160.5794 Q -652.7497 -83.9056 -577.5404 -83.9056 Q -456.7703 -83.9056 -301.4204 -83.9056" fill="none" stroke-width="3.0040" stroke="currentColor"/>
  <path d="M -652.7497 -160.5794 Q -652.7497 -148.2520 -652.7497 411.2423 Q -652.7497 472.1408 -594.1427 472.1408 Q -447.7817 472.1408 -301.4204 472.1408 Q -193.7383 472.1408 -47.3771 472.1408 Q 11.2296 472.1408 11.2296 411.2423 Q 11.2296 398.9147 11.2296 386.5873 Q 11.2296 113.0038 11.2296 -160.5794" fill="none" stroke-width="3.0040" stroke="currentColor"/>
  <path d="M 675.2098 411.2423 L 675.2098 -160.5794" fill="none" stroke-width="3.0040" stroke="currentColor"/>
`;

// Square Table with 4 chairs (from sqr-table.svg) - exact SVG content
const SQUARE_TABLE_SVG = `
  <path d="M -190.2719 805.1529 Q -200.0708 802.4215 -202.1827 797.7318 Q -205.8625 783.7637 -210.2608 770.0048 Q -214.2906 774.4076 -218.3204 778.8103 Q -225.3206 785.1131 -232.9002 779.5205 Q -240.4798 773.9280 -236.5225 765.3801 Q -229.1921 751.3240 -221.8618 737.2679 Q -228.6473 714.4868 -228.1586 616.1589 Q -226.6351 505.2211 -227.4514 394.2759 Q -227.2780 369.6362 -211.9778 350.3218 Q -223.8973 330.3255 -235.8168 310.3293 Q -240.2106 301.7660 -232.2659 296.3332 Q -224.3213 290.9003 -217.9350 298.1009 Q -202.3617 314.1551 -186.7883 330.2093 Q -184.3187 329.0262 -181.7659 328.0353 Q -160.7650 319.3732 -112.7202 318.1656 Q 0.0148 318.1656 112.7498 318.1656 Q 160.7947 319.3732 181.7955 328.0353 Q 184.3483 329.0262 186.8180 330.2093 Q 202.3913 314.1551 217.9647 298.1009 Q 224.3510 290.9003 232.2956 296.3332 Q 240.2402 301.7660 235.8465 310.3293 Q 223.9270 330.3255 212.0074 350.3218 Q 227.3077 369.6362 227.4811 394.2759 Q 226.6647 505.2211 228.1883 616.1589 Q 228.6769 714.4868 221.8914 737.2679 Q 229.2218 751.3240 236.5522 765.3801 Q 240.5094 773.9280 232.9298 779.5205 Q 225.3502 785.1131 218.3501 778.8103 Q 214.3203 774.4076 210.2904 770.0048 Q 205.8922 783.7637 202.2124 797.7318 Q 200.1004 802.4215 190.3016 805.1529 Q 96.5524 828.2055 0.0148 828.2055 Q -96.5227 828.2055 -190.2719 805.1529 Z" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M 210.2904 770.0048 Q 215.5808 753.4556 221.8914 737.2679" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M 212.0074 350.3218 Q 201.7361 337.3557 186.8180 330.2093" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -210.2608 770.0048 Q -215.5511 753.4556 -221.8618 737.2679" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M 114.1875 711.8446 Q 198.2200 685.0221 203.4385 596.9671 Q 209.9374 496.4966 216.3402 396.0199 Q 218.1049 369.5674 200.0793 350.1270 Q 182.0537 330.6867 155.5434 330.4514 Q 78.6072 327.9367 0.7485 327.9367 Q -77.1101 327.9367 -155.5138 330.4514 Q -182.0240 330.6867 -200.0496 350.1270 Q -218.0752 369.5674 -216.3105 396.0199 Q -209.9078 496.4966 -203.4088 596.9671 Q -198.1904 685.0221 -114.1578 711.8446 Q -58.4924 729.8615 0.0148 729.8615 Q 58.5221 729.8615 114.1875 711.8446 Z" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -202.1827 797.7318 C -69.1062 833.1982 69.1359 833.1982 202.2124 797.7318" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -211.9778 350.3218 Q -201.7064 337.3557 -186.7883 330.2093" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -820.5857 185.5716 Q -817.8543 195.3704 -813.1647 197.4823 Q -799.1965 201.1621 -785.4377 205.5604 Q -789.8404 209.5902 -794.2432 213.6200 Q -800.5459 220.6202 -794.9534 228.1998 Q -789.3609 235.7794 -780.8129 231.8222 Q -766.7569 224.4918 -752.7008 217.1614 Q -729.9197 223.9469 -631.5918 223.4582 Q -520.6540 221.9347 -409.7087 222.7511 Q -385.0691 222.5777 -365.7547 207.2774 Q -345.7584 219.1969 -325.7621 231.1165 Q -317.1989 235.5102 -311.7660 227.5656 Q -306.3331 219.6209 -313.5337 213.2346 Q -329.5879 197.6613 -345.6422 182.0880 Q -344.4591 179.6183 -343.4681 177.0655 Q -334.8061 156.0647 -333.5985 108.0198 Q -333.5985 -4.7152 -333.5985 -117.4502 Q -334.8061 -165.4951 -343.4681 -186.4959 Q -344.4591 -189.0487 -345.6422 -191.5183 Q -329.5879 -207.0917 -313.5337 -222.6650 Q -306.3331 -229.0513 -311.7660 -236.9959 Q -317.1989 -244.9406 -325.7621 -240.5468 Q -345.7584 -228.6273 -365.7547 -216.7078 Q -385.0691 -232.0081 -409.7087 -232.1814 Q -520.6540 -231.3651 -631.5918 -232.8886 Q -729.9197 -233.3773 -752.7008 -226.5918 Q -766.7569 -233.9222 -780.8129 -241.2525 Q -789.3609 -245.2098 -794.9534 -237.6302 Q -800.5459 -230.0506 -794.2432 -223.0504 Q -789.8404 -219.0206 -785.4377 -214.9908 Q -799.1965 -210.5925 -813.1647 -206.9127 Q -817.8543 -204.8008 -820.5857 -195.0019 Q -843.6384 -101.2527 -843.6384 -4.7152 Q -843.6384 91.8223 -820.5857 185.5716 Z" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M -785.4377 -214.9908 Q -768.8884 -220.2811 -752.7008 -226.5918" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -365.7547 -216.7078 Q -352.7886 -206.4364 -345.6422 -191.5183" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -785.4377 205.5604 Q -768.8884 210.8507 -752.7008 217.1614" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -727.2774 -118.8878 Q -700.4550 -202.9204 -612.4000 -208.1388 Q -511.9295 -214.6378 -411.4528 -221.0405 Q -385.0003 -222.8052 -365.5599 -204.7796 Q -346.1195 -186.7541 -345.8842 -160.2438 Q -343.3696 -83.3076 -343.3696 -5.4489 Q -343.3696 72.4098 -345.8842 150.8134 Q -346.1195 177.3237 -365.5599 195.3493 Q -385.0003 213.3749 -411.4528 211.6102 Q -511.9295 205.2074 -612.4000 198.7084 Q -700.4550 193.4900 -727.2774 109.4575 Q -745.2943 53.7921 -745.2943 -4.7152 Q -745.2943 -63.2224 -727.2774 -118.8878 Z" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -813.1647 197.4823 C -848.6310 64.4059 -848.6310 -73.8363 -813.1647 -206.9127" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -365.7547 207.2774 Q -352.7886 197.0060 -345.6422 182.0880" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -190.2719 -823.9398 Q -200.0708 -821.2084 -202.1827 -816.5187 Q -205.8625 -802.5506 -210.2608 -788.7917 Q -214.2906 -793.1945 -218.3204 -797.5972 Q -225.3206 -803.9000 -232.9002 -798.3074 Q -240.4798 -792.7149 -236.5225 -784.1670 Q -229.1921 -770.1109 -221.8618 -756.0548 Q -228.6473 -733.2737 -228.1586 -634.9458 Q -226.6351 -524.0080 -227.4514 -413.0628 Q -227.2780 -388.4231 -211.9778 -369.1087 Q -223.8973 -349.1124 -235.8168 -329.1161 Q -240.2106 -320.5529 -232.2659 -315.1200 Q -224.3213 -309.6871 -217.9350 -316.8878 Q -202.3617 -332.9420 -186.7883 -348.9962 Q -184.3187 -347.8131 -181.7659 -346.8221 Q -160.7650 -338.1601 -112.7202 -336.9525 Q 0.0148 -336.9525 112.7498 -336.9525 Q 160.7947 -338.1601 181.7955 -346.8221 Q 184.3483 -347.8131 186.8180 -348.9962 Q 202.3913 -332.9420 217.9647 -316.8878 Q 224.3510 -309.6871 232.2956 -315.1200 Q 240.2402 -320.5529 235.8465 -329.1161 Q 223.9270 -349.1124 212.0074 -369.1087 Q 227.3077 -388.4231 227.4811 -413.0628 Q 226.6647 -524.0080 228.1883 -634.9458 Q 228.6769 -733.2737 221.8914 -756.0548 Q 229.2218 -770.1109 236.5522 -784.1670 Q 240.5094 -792.7149 232.9298 -798.3074 Q 225.3502 -803.9000 218.3501 -797.5972 Q 214.3203 -793.1945 210.2904 -788.7917 Q 205.8922 -802.5506 202.2124 -816.5187 Q 200.1004 -821.2084 190.3016 -823.9398 Q 96.5524 -846.9924 0.0148 -846.9924 Q -96.5227 -846.9924 -190.2719 -823.9398 Z" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M 210.2904 -788.7917 Q 215.5808 -772.2425 221.8914 -756.0548" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M 212.0074 -369.1087 Q 201.7361 -356.1426 186.8180 -348.9962" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -210.2608 -788.7917 Q -215.5511 -772.2425 -221.8618 -756.0548" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M 114.1875 -730.6315 Q 198.2200 -703.8090 203.4385 -615.7540 Q 209.9374 -515.2835 216.3402 -414.8068 Q 218.1049 -388.3543 200.0793 -368.9139 Q 182.0537 -349.4736 155.5434 -349.2383 Q 78.6072 -346.7236 0.7485 -346.7236 Q -77.1101 -346.7236 -155.5138 -349.2383 Q -182.0240 -349.4736 -200.0496 -368.9139 Q -218.0752 -388.3543 -216.3105 -414.8068 Q -209.9078 -515.2835 -203.4088 -615.7540 Q -198.1904 -703.8090 -114.1578 -730.6315 Q -58.4924 -748.6484 0.0148 -748.6484 Q 58.5221 -748.6484 114.1875 -730.6315 Z" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -202.1827 -816.5187 C -69.1062 -851.9851 69.1359 -851.9851 202.2124 -816.5187" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M -211.9778 -369.1087 Q -201.7064 -356.1426 -186.7883 -348.9962" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M 800.7810 185.5716 Q 798.0496 195.3704 793.3600 197.4823 Q 779.3918 201.1621 765.6330 205.5604 Q 770.0357 209.5902 774.4384 213.6200 Q 780.7412 220.6202 775.1487 228.1998 Q 769.5561 235.7794 761.0082 231.8222 Q 746.9521 224.4918 732.8960 217.1614 Q 710.1149 223.9469 611.7871 223.4582 Q 500.8493 221.9347 389.9040 222.7511 Q 365.2643 222.5777 345.9499 207.2774 Q 325.9537 219.1969 305.9574 231.1165 Q 297.3942 235.5102 291.9613 227.5656 Q 286.5284 219.6209 293.7290 213.2346 Q 309.7832 197.6613 325.8374 182.0880 Q 324.6543 179.6183 323.6634 177.0655 Q 315.0014 156.0647 313.7938 108.0198 Q 313.7938 -4.7152 313.7938 -117.4502 Q 315.0014 -165.4951 323.6634 -186.4959 Q 324.6543 -189.0487 325.8374 -191.5183 Q 309.7832 -207.0917 293.7290 -222.6650 Q 286.5284 -229.0513 291.9613 -236.9959 Q 297.3942 -244.9406 305.9574 -240.5468 Q 325.9537 -228.6273 345.9499 -216.7078 Q 365.2643 -232.0081 389.9040 -232.1814 Q 500.8493 -231.3651 611.7871 -232.8886 Q 710.1149 -233.3773 732.8960 -226.5918 Q 746.9521 -233.9222 761.0082 -241.2525 Q 769.5561 -245.2098 775.1487 -237.6302 Q 780.7412 -230.0506 774.4384 -223.0504 Q 770.0357 -219.0206 765.6330 -214.9908 Q 779.3918 -210.5925 793.3600 -206.9127 Q 798.0496 -204.8008 800.7810 -195.0019 Q 823.8336 -101.2527 823.8336 -4.7152 Q 823.8336 91.8223 800.7810 185.5716 Z" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M 765.6330 -214.9908 Q 749.0837 -220.2811 732.8960 -226.5918" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M 345.9499 -216.7078 Q 332.9838 -206.4364 325.8374 -191.5183" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M 765.6330 205.5604 Q 749.0837 210.8507 732.8960 217.1614" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M 707.4727 -118.8878 Q 680.6502 -202.9204 592.5952 -208.1388 Q 492.1247 -214.6378 391.6481 -221.0405 Q 365.1955 -222.8052 345.7552 -204.7796 Q 326.3148 -186.7541 326.0795 -160.2438 Q 323.5649 -83.3076 323.5649 -5.4489 Q 323.5649 72.4098 326.0795 150.8134 Q 326.3148 177.3237 345.7552 195.3493 Q 365.1955 213.3749 391.6481 211.6102 Q 492.1247 205.2074 592.5952 198.7084 Q 680.6502 193.4900 707.4727 109.4575 Q 725.4896 53.7921 725.4896 -4.7152 Q 725.4896 -63.2224 707.4727 -118.8878 Z" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M 793.3600 197.4823 C 828.8263 64.4059 828.8263 -73.8363 793.3600 -206.9127" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M 345.9499 207.2774 Q 332.9838 197.0060 325.8374 182.0880" fill="none" stroke-width="3.3504" stroke="currentColor"/>
  <path d="M 500.0146 -446.4624 Q 500.0146 -501.4058 472.6773 -501.4058 L -472.6476 -501.4058 Q -499.9850 -501.4058 -499.9850 -446.4624 L -499.9850 443.6204 Q -499.9850 498.5638 -472.6476 498.5638 L 472.6773 498.5638 Q 500.0146 498.5638 500.0146 443.6204 L 500.0146 -446.4624" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
`;

// L-Shaped Sectional Sofa (from L-sofa.svg) - exact SVG content
const L_SOFA_SVG = `
  <path d="M -658.3904 -256.6732 Q -658.4740 -695.7410 -658.4740 -1132.9869 Q -658.4740 -1143.0002 -648.4726 -1143.0002 Q 381.6877 -1143.0002 1731.8978 -1143.0002 Q 1741.8993 -1143.0002 1741.8993 -1132.9869 Q 1741.8993 -695.7410 1741.8993 -258.4953 Q 1741.8993 -248.4818 1731.8978 -248.4818 Q 1696.8923 -248.4818 1661.8870 -248.4818 Q 1661.8316 -248.4818 1661.7762 -248.4822 Q 1626.6889 -248.4822 1591.6016 -248.4822 Q 1591.4340 -248.4818 1591.2664 -248.4818 Q 1419.8778 -248.4818 1308.4987 -248.4818 Q 1157.1131 -248.4818 1005.7278 -248.4818 Q 1005.5601 -248.4818 1005.3925 -248.4822 Q 633.8341 -248.4821 262.2759 -248.4818 Q 234.9981 -248.4818 234.9981 -221.1723 Q 234.9981 479.3968 234.9979 1179.9658 Q 234.9981 1180.0212 234.9981 1180.0767 Q 234.9981 1215.1230 234.9981 1250.1695 Q 234.9981 1260.1827 224.9968 1260.1827 Q -211.7379 1260.1827 -648.4726 1260.1827 Q -658.4740 1260.1827 -658.4740 1250.1695 Q -658.4740 621.7870 -658.3904 -256.6732" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M 234.9981 -277.2082 L 234.9981 -1010.8070" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 234.9981 519.8119 Q 234.9981 459.1218 174.3792 459.1218" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -318.4969 -170.5998 Q -318.4969 -248.4818 -394.8188 -248.4818" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 1308.4987 -802.6247 Q 1429.1751 -802.6247 1574.0942 -802.6247 Q 1651.8854 -802.6247 1651.8854 -879.0359 Q 1651.8854 -959.6687 1651.8854 -1010.8070 Q 1651.8854 -1052.8805 1609.8610 -1052.8805 Q 1429.1751 -1052.8805 1308.4987 -1052.8805 Q 1147.8159 -1052.8805 987.1332 -1052.8805 Q 945.1087 -1052.8805 945.1087 -1010.8070 Q 945.1087 -959.6687 945.1087 -879.0359 Q 945.1087 -802.6247 1022.8999 -802.6247 Q 1147.8159 -802.6247 1308.4987 -802.6247" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 206.3056 -248.4818 Q 234.9981 -248.4818 234.9981 -277.2082" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -349.2019 -833.3656 L -542.3255 -1026.7155" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -526.4356 459.1218 Q -568.4602 459.1218 -568.4602 501.1956" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -385.3926 -248.4818 L 206.3056 -248.4818" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -557.4030 -1029.8719 Q -567.9638 -1019.1690 -568.4602 -1010.8070 Q -568.4602 -733.1146 -568.4602 -612.2972 Q -568.4602 -451.4263 -568.4602 -290.5556 Q -568.4602 -248.4818 -526.4356 -248.4818 Q -475.3572 -248.4818 -394.8188 -248.4818 Q -318.4969 -248.4818 -318.4969 -326.3638 Q -318.4969 -451.4263 -318.4969 -612.2972 Q -318.4969 -700.6218 -318.4969 -746.0778 Q -318.4969 -793.1156 -349.2019 -833.3656" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 884.4897 -248.4818 Q 945.1087 -248.4818 945.1087 -309.1718" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 174.3792 1170.0635 Q 234.9981 1170.0635 234.9981 1109.3735" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 174.3792 459.1218 Q 234.9981 459.1218 234.9981 398.4321" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 235.0479 -274.4453 Q 236.3266 -248.4972 262.2759 -248.4816" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -542.3255 -1026.7155 Q -551.2859 -1035.6861 -545.4781 -1041.8104" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 598.3881 -802.6247 Q 719.0647 -802.6247 843.9808 -802.6247 Q 945.1087 -802.6247 945.1087 -879.0359 Q 945.1087 -959.6687 945.1087 -1010.8070 Q 945.1087 -1052.8805 903.0843 -1052.8805 Q 719.0647 -1052.8805 598.3881 -1052.8805 Q 437.7055 -1052.8805 277.0228 -1052.8805 Q 234.9981 -1052.8805 234.9981 -1010.8070 Q 234.9981 -959.6687 234.9981 -879.0359 Q 234.9981 -802.6247 312.7892 -802.6247 Q 437.7055 -802.6247 598.3881 -802.6247" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -394.8188 459.1218 L -526.4356 459.1218" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -318.4969 1092.1815 L -318.4969 560.3683" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 174.3792 459.1218 L -394.8188 459.1218" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -394.8188 1170.0635 Q -318.4969 1170.0635 -318.4969 1092.1815" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -568.4602 417.0483 Q -568.4602 459.1218 -526.4356 459.1218" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 945.1087 -333.7427 Q 945.1087 -321.4572 945.1087 -309.1718 Q 945.1087 -248.4818 1005.7278 -248.4818 Q 1157.1131 -248.4818 1308.4987 -248.4818 Q 1419.8778 -248.4818 1591.2664 -248.4818 Q 1651.8854 -248.4818 1651.8854 -309.1718" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -545.4781 -1041.8104 Q -534.7878 -1052.3836 -526.4356 -1052.8805 Q -249.0681 -1052.8805 -128.3916 -1052.8805 Q 32.2910 -1052.8805 192.9738 -1052.8805 Q 234.9981 -1052.8805 234.9981 -1010.8070 Q 234.9981 -959.6687 234.9981 -879.0359 Q 234.9981 -802.6247 157.2071 -802.6247 Q 32.2910 -802.6247 -128.3916 -802.6247 Q -216.6133 -802.6247 -262.0161 -802.6247 Q -308.9986 -802.6247 -349.2019 -833.3656" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -526.4356 459.1218 L -394.8188 459.1218" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 234.9981 -221.1723 Q 234.9981 -248.4818 262.2759 -248.4818" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -318.4969 381.2397 L -318.4969 -170.5998" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -542.3255 -1026.7155 Q -551.2859 -1035.6861 -557.4030 -1029.8719" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -394.8188 459.1218 Q -318.4969 459.1218 -318.4969 381.2397" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 234.9981 -221.1723 Q 234.9981 -248.4818 206.3056 -248.4818" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -526.4356 -248.4818 Q -568.4602 -248.4818 -568.4602 -206.4083" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -568.4602 1127.9897 Q -568.4602 1170.0635 -526.4356 1170.0635" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 149.8372 459.1218 L 174.3792 459.1218" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -568.4602 501.1956 L -568.4602 1127.9897" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -394.8188 -248.4818 L -526.4356 -248.4818" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -318.4969 560.3683 Q -318.4969 459.1218 -394.8188 459.1218" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -568.4602 -206.4083 L -568.4602 417.0483" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M -526.4356 1170.0635 L 174.3792 1170.0635" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 945.1087 -309.1718 L 945.1087 -879.0359" fill="none" stroke-width="4.8064" stroke="currentColor"/>
  <path d="M 1651.8854 -309.1718 L 1651.8854 -879.0359" fill="none" stroke-width="4.8064" stroke="currentColor"/>
`;

// Kitchen Sink (from kitchen-sink.svg) - exact SVG content
const KITCHEN_SINK_NEW_SVG = `
  <path d="M -350.0000 275.0000 L 350.0000 275.0000 Q 400.0000 275.0000 400.0000 225.0000 L 400.0000 -225.0000 Q 400.0000 -275.0000 350.0000 -275.0000 L -350.0000 -275.0000 Q -400.0000 -275.0000 -400.0000 -225.0000 L -400.0000 225.0000 Q -400.0000 275.0000 -350.0000 275.0000" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M 60.8863 -156.2067 L 63.2259 -155.0000 L 65.5654 -156.2067 L 67.6228 -159.6794 L 69.1498 -165.0000 L 69.9624 -171.5275 L 69.9624 -178.4733 L 69.1498 -185.0000 L 67.6228 -190.3215 L 65.5654 -193.7940 L 63.2259 -195.0000 L 60.8863 -193.7940 L 58.8289 -190.3215 L 57.3019 -185.0000 L 56.4894 -178.4733 L 56.4894 -171.5275 L 57.3019 -165.0000 L 58.8289 -159.6794 L 60.8863 -156.2067" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 65.5654 -193.7940 L 60.3952 -197.5530 L 57.5877 -199.0000 L 54.7803 -197.5530 L 52.3114 -193.3854 L 50.4790 -187.0000 L 49.5039 -179.1677 L 49.5039 -170.8327 L 50.4790 -163.0000 L 52.3114 -156.6154 L 54.7803 -152.4480 L 57.5877 -151.0000 L 60.3952 -152.4480 L 65.5654 -156.2067" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 20.0997 -162.9685 L 57.5877 -151.0000" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 49.8867 -0.0000 C 49.8867 -13.8071 61.0796 -25.0000 74.8867 -25.0000 C 88.6939 -25.0000 99.8867 -13.8071 99.8867 -0.0000 C 99.8867 13.8071 88.6939 25.0000 74.8867 25.0000 C 61.0796 25.0000 49.8867 13.8071 49.8867 -0.0000 Z" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -26.4942 -160.9267 C -22.6084 -153.6114 -15.8710 -148.2283 -7.8785 -146.0530" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 26.4942 -189.0733 C 21.2883 -198.8738 11.0974 -205.0000 -0.0000 -205.0000 C -11.0974 -205.0000 -21.2883 -198.8738 -26.4942 -189.0733" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -69.9623 -175.0000 L -300.0000 -175.0000 Q -350.0000 -175.0000 -350.0000 -125.0000 L -350.0000 175.0000 Q -350.0000 225.0000 -300.0000 225.0000 L -65.0000 225.0000 Q -15.0000 225.0000 -15.0000 175.0000 L -15.0000 -125.0000 Q -15.0000 -145.4400 -29.3177 -160.0256" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -0.0000 -183.0000 L -2.7362 -182.5180 L -5.1423 -181.1286 L -6.9282 -179.0000 L -7.8784 -176.3894 L -7.8784 30.6780 L -9.5263 32.5920 L -10.8329 36.0900 L -10.8329 39.8110 L -9.5263 43.3090 L -7.0707 46.1610 L -3.7622 48.0220 L -0.0000 48.6690 L 3.7622 48.0220 L 7.0707 46.1610 L 9.5263 43.3090 L 10.8329 39.8110 L 10.8329 36.0900 L 9.5263 32.5920 L 7.8785 30.6780 L 7.8785 -176.3894 L 6.9282 -179.0000 L 5.1423 -181.1286 L 2.7362 -182.5180 L -0.0000 -183.0000" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 20.0997 -187.0324 L 57.5877 -199.0000" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 69.8491 -175.0000 L 299.8867 -175.0000 Q 349.8867 -175.0000 349.8867 -125.0000 L 349.8867 175.0000 Q 349.8867 225.0000 299.8867 225.0000 L 64.8867 225.0000 Q 14.8868 225.0000 14.8868 175.0000 L 14.8868 -125.0000 Q 14.8868 -145.4400 29.2044 -160.0256" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -65.5654 -156.2067 L -63.2259 -155.0000 L -60.8863 -156.2067 L -58.8289 -159.6794 L -57.3019 -165.0000 L -56.4894 -171.5275 L -56.4894 -178.4733 L -57.3019 -185.0000 L -58.8289 -190.3215 L -60.8863 -193.7940 L -63.2259 -195.0000 L -65.5654 -193.7940 L -67.6228 -190.3215 L -69.1498 -185.0000 L -69.9623 -178.4733 L -69.9623 -171.5275 L -69.1498 -165.0000 L -67.6228 -159.6794 L -65.5654 -156.2067" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 7.8785 -146.0530 C 15.8710 -148.2283 22.6084 -153.6114 26.4942 -160.9267" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -50.0000 -0.0000 C -50.0000 -13.8071 -61.1929 -25.0000 -75.0000 -25.0000 C -88.8071 -25.0000 -100.0000 -13.8071 -100.0000 -0.0000 C -100.0000 13.8071 -88.8071 25.0000 -75.0000 25.0000 C -61.1929 25.0000 -50.0000 13.8071 -50.0000 -0.0000 Z" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 7.8785 -169.3477 C 11.2742 -173.6989 10.4997 -179.9790 6.1486 -183.3748 C 1.7974 -186.7705 -4.4827 -185.9960 -7.8785 -181.6449 C -10.6989 -178.0310 -10.6989 -172.9616 -7.8785 -169.3477" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -20.0997 -187.0324 L -57.5877 -199.0000" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -65.5654 -156.2067 L -60.3952 -152.4480 L -57.5877 -151.0000 L -54.7802 -152.4480 L -52.3114 -156.6154 L -50.4789 -163.0000 L -49.5039 -170.8327 L -49.5039 -179.1677 L -50.4789 -187.0000 L -52.3114 -193.3854 L -54.7802 -197.5530 L -57.5877 -199.0000 L -60.3952 -197.5530 L -65.5654 -193.7940" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 7.8785 -158.4756 C 17.2787 -162.8268 21.3718 -173.9745 17.0207 -183.3748 C 12.6695 -192.7750 1.5218 -196.8681 -7.8785 -192.5170 C -14.5106 -189.4471 -18.7556 -182.8045 -18.7556 -175.4963 C -18.7556 -168.1881 -14.5106 -161.5455 -7.8785 -158.4756" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -20.0997 -162.9685 L -57.5877 -151.0000" fill="none" stroke-width="2.0000" stroke="currentColor"/>
`;

// Plant Shelf (from plant shelf.svg) - exact SVG content  
const PLANT_SHELF_SVG = `
  <path d="M 144.7134 -226.8161 L -115.2866 -226.8162 L -115.2866 -206.8162 L -236.3597 -206.8161 L -236.3597 93.1839 L 23.6394 93.1839 L 265.7866 93.1839 L 265.7866 -206.8161 L 144.7134 -206.8161 L 144.7134 -226.8161 Z" fill="rgba(247,247,247,1.00)" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -51.5977 -62.4988 C -51.5977 -109.1842 -89.4436 -147.0301 -136.1290 -147.0301 C -182.8143 -147.0301 -220.6603 -109.1842 -220.6603 -62.4988 C -220.6603 -15.8135 -182.8143 22.0325 -136.1290 22.0325 C -89.4436 22.0325 -51.5977 -15.8135 -51.5977 -62.4988 Z" fill="rgba(247,247,247,1.00)" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -191.2807 -31.6229 C -177.8712 -5.5092 -148.1295 7.7944 -119.7247 0.3845 C -91.3198 -7.0254 -71.8670 -33.1624 -72.9227 -62.4988 C -72.9227 -97.4067 -101.2211 -125.7051 -136.1290 -125.7051 C -171.0368 -125.7051 -199.3352 -97.4067 -199.3352 -62.4988 C -199.3352 -51.6874 -196.5620 -41.0566 -191.2807 -31.6229" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -115.2866 -206.8162 L 144.7134 -206.8161" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 23.6394 -206.8162 L 23.6394 93.1838" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 3.6394 -206.8162 L 3.6394 93.1838" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 196.9477 -56.8161 C 196.9477 -88.4891 171.2717 -114.1651 139.5987 -114.1651 C 107.9257 -114.1651 82.2496 -88.4891 82.2496 -56.8161 C 82.2496 -25.1431 107.9257 0.5330 139.5987 0.5330 C 171.2717 0.5330 196.9477 -25.1431 196.9477 -56.8161 Z" fill="rgba(247,247,247,1.00)" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 188.4663 -56.8161 C 188.4663 -83.8049 166.5875 -105.6837 139.5987 -105.6837 C 112.6099 -105.6837 90.7311 -83.8049 90.7311 -56.8161 C 90.7311 -29.8272 112.6099 -7.9485 139.5987 -7.9485 C 166.5875 -7.9485 188.4663 -29.8272 188.4663 -56.8161 Z" fill="none" stroke-width="2.0000" stroke="currentColor"/>
`;

// Sideboard (from sideboard.svg) - exact SVG content
const SIDEBOARD_SVG = `
  <path d="M 610.0000 240.0000 Q 610.0000 -10.0000 610.0000 -260.0000 Q 10.0000 -260.0000 -590.0000 -260.0000 Q -590.0000 -10.0000 -590.0000 240.0000 Q -579.0000 240.0000 -568.0000 240.0000 Q -541.6858 240.0000 -515.3715 240.0000 Q 10.0000 240.0000 535.3715 240.0000 Q 561.6858 240.0000 588.0000 240.0000 Q 599.0000 240.0000 610.0000 240.0000 Z" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M -19.6410 420.4312 Q -290.7423 321.7583 -561.8436 223.0855" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M -25.7974 437.3456 L -19.6410 420.4312" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M -568.0000 240.0000 L -25.7974 437.3456" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M 0.0000 -240.0000 L 0.0000 240.0000" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M 590.0000 240.0000 Q 590.0000 -0.0000 590.0000 -240.0000 Q 10.0000 -240.0000 -570.0000 -240.0000 Q -570.0000 -0.0000 -570.0000 240.0000" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M -19.6410 420.4312 Q 9.2807 332.5335 10.0000 240.0000" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M 20.0000 -240.0000 L 20.0000 240.0000" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M 588.0000 240.0000 L 581.8436 223.0855" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M 39.6410 420.4312 L 45.7974 437.3456" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M -568.0000 240.0000 L -561.8436 223.0855" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M 39.6410 420.4312 Q 10.7193 332.5335 10.0000 240.0000" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M 45.7974 437.3456 L 588.0000 240.0000" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M 581.8436 223.0855 Q 310.7423 321.7583 39.6410 420.4312" fill="none" stroke-width="2.4000" stroke="rgba(188,188,188,1.00)"/>
`;

// Stove (from stove.svg) - exact SVG content
const STOVE_NEW_SVG = `
  <path d="M -246.4638 263.4104 Q -246.4638 288.7623 -246.4638 314.1142 Q -4.3160 314.1142 237.8319 314.1142 Q 237.8319 288.7623 237.8319 263.4104 Q 267.5259 263.4104 297.2199 263.4104 Q 297.2199 -34.5863 297.2199 -332.5828 Q -3.3499 -332.5828 -303.9197 -332.5828 Q -303.9197 -34.5863 -303.9197 263.4104 Q -275.1918 263.4104 -246.4638 263.4104" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M 249.1848 -174.0820 C 249.1848 -238.3252 201.3456 -285.3544 135.9961 -285.3544 C 70.6466 -285.3544 22.8074 -238.3252 22.8074 -174.0820 C 22.8074 -109.8388 70.6466 -62.8096 135.9961 -62.8096 C 201.3456 -62.8096 249.1848 -109.8388 249.1848 -174.0820" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -200.3355 289.5170 L 192.1878 289.5170 L 192.1878 263.4281 L -200.3355 263.4281 L -200.3355 289.5170 Z" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M -246.4638 263.4104 Q -244.5422 263.4104 -242.6205 263.4104" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 192.1862 263.4104 Q 213.3287 263.4104 234.4712 263.4104" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -29.6407 104.2564 C -29.6407 40.0133 -77.4799 -7.0160 -142.8294 -7.0160 C -208.1790 -7.0160 -256.0181 40.0133 -256.0181 104.2564 C -256.0181 168.4996 -208.1790 215.5289 -142.8294 215.5289 C -77.4799 215.5289 -29.6407 168.4996 -29.6407 104.2564" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -29.6407 -174.0820 C -29.6407 -238.3252 -77.4799 -285.3544 -142.8294 -285.3544 C -208.1790 -285.3544 -256.0181 -238.3252 -256.0181 -174.0820 C -256.0181 -109.8388 -208.1790 -62.8096 -142.8294 -62.8096 C -77.4799 -62.8096 -29.6407 -109.8388 -29.6407 -174.0820" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 216.1109 104.7955 C 216.1109 59.3124 182.2416 26.0165 135.9753 26.0165 C 89.7089 26.0165 55.8396 59.3124 55.8396 104.7955 C 55.8396 150.2786 89.7089 183.5745 135.9753 183.5745 C 182.2416 183.5745 216.1109 150.2786 216.1109 104.7955" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -242.6205 263.4104 Q -221.4780 263.4104 -200.3355 263.4104" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 234.4712 263.4104 Q 236.1515 263.4104 237.8319 263.4104" fill="none" stroke-width="2.0000" stroke="currentColor"/>
`;

// Fridge (from fridge.svg) - exact SVG content
const FRIDGE_SVG = `
  <path d="M 372.9691 287.1209 Q -6.1076 304.8763 -385.1717 286.8541 Q -385.1717 254.7860 -385.1717 222.7180 Q -381.2120 222.7180 -377.2522 222.7180 Q -377.2522 218.3437 -377.2522 213.9693 Q -380.9719 213.9693 -384.6916 213.9693 Q -384.6916 -129.8194 -384.6916 -473.6080 L 375.3063 -473.6080 Q 375.3063 -129.8194 375.3063 213.9693 Q 372.5026 213.9693 369.6990 213.9693 Q 369.6990 218.3437 369.6990 222.7180 Q 371.3340 222.7180 372.9691 222.7180 Q 372.9691 254.9195 372.9691 287.1209" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M -363.8049 411.6574 C -371.1544 370.5819 -375.1088 329.0262 -375.6384 287.3017" fill="none" stroke-width="2.0000" stroke="rgba(188,188,188,1.00)"/>
  <path d="M -377.2522 222.7180 Q -28.1694 222.7180 320.9133 222.7180" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M -377.2522 213.9693 Q -28.1694 213.9693 320.9133 213.9693" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 369.6990 249.4802 Q 369.6990 257.5410 369.6990 265.6018 Q 368.2444 277.2618 345.3061 277.2618 Q 322.3678 277.2618 320.9133 265.6018 Q 320.9133 216.8435 320.9133 168.0853 Q 345.3061 168.0853 369.6990 168.0853 Q 369.6990 206.5547 369.6990 245.0242" fill="none" stroke-width="2.0000" stroke="currentColor"/>
  <path d="M 385.1717 277.6445 Q 376.8374 246.5403 368.5030 215.4361 Q 2.3491 313.5467 -363.8049 411.6574 Q -355.5050 442.6327 -347.2052 473.6080 Q 23.6071 392.9072 385.1717 277.6445" fill="none" stroke-width="2.0000" stroke="rgba(188,188,188,1.00)"/>
`;

// Bathtub (from bathtub.svg) - exact SVG content
const BATHTUB_SVG = `
  <path d="M -868.6034 364.7987 Q -868.6034 407.4801 -823.2923 407.4801 Q 30.3453 407.4801 883.9829 407.4801 Q 929.2940 407.4801 929.2940 364.7987 Q 929.2940 6.2510 929.2940 -352.2967 Q 929.2940 -394.9781 883.9829 -394.9781 Q 30.3453 -394.9781 -823.2923 -394.9781 Q -868.6034 -394.9781 -868.6034 -352.2967 Q -868.6034 6.2510 -868.6034 364.7987 Z" fill="rgba(247,247,247,1.00)" stroke-width="10.0000" stroke="currentColor"/>
  <path d="M 761.0623 -12.6747 Q 736.6716 -12.6747 736.6716 6.2510 Q 736.6716 25.1766 761.0623 25.1766 Q 808.5113 27.8079 855.9603 30.4391 Q 869.5288 31.1915 879.4846 23.9988 Q 889.4404 16.8061 889.4404 6.2510 Q 889.4404 -4.3042 879.4846 -11.4968 Q 869.5288 -18.6895 855.9603 -17.9371 Q 808.5113 -15.3059 761.0623 -12.6747 Z" fill="none" stroke-width="3.5958" stroke="currentColor"/>
  <path d="M 830.3343 29.0180 Q 820.2513 233.3849 671.9846 300.1645 Q 661.1475 305.0455 649.5152 306.9831 Q -17.6969 385.7329 -496.0211 368.7930 Q -500.0849 368.6491 -504.1223 368.1387 Q -807.3897 329.8021 -816.0032 6.2510 Q -807.3897 -317.3001 -504.1223 -355.6367 Q -500.0849 -356.1471 -496.0211 -356.2910 Q -17.6969 -373.2310 649.5152 -294.4811 Q 661.1475 -292.5435 671.9846 -287.6625 Q 820.1430 -220.9317 830.3285 -16.5157" fill="none" stroke-width="3.5958" stroke="currentColor"/>
  <path d="M 636.9978 6.2510 C 636.9978 -12.1441 624.2914 -25.6103 606.9342 -25.6103 C 589.5769 -25.6103 576.8706 -12.1441 576.8706 6.2510 C 576.8706 24.6461 589.5769 38.1123 606.9342 38.1123 C 624.2914 38.1123 636.9978 24.6461 636.9978 6.2510" fill="none" stroke-width="3.5958" stroke="currentColor"/>
  <path d="M 789.9605 23.0772 Q 825.7699 25.4165 861.5793 27.7559 Q 871.8193 28.4248 879.3329 22.0300 Q 886.8465 15.6352 886.8465 6.2510 Q 886.8465 -3.1333 879.3329 -9.5280 Q 871.8193 -15.9228 861.5793 -15.2539 Q 825.7699 -12.9145 789.9605 -10.5752 Q 771.5530 -10.5752 771.5530 6.2510 Q 771.5530 23.0772 789.9605 23.0772 Z" fill="none" stroke-width="3.5958" stroke="currentColor"/>
  <path d="M 745.2246 20.6440 Q 737.8415 168.0556 616.2699 207.6009 Q 607.4511 211.2775 597.9852 212.7369 Q 18.8252 293.4123 -370.4158 271.5078 Q -373.7228 271.3942 -377.0082 270.9912 Q -597.4992 247.8980 -604.5085 6.2510 Q -597.4992 -235.3960 -377.0082 -258.4892 Q -373.7228 -258.8922 -370.4158 -259.0058 Q 18.8252 -280.9103 597.9852 -200.2349 Q 607.4511 -198.7755 616.2699 -195.0990 Q 737.8415 -155.5536 745.2246 -8.1420" fill="none" stroke-width="3.5958" stroke="currentColor"/>
`;

// Asset registry
export const ASSET_REGISTRY: AssetDefinition[] = [
  // ==================== FURNITURE ====================
  {
    id: 'king-bed',
    name: 'King Bed',
    category: 'furniture',
    defaultWidth: 1.93,  // 76 inches in meters
    defaultHeight: 2.03, // 80 inches in meters
    viewBox: '-382 -402 764 804',
    svgContent: KING_BED_SVG,
  },
  {
    id: 'queen-bed',
    name: 'Queen Bed',
    category: 'furniture',
    defaultWidth: 1.52,  // 60 inches in meters
    defaultHeight: 2.03, // 80 inches in meters
    viewBox: '-302 -402 604 804',
    svgContent: QUEEN_BED_SVG,
  },
  {
    id: 'dining-table',
    name: 'Dining Table',
    category: 'furniture',
    defaultWidth: 1.8,
    defaultHeight: 1.0,
    viewBox: '-122 -77 244 154',
    svgContent: DINING_TABLE_SVG,
  },
  {
    id: 'chair',
    name: 'Chair',
    category: 'furniture',
    defaultWidth: 0.45,
    defaultHeight: 0.45,
    viewBox: '-27 -42 54 69',
    svgContent: CHAIR_SVG,
  },
  {
    id: 'round-table',
    name: 'Round Table',
    category: 'furniture',
    defaultWidth: 1.2,   // ~4 feet diameter
    defaultHeight: 1.2,
    viewBox: '-795 -795 1590 1590',  // Tight bounds around table + chairs
    svgContent: ROUND_TABLE_SVG,
  },
  {
    id: 'sqr-table',
    name: 'Square Table',
    category: 'furniture',
    defaultWidth: 1.5,   // ~5 feet
    defaultHeight: 1.5,
    viewBox: '-860 -860 1720 1720',  // Tight bounds around table + chairs
    svgContent: SQUARE_TABLE_SVG,
  },
  {
    id: '3-seat-sofa',
    name: '3-Seat Sofa',
    category: 'furniture',
    defaultWidth: 2.4,   // ~8 feet wide
    defaultHeight: 1.0,  // ~3.3 feet deep
    viewBox: '-1077 -487 2120 922',  // Tight bounds
    svgContent: THREE_SEAT_SOFA_SVG,
  },
  {
    id: '2-seat-sofa',
    name: '2-Seat Sofa',
    category: 'furniture',
    defaultWidth: 1.7,   // ~5.5 feet wide
    defaultHeight: 1.0,  // ~3.3 feet deep
    viewBox: '-750 -435 1522 917',  // Tight bounds
    svgContent: TWO_SEAT_SOFA_SVG,
  },
  {
    id: 'l-sofa',
    name: 'L-Shaped Sofa',
    category: 'furniture',
    defaultWidth: 2.8,   // ~9 feet
    defaultHeight: 2.8,  // ~9 feet (L-shape)
    viewBox: '-668 -1153 2420 2423',  // Tight bounds: x(-658 to 1742), y(-1143 to 1260) + stroke buffer
    svgContent: L_SOFA_SVG,
  },

  // ==================== RUGS & MATS ====================
  {
    id: 'area-rug',
    name: 'Area Rug',
    category: 'furniture',
    defaultWidth: 2.4,   // ~8 feet
    defaultHeight: 1.8,  // ~6 feet
    viewBox: '-202 -152 404 304',
    svgContent: AREA_RUG_SVG,
  },
  {
    id: 'round-rug',
    name: 'Round Rug',
    category: 'furniture',
    defaultWidth: 2.0,   // ~6.5 feet diameter
    defaultHeight: 2.0,
    viewBox: '-152 -152 304 304',
    svgContent: ROUND_RUG_SVG,
  },
  {
    id: 'runner-rug',
    name: 'Runner Rug',
    category: 'furniture',
    defaultWidth: 3.0,   // ~10 feet
    defaultHeight: 0.6,  // ~2 feet
    viewBox: '-302 -52 604 104',
    svgContent: RUNNER_RUG_SVG,
  },
  {
    id: 'bath-mat',
    name: 'Bath Mat',
    category: 'furniture',
    defaultWidth: 0.8,   // ~2.6 feet
    defaultHeight: 0.5,  // ~1.6 feet
    viewBox: '-62 -42 124 84',
    svgContent: BATH_MAT_SVG,
  },

  // ==================== PLANTS & PLANTERS ====================
  {
    id: 'floor-planter',
    name: 'Floor Planter',
    category: 'furniture',
    defaultWidth: 0.5,   // ~20 inches diameter
    defaultHeight: 0.5,
    viewBox: '-47 -47 94 94',
    svgContent: FLOOR_PLANTER_SVG,
  },
  {
    id: 'small-plant',
    name: 'Small Plant',
    category: 'furniture',
    defaultWidth: 0.25,  // ~10 inches diameter
    defaultHeight: 0.25,
    viewBox: '-27 -27 54 54',
    svgContent: SMALL_PLANT_SVG,
  },
  {
    id: 'indoor-tree',
    name: 'Indoor Tree',
    category: 'furniture',
    defaultWidth: 0.7,   // ~28 inches diameter
    defaultHeight: 0.7,
    viewBox: '-57 -57 114 114',
    svgContent: INDOOR_TREE_SVG,
  },
  {
    id: 'square-planter',
    name: 'Square Planter',
    category: 'furniture',
    defaultWidth: 0.4,   // ~16 inches
    defaultHeight: 0.4,
    viewBox: '-37 -37 74 74',
    svgContent: SQUARE_PLANTER_SVG,
  },

  // ==================== KITCHEN EQUIPMENT ====================
  {
    id: 'refrigerator',
    name: 'Refrigerator',
    category: 'fixture',
    defaultWidth: 0.9,   // ~36 inches
    defaultHeight: 0.75, // ~30 inches depth
    viewBox: '-47 -92 94 184',
    svgContent: REFRIGERATOR_SVG,
  },
  {
    id: 'stove',
    name: 'Stove/Range',
    category: 'fixture',
    defaultWidth: 0.76,  // ~30 inches
    defaultHeight: 0.66, // ~26 inches depth
    viewBox: '-77 -47 154 94',
    svgContent: STOVE_SVG,
  },
  {
    id: 'kitchen-sink',
    name: 'Kitchen Sink',
    category: 'fixture',
    defaultWidth: 0.84,  // ~33 inches
    defaultHeight: 0.56, // ~22 inches
    viewBox: '-82 -42 164 84',
    svgContent: KITCHEN_SINK_SVG,
  },
  {
    id: 'dishwasher',
    name: 'Dishwasher',
    category: 'fixture',
    defaultWidth: 0.6,   // ~24 inches
    defaultHeight: 0.6,  // ~24 inches depth
    viewBox: '-62 -32 124 64',
    svgContent: DISHWASHER_SVG,
  },
  {
    id: 'kitchen-island',
    name: 'Kitchen Island',
    category: 'fixture',
    defaultWidth: 1.8,   // ~6 feet
    defaultHeight: 0.9,  // ~3 feet
    viewBox: '-122 -62 244 124',
    svgContent: KITCHEN_ISLAND_SVG,
  },
  {
    id: 'microwave',
    name: 'Microwave',
    category: 'fixture',
    defaultWidth: 0.5,   // ~20 inches
    defaultHeight: 0.4,  // ~16 inches
    viewBox: '-52 -32 104 64',
    svgContent: MICROWAVE_SVG,
  },
  {
    id: 'oven',
    name: 'Countertop Oven',
    category: 'fixture',
    defaultWidth: 0.55,  // ~22 inches
    defaultHeight: 0.4,  // ~16 inches
    viewBox: '-57 -37 114 74',
    svgContent: OVEN_SVG,
  },
  {
    id: 'coffee-machine',
    name: 'Coffee Machine',
    category: 'fixture',
    defaultWidth: 0.35,  // ~14 inches
    defaultHeight: 0.3,  // ~12 inches
    viewBox: '-32 -27 64 54',
    svgContent: COFFEE_MACHINE_SVG,
  },

  // ==================== NEW KITCHEN & BATHROOM ====================
  {
    id: 'kitchen-sink-new',
    name: 'Double Kitchen Sink',
    category: 'fixture',
    defaultWidth: 0.9,   // ~36 inches
    defaultHeight: 0.6,  // ~24 inches
    viewBox: '-410 -285 820 560',  // Tight bounds
    svgContent: KITCHEN_SINK_NEW_SVG,
  },
  {
    id: 'stove-new',
    name: 'Cooktop/Stove',
    category: 'fixture',
    defaultWidth: 0.76,  // ~30 inches
    defaultHeight: 0.85, // ~34 inches
    viewBox: '-314 -343 622 667',  // Tight bounds
    svgContent: STOVE_NEW_SVG,
  },
  {
    id: 'fridge',
    name: 'Refrigerator',
    category: 'fixture',
    defaultWidth: 0.9,   // ~36 inches
    defaultHeight: 1.1,  // ~44 inches depth
    viewBox: '-395 -484 800 968',  // Tight bounds
    svgContent: FRIDGE_SVG,
  },
  {
    id: 'bathtub',
    name: 'Bathtub',
    category: 'fixture',
    defaultWidth: 1.8,   // ~6 feet
    defaultHeight: 0.85, // ~34 inches
    viewBox: '-879 -405 1818 822',  // Tight bounds
    svgContent: BATHTUB_SVG,
  },

  // ==================== NEW FURNITURE ====================
  {
    id: 'plant-shelf',
    name: 'Plant Shelf',
    category: 'furniture',
    defaultWidth: 0.6,   // ~24 inches
    defaultHeight: 0.5,  // ~20 inches
    viewBox: '-275 -237 550 340',  // Tight bounds
    svgContent: PLANT_SHELF_SVG,
  },
  {
    id: 'sideboard',
    name: 'Sideboard',
    category: 'furniture',
    defaultWidth: 1.5,   // ~5 feet
    defaultHeight: 0.9,  // ~3 feet
    viewBox: '-620 -270 1240 720',  // Tight bounds
    svgContent: SIDEBOARD_SVG,
  },
];

/**
 * Get an asset definition by ID
 */
export function getAssetById(assetId: string): AssetDefinition | undefined {
  return ASSET_REGISTRY.find(asset => asset.id === assetId);
}

/**
 * Get all assets in a specific category
 */
export function getAssetsByCategory(category: AssetCategory): AssetDefinition[] {
  return ASSET_REGISTRY.filter(asset => asset.category === category);
}

/**
 * Get all available asset categories
 */
export function getAssetCategories(): AssetCategory[] {
  const categories = new Set(ASSET_REGISTRY.map(asset => asset.category));
  return Array.from(categories);
}

