/**
 * Layer System - AIA CAD Layer Guidelines compliant
 * 
 * Implements architectural layer standards for CAD/BIM interoperability.
 * Format: [Discipline]-[Major]-[Minor]-[Status]
 */

// ============================================================================
// Discipline Codes (AIA Standard)
// ============================================================================

export type Discipline =
  | 'A'   // Architecture
  | 'S'   // Structural
  | 'M'   // Mechanical
  | 'E'   // Electrical
  | 'P'   // Plumbing
  | 'F'   // Fire Protection
  | 'C'   // Civil
  | 'L'   // Landscape
  | 'I'   // Interior
  | 'G';  // General

export const DISCIPLINE_NAMES: Record<Discipline, string> = {
  'A': 'Architecture',
  'S': 'Structural',
  'M': 'Mechanical',
  'E': 'Electrical',
  'P': 'Plumbing',
  'F': 'Fire Protection',
  'C': 'Civil',
  'L': 'Landscape',
  'I': 'Interior',
  'G': 'General',
};

// ============================================================================
// Layer Category
// ============================================================================

export type LayerCategory =
  | 'major'        // Primary building elements (walls, doors)
  | 'minor'        // Secondary elements (trim, patterns)
  | 'annotation'   // Text, dimensions, symbols
  | 'grid'         // Reference grids
  | 'furniture'    // Furnishings and equipment
  | 'equipment'    // Mechanical/electrical equipment
  | 'ceiling'      // Reflected ceiling plan
  | 'reference';   // Background, xrefs

// ============================================================================
// Line Types
// ============================================================================

export type LineType =
  | 'continuous'
  | 'dashed'
  | 'dotted'
  | 'center'
  | 'hidden'
  | 'phantom';

export const LINE_TYPE_PATTERNS: Record<LineType, number[]> = {
  continuous: [],
  dashed: [10, 5],
  dotted: [2, 4],
  center: [20, 5, 5, 5],
  hidden: [5, 5],
  phantom: [20, 5, 5, 5, 5, 5],
};

// ============================================================================
// Layer Definition
// ============================================================================

export interface Layer {
  /** Unique identifier */
  id: string;
  
  /** Layer name (AIA format: A-WALL, A-DOOR, etc.) */
  name: string;
  
  /** Optional description */
  description?: string;
  
  // Display properties
  /** Layer visibility */
  visible: boolean;
  
  /** Layer lock state (prevent editing) */
  locked: boolean;
  
  /** Display color (hex) */
  color: string;
  
  /** Line weight in mm */
  lineWeight: number;
  
  /** Line type/pattern */
  lineType: LineType;
  
  // Organization
  /** Layer category */
  category: LayerCategory;
  
  /** Discipline code */
  discipline: Discipline;
  
  // Printing
  /** Whether layer prints */
  printable: boolean;
  
  /** Plot style name (for CAD export) */
  plotStyleName?: string;
  
  // Standards compliance
  /** AIA layer name for export */
  aiaLayerName?: string;
  
  /** AutoCAD color index (ACI) for DXF/DWG export */
  aciColor?: number;
}

// ============================================================================
// AutoCAD Color Index (ACI) Mapping
// ============================================================================

export const ACI_COLORS: Record<number, string> = {
  1: '#FF0000',   // Red
  2: '#FFFF00',   // Yellow
  3: '#00FF00',   // Green
  4: '#00FFFF',   // Cyan
  5: '#0000FF',   // Blue
  6: '#FF00FF',   // Magenta
  7: '#FFFFFF',   // White/Black (context-dependent)
  8: '#808080',   // Dark gray
  9: '#C0C0C0',   // Light gray
  250: '#333333', // Very dark gray
  251: '#4D4D4D',
  252: '#666666',
  253: '#808080',
  254: '#999999',
  255: '#FFFFFF', // White
};

export function hexToAci(hex: string): number {
  const upperHex = hex.toUpperCase();
  for (const [aci, color] of Object.entries(ACI_COLORS)) {
    if (color.toUpperCase() === upperHex) {
      return parseInt(aci, 10);
    }
  }
  // Default to white/black
  return 7;
}

// ============================================================================
// Default Layers (AIA-compliant)
// ============================================================================

export const DEFAULT_LAYERS: Layer[] = [
  // Architecture - Major Elements
  {
    id: 'a-wall',
    name: 'A-WALL',
    description: 'Walls',
    category: 'major',
    discipline: 'A',
    color: '#000000',
    visible: true,
    locked: false,
    printable: true,
    lineWeight: 0.35,
    lineType: 'continuous',
    aiaLayerName: 'A-WALL',
    aciColor: 7,
  },
  {
    id: 'a-wall-fire',
    name: 'A-WALL-FIRE',
    description: 'Fire-rated walls',
    category: 'major',
    discipline: 'A',
    color: '#FF0000',
    visible: true,
    locked: false,
    printable: true,
    lineWeight: 0.50,
    lineType: 'continuous',
    aiaLayerName: 'A-WALL-FIRE',
    aciColor: 1,
  },
  {
    id: 'a-wall-patt',
    name: 'A-WALL-PATT',
    description: 'Wall patterns/hatches',
    category: 'minor',
    discipline: 'A',
    color: '#808080',
    visible: true,
    locked: false,
    printable: true,
    lineWeight: 0.13,
    lineType: 'continuous',
    aiaLayerName: 'A-WALL-PATT',
    aciColor: 8,
  },
  
  // Architecture - Doors
  {
    id: 'a-door',
    name: 'A-DOOR',
    description: 'Doors',
    category: 'major',
    discipline: 'A',
    color: '#0000FF',
    visible: true,
    locked: false,
    printable: true,
    lineWeight: 0.25,
    lineType: 'continuous',
    aiaLayerName: 'A-DOOR',
    aciColor: 5,
  },
  {
    id: 'a-door-iden',
    name: 'A-DOOR-IDEN',
    description: 'Door identification/tags',
    category: 'annotation',
    discipline: 'A',
    color: '#0000FF',
    visible: true,
    locked: false,
    printable: true,
    lineWeight: 0.18,
    lineType: 'continuous',
    aiaLayerName: 'A-DOOR-IDEN',
    aciColor: 5,
  },
  
  // Architecture - Windows/Glazing
  {
    id: 'a-glaz',
    name: 'A-GLAZ',
    description: 'Windows and glazing',
    category: 'major',
    discipline: 'A',
    color: '#00FFFF',
    visible: true,
    locked: false,
    printable: true,
    lineWeight: 0.25,
    lineType: 'continuous',
    aiaLayerName: 'A-GLAZ',
    aciColor: 4,
  },
  
  // Architecture - Areas/Rooms
  {
    id: 'a-area',
    name: 'A-AREA',
    description: 'Area boundaries and room labels',
    category: 'minor',
    discipline: 'A',
    color: '#808080',
    visible: true,
    locked: false,
    printable: true,
    lineWeight: 0.18,
    lineType: 'continuous',
    aiaLayerName: 'A-AREA',
    aciColor: 8,
  },
  {
    id: 'a-area-iden',
    name: 'A-AREA-IDEN',
    description: 'Room names and numbers',
    category: 'annotation',
    discipline: 'A',
    color: '#000000',
    visible: true,
    locked: false,
    printable: true,
    lineWeight: 0.18,
    lineType: 'continuous',
    aiaLayerName: 'A-AREA-IDEN',
    aciColor: 7,
  },
  
  // Architecture - Annotations
  {
    id: 'a-anno-dims',
    name: 'A-ANNO-DIMS',
    description: 'Dimensions',
    category: 'annotation',
    discipline: 'A',
    color: '#000000',
    visible: true,
    locked: false,
    printable: true,
    lineWeight: 0.18,
    lineType: 'continuous',
    aiaLayerName: 'A-ANNO-DIMS',
    aciColor: 7,
  },
  {
    id: 'a-anno-text',
    name: 'A-ANNO-TEXT',
    description: 'General text',
    category: 'annotation',
    discipline: 'A',
    color: '#000000',
    visible: true,
    locked: false,
    printable: true,
    lineWeight: 0.18,
    lineType: 'continuous',
    aiaLayerName: 'A-ANNO-TEXT',
    aciColor: 7,
  },
  {
    id: 'a-anno-note',
    name: 'A-ANNO-NOTE',
    description: 'Notes and callouts',
    category: 'annotation',
    discipline: 'A',
    color: '#000000',
    visible: true,
    locked: false,
    printable: true,
    lineWeight: 0.18,
    lineType: 'continuous',
    aiaLayerName: 'A-ANNO-NOTE',
    aciColor: 7,
  },
  {
    id: 'a-anno-nplt',
    name: 'A-ANNO-NPLT',
    description: 'Non-plotting annotations',
    category: 'annotation',
    discipline: 'A',
    color: '#C0C0C0',
    visible: true,
    locked: false,
    printable: false,
    lineWeight: 0.09,
    lineType: 'continuous',
    aiaLayerName: 'A-ANNO-NPLT',
    aciColor: 9,
  },
  
  // Architecture - Furniture
  {
    id: 'a-furn',
    name: 'A-FURN',
    description: 'Furniture',
    category: 'furniture',
    discipline: 'A',
    color: '#808000',
    visible: true,
    locked: false,
    printable: true,
    lineWeight: 0.13,
    lineType: 'continuous',
    aiaLayerName: 'A-FURN',
    aciColor: 2,
  },
  
  // General - Grid
  {
    id: 'g-grid',
    name: 'G-GRID',
    description: 'Column grid',
    category: 'grid',
    discipline: 'G',
    color: '#C0C0C0',
    visible: true,
    locked: true,
    printable: false,
    lineWeight: 0.09,
    lineType: 'continuous',
    aiaLayerName: 'G-GRID',
    aciColor: 9,
  },
  
  // General - Reference
  {
    id: 'g-anno-refr',
    name: 'G-ANNO-REFR',
    description: 'Reference/construction lines',
    category: 'reference',
    discipline: 'G',
    color: '#808080',
    visible: true,
    locked: false,
    printable: false,
    lineWeight: 0.09,
    lineType: 'dashed',
    aiaLayerName: 'G-ANNO-REFR',
    aciColor: 8,
  },
];

// ============================================================================
// Layer Factory Functions
// ============================================================================

/**
 * Create a new layer
 */
export function createLayer(
  name: string,
  discipline: Discipline,
  category: LayerCategory,
  options?: Partial<Omit<Layer, 'id' | 'name' | 'discipline' | 'category'>>
): Layer {
  return {
    id: generateLayerId(),
    name,
    discipline,
    category,
    visible: true,
    locked: false,
    printable: true,
    color: '#000000',
    lineWeight: 0.25,
    lineType: 'continuous',
    ...options,
  };
}

/**
 * Get layer by ID
 */
export function getLayerById(layers: Layer[], id: string): Layer | undefined {
  return layers.find(l => l.id === id);
}

/**
 * Get layer by AIA name
 */
export function getLayerByAiaName(layers: Layer[], aiaName: string): Layer | undefined {
  return layers.find(l => l.aiaLayerName === aiaName || l.name === aiaName);
}

/**
 * Get default layer for a shape type
 */
export function getDefaultLayerForShapeType(
  shapeType: string,
  category?: string
): string {
  switch (shapeType) {
    case 'wall':
      return 'a-wall';
    case 'opening':
      return category === 'window' ? 'a-glaz' : 'a-door';
    case 'room':
    case 'zone':
      return 'a-area';
    case 'dimension':
      return 'a-anno-dims';
    case 'text':
      return 'a-anno-text';
    case 'guideline':
      return 'a-anno-nplt';
    case 'marker':
      return 'g-anno-refr';
    default:
      return 'a-wall'; // Default to wall layer
  }
}

// ============================================================================
// Internal Utilities
// ============================================================================

function generateLayerId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `layer-${crypto.randomUUID()}`;
  }
  return `layer-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

