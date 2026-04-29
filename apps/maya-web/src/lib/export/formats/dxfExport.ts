/**
 * DXF Export - BIM Enhanced
 * Export shapes as DXF format for CAD compatibility (AutoCAD, etc.)
 * 
 * DXF Format Reference:
 * - R12 (AC1009): Simplest format, best compatibility, no handles required
 * - R2000 (AC1015): Requires handles, CLASSES, OBJECTS sections
 * - R2010 (AC1024): Same as R2000 with additional features
 * 
 * BIM Enhancements (Phase 3.1):
 * - AIA CAD Layer Guidelines compliant layer mapping
 * - XDATA for BIM properties (globalId, classification, property sets)
 * - Block definitions for doors and windows with swing/slide representation
 * - Architectural dimension styles
 * - Project metadata in header
 * 
 * This implementation uses R12 format by default for maximum compatibility.
 */

import type { 
  Shape, 
  Point, 
  LineShape, 
  PolylineShape, 
  ArcShape, 
  CircleShape, 
  RectangleShape, 
  WallShape, 
  TextShape,
  DimensionShape,
  OpeningShape,
} from '../../../components/Workspace/types';
import type { ExportBoundingBox, DXFExportOptions, CADUnits, DXFVersion } from '../types';
import { DEFAULT_DXF_LAYER_MAPPING } from '../types';
import { DEFAULT_LAYERS } from '../../../domain/workspace/core/types/bim/Layer';

// Unit codes for $INSUNITS
const UNIT_CODES: Record<CADUnits, number> = {
  mm: 4,
  cm: 5,
  m: 6,
  in: 1,
  ft: 2,
};

// DXF version codes
const VERSION_CODES: Record<DXFVersion, string> = {
  R12: 'AC1009',
  R2000: 'AC1015',
  R2010: 'AC1024',
};

// Handle counter for R2000+ versions
let handleCounter = 0x100;

function getNextHandle(): string {
  return (handleCounter++).toString(16).toUpperCase();
}

function resetHandleCounter(): void {
  handleCounter = 0x100;
}

// ============================================================================
// BIM-specific Constants
// ============================================================================

/** Application ID for Maya BIM XDATA */
const MAYA_BIM_APPID = 'MAYA_BIM';

/** XDATA group codes */
const XDATA_CODES = {
  APP_NAME: 1001,
  STRING: 1000,
  LAYER_NAME: 1003,
  BINARY_CHUNK: 1004,
  DATABASE_HANDLE: 1005,
  POINT_3D: 1010,
  WORLD_SPACE_POSITION: 1011,
  WORLD_SPACE_DISPLACEMENT: 1012,
  WORLD_DIRECTION: 1013,
  REAL: 1040,
  DISTANCE: 1041,
  SCALE_FACTOR: 1042,
  INTEGER_16: 1070,
  INTEGER_32: 1071,
} as const;

/** Block names for opening types */
const BLOCK_NAMES = {
  DOOR_SINGLE: 'MAYA_DOOR_SINGLE',
  DOOR_DOUBLE: 'MAYA_DOOR_DOUBLE',
  WINDOW_SINGLE: 'MAYA_WINDOW',
  WINDOW_DOUBLE: 'MAYA_WINDOW_DOUBLE',
} as const;

/** AIA layer mapping for BIM shapes */
const AIA_LAYER_MAP: Record<string, string> = {
  'wall': 'A-WALL',
  'wall-fire': 'A-WALL-FIRE',
  'wall-patt': 'A-WALL-PATT',
  'door': 'A-DOOR',
  'door-iden': 'A-DOOR-IDEN',
  'window': 'A-GLAZ',
  'opening': 'A-DOOR',
  'room': 'A-AREA',
  'room-iden': 'A-AREA-IDEN',
  'zone': 'A-AREA',
  'dimension': 'A-ANNO-DIMS',
  'text': 'A-ANNO-TEXT',
  'guideline': 'A-ANNO-NPLT',
  'line': 'G-ANNO-REFR',
  'polyline': 'G-ANNO-REFR',
  'arc': 'G-ANNO-REFR',
  'circle': 'G-ANNO-REFR',
  'rectangle': 'G-ANNO-REFR',
  'curve': 'G-ANNO-REFR',
  'furniture': 'A-FURN',
  'marker': 'A-ANNO-NOTE',
};

// ============================================================================
// DXF Building Blocks
// ============================================================================

/**
 * Create a DXF group (code-value pair)
 */
function dxfGroup(code: number, value: string | number): string {
  return `${code}\n${value}\n`;
}

/**
 * Create multiple DXF groups
 */
function dxfGroups(pairs: Array<[number, string | number]>): string {
  return pairs.map(([code, value]) => dxfGroup(code, value)).join('');
}

// ============================================================================
// AIA Layer Helpers
// ============================================================================

/**
 * Get AIA-compliant layer name for a shape
 */
function getAIALayerForShape(shape: Shape, options: DXFExportOptions): string {
  // Check if shape has a BIM layerId assigned
  if (shape.layerId) {
    const layer = DEFAULT_LAYERS.find(l => l.id === shape.layerId);
    if (layer?.aiaLayerName) {
      return layer.aiaLayerName;
    }
  }
  
  // For openings, differentiate between doors and windows
  if (shape.type === 'opening') {
    const openingShape = shape as OpeningShape;
    if (openingShape.category === 'window') {
      return 'A-GLAZ';
    }
    return 'A-DOOR';
  }
  
  // Use AIA mapping
  const aiaLayer = AIA_LAYER_MAP[shape.type];
  if (aiaLayer) {
    return aiaLayer;
  }
  
  // Fallback to standard mapping or GEOMETRY
  const mapping = options.layerMapping || DEFAULT_DXF_LAYER_MAPPING;
  return mapping[shape.type] || 'GEOMETRY';
}

/**
 * Get all unique AIA layers used by shapes
 */
/** Get all unique AIA layers used by shapes */
export function collectUsedAIALayers(shapes: Shape[], options: DXFExportOptions): Set<string> {
  const layers = new Set<string>(['0']); // Always include layer 0
  
  for (const shape of shapes) {
    if (options.useAIALayers) {
      layers.add(getAIALayerForShape(shape, options));
    } else {
      const mapping = options.layerMapping || DEFAULT_DXF_LAYER_MAPPING;
      layers.add(mapping[shape.type] || 'GEOMETRY');
    }
  }
  
  return layers;
}

/**
 * Get layer properties (color, lineweight) from BIM Layer system
 */
function getLayerProperties(layerName: string): { aciColor: number; lineWeight: number } {
  const layer = DEFAULT_LAYERS.find(l => l.aiaLayerName === layerName || l.name === layerName);
  if (layer) {
    return {
      aciColor: layer.aciColor || 7,
      lineWeight: Math.round(layer.lineWeight * 100), // Convert mm to DXF units (hundredths of mm)
    };
  }
  return { aciColor: 7, lineWeight: -3 }; // Default: white, default lineweight
}

// ============================================================================
// XDATA Generation (BIM Properties)
// ============================================================================

/**
 * Generate XDATA block for BIM properties
 */
function generateXData(shape: Shape): string {
  // Use optional chaining for BIM properties that may not exist on all shapes
  const shapeWithBIM = shape as Shape & { name?: string };
  
  if (!shape.globalId && !shape.classification && !shapeWithBIM.name) {
    return '';
  }
  
  const xdataGroups: Array<[number, string | number]> = [
    [XDATA_CODES.APP_NAME, MAYA_BIM_APPID],
  ];
  
  // Add globalId (IFC GUID)
  if (shape.globalId) {
    xdataGroups.push([XDATA_CODES.STRING, `GLOBALID:${shape.globalId}`]);
  }
  
  // Add BIM name
  if (shapeWithBIM.name) {
    xdataGroups.push([XDATA_CODES.STRING, `NAME:${shapeWithBIM.name}`]);
  }
  
  // Add classification
  if (shape.classification) {
    const classStr = `CLASSIFICATION:${shape.classification.system}|${shape.classification.code}|${shape.classification.title}`;
    xdataGroups.push([XDATA_CODES.STRING, classStr]);
  }
  
  // Add property sets summary
  if (shape.propertySets && shape.propertySets.length > 0) {
    for (const pset of shape.propertySets) {
      const psetSummary = `PSET:${pset.name}|${pset.properties.length} properties`;
      xdataGroups.push([XDATA_CODES.STRING, psetSummary]);
    }
  }
  
  // Add shape-specific BIM properties
  if (shape.type === 'wall') {
    const wall = shape as WallShape;
    xdataGroups.push([XDATA_CODES.REAL, wall.thickness]);
    xdataGroups.push([XDATA_CODES.STRING, `ALIGNMENT:${wall.alignment}`]);
  } else if (shape.type === 'opening') {
    const opening = shape as OpeningShape;
    xdataGroups.push([XDATA_CODES.STRING, `CATEGORY:${opening.category}`]);
    xdataGroups.push([XDATA_CODES.REAL, opening.width]);
    xdataGroups.push([XDATA_CODES.REAL, opening.height]);
    if (opening.sillHeight) {
      xdataGroups.push([XDATA_CODES.STRING, `SILL_HEIGHT:${opening.sillHeight}`]);
    }
  }
  
  return dxfGroups(xdataGroups);
}

// ============================================================================
// Header Section
// ============================================================================

function createHeaderSection(options: DXFExportOptions, bounds: ExportBoundingBox): string {
  const version = VERSION_CODES[options.version] || VERSION_CODES.R12;
  const unitCode = UNIT_CODES[options.units] || UNIT_CODES.m;
  
  let header = dxfGroups([
    [0, 'SECTION'],
    [2, 'HEADER'],
    // AutoCAD version
    [9, '$ACADVER'],
    [1, version],
    // Units
    [9, '$INSUNITS'],
    [70, unitCode],
    // Measurement (0 = English, 1 = Metric)
    [9, '$MEASUREMENT'],
    [70, options.units === 'in' || options.units === 'ft' ? 0 : 1],
    // Drawing extents
    [9, '$EXTMIN'],
    [10, bounds.minX],
    [20, bounds.minY],
    [30, 0],
    [9, '$EXTMAX'],
    [10, bounds.maxX],
    [20, bounds.maxY],
    [30, 0],
    // Limits
    [9, '$LIMMIN'],
    [10, bounds.minX],
    [20, bounds.minY],
    [9, '$LIMMAX'],
    [10, bounds.maxX],
    [20, bounds.maxY],
    // Text height default
    [9, '$TEXTSIZE'],
    [40, 0.2],
    // Dimension scale
    [9, '$DIMSCALE'],
    [40, 1.0],
    // Point display mode
    [9, '$PDMODE'],
    [70, 3],
    // Point display size
    [9, '$PDSIZE'],
    [40, 0],
  ]);
  
  // Add project metadata for BIM compliance
  if (options.projectMetadata) {
    const meta = options.projectMetadata;
    
    // Project name (stored in $PROJECTNAME for R2007+, or as custom properties)
    if (meta.projectName) {
      header += dxfGroups([
        [9, '$PROJECTNAME'],
        [1, meta.projectName],
      ]);
    }
    
    // Add custom BIM metadata comments
    // These will be preserved in the DXF as custom variables
    if (meta.projectNumber) {
      header += dxfGroups([
        [9, '$USERI1'],
        [70, 0], // Placeholder for numeric project ID
      ]);
    }
  }
  
  // Default dimension style for architectural drawings
  if (options.includeArchDimStyles !== false) {
    header += dxfGroups([
      [9, '$DIMSTYLE'],
      [2, 'MAYA_ARCH'],
      // Dimension settings for architectural output
      [9, '$DIMASZ'], // Arrow size
      [40, 2.5],
      [9, '$DIMTXT'], // Text height
      [40, 2.5],
      [9, '$DIMTAD'], // Text above dimension line
      [70, 1],
      [9, '$DIMDEC'], // Decimal places
      [70, 3],
    ]);
  }
  
  // Add handle seed for R2000+ versions
  if (options.version !== 'R12') {
    header += dxfGroups([
      [9, '$HANDSEED'],
      [5, 'FFFF'],
    ]);
  }
  
  header += dxfGroup(0, 'ENDSEC');
  
  return header;
}

// ============================================================================
// Tables Section
// ============================================================================

function createTablesSection(options: DXFExportOptions): string {
  const layers = Object.values(options.layerMapping || DEFAULT_DXF_LAYER_MAPPING);
  const uniqueLayers = ['0', ...new Set(layers)]; // Always include layer '0'
  const isR2000Plus = options.version !== 'R12';
  
  let tables = dxfGroups([
    [0, 'SECTION'],
    [2, 'TABLES'],
  ]);
  
  // -------------------------------------------------------------------------
  // VPORT Table (Viewport)
  // -------------------------------------------------------------------------
  if (isR2000Plus) {
    const vportHandle = getNextHandle();
    const activeVportHandle = getNextHandle();
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'VPORT'],
      [5, vportHandle],
      [100, 'AcDbSymbolTable'],
      [70, 1],
      [0, 'VPORT'],
      [5, activeVportHandle],
      [100, 'AcDbSymbolTableRecord'],
      [100, 'AcDbViewportTableRecord'],
      [2, '*ACTIVE'],
      [70, 0],
      [10, 0],
      [20, 0],
      [11, 1],
      [21, 1],
      [12, 0],
      [22, 0],
      [13, 0],
      [23, 0],
      [14, 10],
      [24, 10],
      [15, 10],
      [25, 10],
      [16, 0],
      [26, 0],
      [36, 1],
      [17, 0],
      [27, 0],
      [37, 0],
      [40, 1],
      [41, 1],
      [42, 50],
      [43, 0],
      [44, 0],
      [50, 0],
      [51, 0],
      [71, 0],
      [72, 100],
      [73, 1],
      [74, 3],
      [75, 0],
      [76, 0],
      [77, 0],
      [78, 0],
      [0, 'ENDTAB'],
    ]);
  } else {
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'VPORT'],
      [70, 1],
      [0, 'VPORT'],
      [2, '*ACTIVE'],
      [70, 0],
      [10, 0],
      [20, 0],
      [11, 1],
      [21, 1],
      [12, 0],
      [22, 0],
      [13, 0],
      [23, 0],
      [14, 1],
      [24, 1],
      [15, 0],
      [25, 0],
      [16, 0],
      [26, 0],
      [36, 1],
      [17, 0],
      [27, 0],
      [37, 0],
      [40, 1],
      [41, 1],
      [42, 50],
      [43, 0],
      [44, 0],
      [50, 0],
      [51, 0],
      [71, 0],
      [72, 1000],
      [73, 1],
      [74, 1],
      [75, 0],
      [76, 0],
      [77, 0],
      [78, 0],
      [0, 'ENDTAB'],
    ]);
  }
  
  // -------------------------------------------------------------------------
  // LTYPE Table (Linetypes)
  // -------------------------------------------------------------------------
  if (isR2000Plus) {
    const ltypeTableHandle = getNextHandle();
    const byBlockHandle = getNextHandle();
    const byLayerHandle = getNextHandle();
    const continuousHandle = getNextHandle();
    
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'LTYPE'],
      [5, ltypeTableHandle],
      [100, 'AcDbSymbolTable'],
      [70, 3],
      // ByBlock linetype
      [0, 'LTYPE'],
      [5, byBlockHandle],
      [100, 'AcDbSymbolTableRecord'],
      [100, 'AcDbLinetypeTableRecord'],
      [2, 'ByBlock'],
      [70, 0],
      [3, ''],
      [72, 65],
      [73, 0],
      [40, 0],
      // ByLayer linetype
      [0, 'LTYPE'],
      [5, byLayerHandle],
      [100, 'AcDbSymbolTableRecord'],
      [100, 'AcDbLinetypeTableRecord'],
      [2, 'ByLayer'],
      [70, 0],
      [3, ''],
      [72, 65],
      [73, 0],
      [40, 0],
      // Continuous linetype
      [0, 'LTYPE'],
      [5, continuousHandle],
      [100, 'AcDbSymbolTableRecord'],
      [100, 'AcDbLinetypeTableRecord'],
      [2, 'CONTINUOUS'],
      [70, 0],
      [3, 'Solid line'],
      [72, 65],
      [73, 0],
      [40, 0],
      [0, 'ENDTAB'],
    ]);
  } else {
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'LTYPE'],
      [70, 3],
      // ByBlock linetype
      [0, 'LTYPE'],
      [2, 'BYBLOCK'],
      [70, 0],
      [3, ''],
      [72, 65],
      [73, 0],
      [40, 0],
      // ByLayer linetype
      [0, 'LTYPE'],
      [2, 'BYLAYER'],
      [70, 0],
      [3, ''],
      [72, 65],
      [73, 0],
      [40, 0],
      // Continuous linetype
      [0, 'LTYPE'],
      [2, 'CONTINUOUS'],
      [70, 0],
      [3, 'Solid line'],
      [72, 65],
      [73, 0],
      [40, 0],
      [0, 'ENDTAB'],
    ]);
  }
  
  // -------------------------------------------------------------------------
  // LAYER Table (AIA-compliant with BIM layer properties)
  // -------------------------------------------------------------------------
  if (isR2000Plus) {
    const layerTableHandle = getNextHandle();
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'LAYER'],
      [5, layerTableHandle],
      [100, 'AcDbSymbolTable'],
      [70, uniqueLayers.length],
    ]);
    
    for (const layerName of uniqueLayers) {
      const layerHandle = getNextHandle();
      // Get layer properties from BIM Layer system
      const layerProps = getLayerProperties(layerName);
      
      tables += dxfGroups([
        [0, 'LAYER'],
        [5, layerHandle],
        [100, 'AcDbSymbolTableRecord'],
        [100, 'AcDbLayerTableRecord'],
        [2, layerName],
        [70, 0],
        [62, layerName === '0' ? 7 : layerProps.aciColor],
        [6, 'CONTINUOUS'],
        [370, layerProps.lineWeight], // Lineweight from BIM layer
        [390, 'F'], // PlotStyleName handle
      ]);
    }
  } else {
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'LAYER'],
      [70, uniqueLayers.length],
    ]);
    
    for (const layerName of uniqueLayers) {
      // Get layer properties from BIM Layer system
      const layerProps = getLayerProperties(layerName);
      
      tables += dxfGroups([
        [0, 'LAYER'],
        [2, layerName],
        [70, 0],
        [62, layerName === '0' ? 7 : layerProps.aciColor],
        [6, 'CONTINUOUS'],
      ]);
    }
  }
  tables += dxfGroup(0, 'ENDTAB');
  
  // -------------------------------------------------------------------------
  // STYLE Table (Text styles)
  // -------------------------------------------------------------------------
  if (isR2000Plus) {
    const styleTableHandle = getNextHandle();
    const standardStyleHandle = getNextHandle();
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'STYLE'],
      [5, styleTableHandle],
      [100, 'AcDbSymbolTable'],
      [70, 1],
      [0, 'STYLE'],
      [5, standardStyleHandle],
      [100, 'AcDbSymbolTableRecord'],
      [100, 'AcDbTextStyleTableRecord'],
      [2, 'STANDARD'],
      [70, 0],
      [40, 0],
      [41, 1],
      [50, 0],
      [71, 0],
      [42, 0.2],
      [3, 'txt'],
      [4, ''],
      [0, 'ENDTAB'],
    ]);
  } else {
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'STYLE'],
      [70, 1],
      [0, 'STYLE'],
      [2, 'STANDARD'],
      [70, 0],
      [40, 0],
      [41, 1],
      [50, 0],
      [71, 0],
      [42, 0.2],
      [3, 'txt'],
      [4, ''],
      [0, 'ENDTAB'],
    ]);
  }
  
  // -------------------------------------------------------------------------
  // VIEW Table
  // -------------------------------------------------------------------------
  if (isR2000Plus) {
    const viewTableHandle = getNextHandle();
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'VIEW'],
      [5, viewTableHandle],
      [100, 'AcDbSymbolTable'],
      [70, 0],
      [0, 'ENDTAB'],
    ]);
  } else {
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'VIEW'],
      [70, 0],
      [0, 'ENDTAB'],
    ]);
  }
  
  // -------------------------------------------------------------------------
  // UCS Table
  // -------------------------------------------------------------------------
  if (isR2000Plus) {
    const ucsTableHandle = getNextHandle();
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'UCS'],
      [5, ucsTableHandle],
      [100, 'AcDbSymbolTable'],
      [70, 0],
      [0, 'ENDTAB'],
    ]);
  } else {
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'UCS'],
      [70, 0],
      [0, 'ENDTAB'],
    ]);
  }
  
  // -------------------------------------------------------------------------
  // APPID Table (includes MAYA_BIM for XDATA)
  // -------------------------------------------------------------------------
  const includeBIMAppId = options.includeBIMData !== false;
  const appIdCount = includeBIMAppId ? 2 : 1;
  
  if (isR2000Plus) {
    const appidTableHandle = getNextHandle();
    const acadHandle = getNextHandle();
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'APPID'],
      [5, appidTableHandle],
      [100, 'AcDbSymbolTable'],
      [70, appIdCount],
      [0, 'APPID'],
      [5, acadHandle],
      [100, 'AcDbSymbolTableRecord'],
      [100, 'AcDbRegAppTableRecord'],
      [2, 'ACAD'],
      [70, 0],
    ]);
    
    // Add MAYA_BIM APPID for extended data
    if (includeBIMAppId) {
      const mayaBimHandle = getNextHandle();
      tables += dxfGroups([
        [0, 'APPID'],
        [5, mayaBimHandle],
        [100, 'AcDbSymbolTableRecord'],
        [100, 'AcDbRegAppTableRecord'],
        [2, MAYA_BIM_APPID],
        [70, 0],
      ]);
    }
    
    tables += dxfGroup(0, 'ENDTAB');
  } else {
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'APPID'],
      [70, appIdCount],
      [0, 'APPID'],
      [2, 'ACAD'],
      [70, 0],
    ]);
    
    // Add MAYA_BIM APPID for extended data
    if (includeBIMAppId) {
      tables += dxfGroups([
        [0, 'APPID'],
        [2, MAYA_BIM_APPID],
        [70, 0],
      ]);
    }
    
    tables += dxfGroup(0, 'ENDTAB');
  }
  
  // -------------------------------------------------------------------------
  // DIMSTYLE Table (with architectural dimension styles)
  // -------------------------------------------------------------------------
  const includeArchDimStyles = options.includeArchDimStyles !== false;
  const dimStyleCount = includeArchDimStyles ? 3 : 1;
  
  if (isR2000Plus) {
    const dimstyleTableHandle = getNextHandle();
    const standardDimHandle = getNextHandle();
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'DIMSTYLE'],
      [5, dimstyleTableHandle],
      [100, 'AcDbSymbolTable'],
      [70, dimStyleCount],
      [100, 'AcDbDimStyleTable'],
      [71, dimStyleCount],
      // STANDARD style
      [0, 'DIMSTYLE'],
      [5, standardDimHandle],
      [100, 'AcDbSymbolTableRecord'],
      [100, 'AcDbDimStyleTableRecord'],
      [2, 'STANDARD'],
      [70, 0],
      [41, 1],
      [42, 0.625],
      [43, 3.75],
      [44, 1.25],
      [140, 1.8],
      [141, 2.5],
      [147, 0.625],
      [340, standardDimHandle],
    ]);
    
    // Add architectural dimension styles
    if (includeArchDimStyles) {
      // MAYA_ARCH - Architectural style for meters
      const archDimHandle = getNextHandle();
      tables += dxfGroups([
        [0, 'DIMSTYLE'],
        [5, archDimHandle],
        [100, 'AcDbSymbolTableRecord'],
        [100, 'AcDbDimStyleTableRecord'],
        [2, 'MAYA_ARCH'],
        [70, 0],
        [3, ''], // DIMPOST - suffix
        [4, ''], // DIMAPOST - alt suffix
        [40, 1], // DIMSCALE - overall scale
        [41, 2.5], // DIMASZ - arrow size
        [42, 0.625], // DIMEXO - extension line offset
        [43, 3.75], // DIMDLI - dimension line increment
        [44, 1.25], // DIMEXE - extension line extension
        [140, 2.5], // DIMTXT - text height
        [141, 2.5], // DIMCEN - center mark size
        [147, 1.25], // DIMGAP - gap from dim line to text
        [77, 1], // DIMTAD - text above dimension line
        [78, 0], // DIMZIN - zero suppression
        [144, 1], // DIMLFAC - linear scale factor
        [176, 7], // DIMCLRD - dim line color
        [177, 7], // DIMCLRE - extension line color
        [340, archDimHandle],
      ]);
      
      // MAYA_ARCH_MM - Architectural style for millimeters
      const archMmDimHandle = getNextHandle();
      tables += dxfGroups([
        [0, 'DIMSTYLE'],
        [5, archMmDimHandle],
        [100, 'AcDbSymbolTableRecord'],
        [100, 'AcDbDimStyleTableRecord'],
        [2, 'MAYA_ARCH_MM'],
        [70, 0],
        [3, ' mm'], // DIMPOST - suffix
        [40, 1],
        [41, 2.5],
        [42, 0.625],
        [43, 3.75],
        [44, 1.25],
        [140, 2.5],
        [141, 2.5],
        [147, 1.25],
        [77, 1],
        [144, 1000], // Scale factor for mm display
        [340, archMmDimHandle],
      ]);
    }
    
    tables += dxfGroup(0, 'ENDTAB');
  } else {
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'DIMSTYLE'],
      [70, dimStyleCount],
      // STANDARD style
      [0, 'DIMSTYLE'],
      [2, 'STANDARD'],
      [70, 0],
      [3, ''],
      [4, ''],
      [5, ''],
      [6, ''],
      [7, ''],
      [40, 1],
      [41, 1],
      [42, 0.625],
      [43, 3.75],
      [44, 1.25],
      [45, 0],
      [46, 0],
      [47, 0],
      [48, 0],
      [140, 1.8],
      [141, 2.5],
      [142, 0],
      [143, 0.03937],
      [144, 1],
      [145, 0],
      [146, 1],
      [147, 0.625],
      [71, 0],
      [72, 0],
      [73, 0],
      [74, 0],
      [75, 0],
      [76, 0],
      [77, 1],
      [78, 0],
      [170, 0],
      [171, 3],
      [172, 1],
      [173, 0],
      [174, 0],
      [175, 0],
      [176, 0],
      [177, 0],
      [178, 0],
    ]);
    
    // Add architectural dimension styles for R12
    if (includeArchDimStyles) {
      tables += dxfGroups([
        [0, 'DIMSTYLE'],
        [2, 'MAYA_ARCH'],
        [70, 0],
        [40, 1],
        [41, 2.5],
        [42, 0.625],
        [43, 3.75],
        [44, 1.25],
        [140, 2.5],
        [141, 2.5],
        [147, 1.25],
        [77, 1],
        [0, 'DIMSTYLE'],
        [2, 'MAYA_ARCH_MM'],
        [70, 0],
        [3, ' mm'],
        [40, 1],
        [41, 2.5],
        [140, 2.5],
        [144, 1000],
      ]);
    }
    
    tables += dxfGroup(0, 'ENDTAB');
  }
  
  // -------------------------------------------------------------------------
  // BLOCK_RECORD Table (R2000+ only)
  // -------------------------------------------------------------------------
  if (isR2000Plus) {
    const blockRecordTableHandle = getNextHandle();
    const modelSpaceRecordHandle = getNextHandle();
    const paperSpaceRecordHandle = getNextHandle();
    
    tables += dxfGroups([
      [0, 'TABLE'],
      [2, 'BLOCK_RECORD'],
      [5, blockRecordTableHandle],
      [100, 'AcDbSymbolTable'],
      [70, 2],
      [0, 'BLOCK_RECORD'],
      [5, modelSpaceRecordHandle],
      [100, 'AcDbSymbolTableRecord'],
      [100, 'AcDbBlockTableRecord'],
      [2, '*MODEL_SPACE'],
      [0, 'BLOCK_RECORD'],
      [5, paperSpaceRecordHandle],
      [100, 'AcDbSymbolTableRecord'],
      [100, 'AcDbBlockTableRecord'],
      [2, '*PAPER_SPACE'],
      [0, 'ENDTAB'],
    ]);
  }
  
  tables += dxfGroup(0, 'ENDSEC');
  
  return tables;
}

// ============================================================================
// CLASSES Section (R2000+ only)
// ============================================================================

function createClassesSection(options: DXFExportOptions): string {
  if (options.version === 'R12') {
    return '';
  }
  
  return dxfGroups([
    [0, 'SECTION'],
    [2, 'CLASSES'],
    [0, 'ENDSEC'],
  ]);
}

// ============================================================================
// BLOCKS Section (includes door/window block definitions)
// ============================================================================

/**
 * Create door block definition with swing arc
 * Standard architectural door symbol: rectangle with swing arc
 */
function createDoorBlock(isR2000Plus: boolean, blockName: string, width: number = 1.0): string {
  const doorLayer = 'A-DOOR';
  let block = '';
  
  // Block header
  if (isR2000Plus) {
    const blockHandle = getNextHandle();
    const endBlockHandle = getNextHandle();
    
    block += dxfGroups([
      [0, 'BLOCK'],
      [5, blockHandle],
      [100, 'AcDbEntity'],
      [8, '0'],
      [100, 'AcDbBlockBegin'],
      [2, blockName],
      [70, 0],
      [10, 0],
      [20, 0],
      [30, 0],
      [3, blockName],
      [1, 'Maya BIM Door Block'],
    ]);
    
    // Door leaf (rectangle)
    const leafHandle = getNextHandle();
    block += dxfGroups([
      [0, 'LINE'],
      [5, leafHandle],
      [100, 'AcDbEntity'],
      [8, doorLayer],
      [100, 'AcDbLine'],
      [10, 0],
      [20, 0],
      [30, 0],
      [11, width],
      [21, 0],
      [31, 0],
    ]);
    
    // Door swing arc (90 degree)
    const arcHandle = getNextHandle();
    block += dxfGroups([
      [0, 'ARC'],
      [5, arcHandle],
      [100, 'AcDbEntity'],
      [8, doorLayer],
      [100, 'AcDbCircle'],
      [10, 0], // Center at hinge point
      [20, 0],
      [30, 0],
      [40, width], // Radius = door width
      [100, 'AcDbArc'],
      [50, 0], // Start angle
      [51, 90], // End angle (90 degree swing)
    ]);
    
    // End block
    block += dxfGroups([
      [0, 'ENDBLK'],
      [5, endBlockHandle],
      [100, 'AcDbEntity'],
      [8, '0'],
      [100, 'AcDbBlockEnd'],
    ]);
  } else {
    // R12 format
    block += dxfGroups([
      [0, 'BLOCK'],
      [8, '0'],
      [2, blockName],
      [70, 0],
      [10, 0],
      [20, 0],
      [30, 0],
      // Door leaf line
      [0, 'LINE'],
      [8, doorLayer],
      [10, 0],
      [20, 0],
      [30, 0],
      [11, width],
      [21, 0],
      [31, 0],
      // Door swing arc
      [0, 'ARC'],
      [8, doorLayer],
      [10, 0],
      [20, 0],
      [30, 0],
      [40, width],
      [50, 0],
      [51, 90],
      [0, 'ENDBLK'],
      [8, '0'],
    ]);
  }
  
  return block;
}

/**
 * Create window block definition
 * Standard architectural window symbol: double lines with break
 */
function createWindowBlock(isR2000Plus: boolean, blockName: string, width: number = 1.0): string {
  const windowLayer = 'A-GLAZ';
  const glassOffset = 0.05; // Glass thickness representation
  let block = '';
  
  if (isR2000Plus) {
    const blockHandle = getNextHandle();
    const endBlockHandle = getNextHandle();
    
    block += dxfGroups([
      [0, 'BLOCK'],
      [5, blockHandle],
      [100, 'AcDbEntity'],
      [8, '0'],
      [100, 'AcDbBlockBegin'],
      [2, blockName],
      [70, 0],
      [10, 0],
      [20, 0],
      [30, 0],
      [3, blockName],
      [1, 'Maya BIM Window Block'],
    ]);
    
    // Outer line
    const line1Handle = getNextHandle();
    block += dxfGroups([
      [0, 'LINE'],
      [5, line1Handle],
      [100, 'AcDbEntity'],
      [8, windowLayer],
      [100, 'AcDbLine'],
      [10, 0],
      [20, -glassOffset],
      [30, 0],
      [11, width],
      [21, -glassOffset],
      [31, 0],
    ]);
    
    // Inner line
    const line2Handle = getNextHandle();
    block += dxfGroups([
      [0, 'LINE'],
      [5, line2Handle],
      [100, 'AcDbEntity'],
      [8, windowLayer],
      [100, 'AcDbLine'],
      [10, 0],
      [20, glassOffset],
      [30, 0],
      [11, width],
      [21, glassOffset],
      [31, 0],
    ]);
    
    // Glass line (center, dashed style representation via separate short lines)
    const glassHandle = getNextHandle();
    block += dxfGroups([
      [0, 'LINE'],
      [5, glassHandle],
      [100, 'AcDbEntity'],
      [8, windowLayer],
      [100, 'AcDbLine'],
      [10, 0],
      [20, 0],
      [30, 0],
      [11, width],
      [21, 0],
      [31, 0],
    ]);
    
    block += dxfGroups([
      [0, 'ENDBLK'],
      [5, endBlockHandle],
      [100, 'AcDbEntity'],
      [8, '0'],
      [100, 'AcDbBlockEnd'],
    ]);
  } else {
    // R12 format
    block += dxfGroups([
      [0, 'BLOCK'],
      [8, '0'],
      [2, blockName],
      [70, 0],
      [10, 0],
      [20, 0],
      [30, 0],
      // Outer line
      [0, 'LINE'],
      [8, windowLayer],
      [10, 0],
      [20, -glassOffset],
      [30, 0],
      [11, width],
      [21, -glassOffset],
      [31, 0],
      // Inner line
      [0, 'LINE'],
      [8, windowLayer],
      [10, 0],
      [20, glassOffset],
      [30, 0],
      [11, width],
      [21, glassOffset],
      [31, 0],
      // Glass center line
      [0, 'LINE'],
      [8, windowLayer],
      [10, 0],
      [20, 0],
      [30, 0],
      [11, width],
      [21, 0],
      [31, 0],
      [0, 'ENDBLK'],
      [8, '0'],
    ]);
  }
  
  return block;
}

function createBlocksSection(options: DXFExportOptions): string {
  const isR2000Plus = options.version !== 'R12';
  const useBlocks = options.useBlockReferences !== false;
  
  let blocks = dxfGroups([
    [0, 'SECTION'],
    [2, 'BLOCKS'],
  ]);
  
  if (isR2000Plus) {
    // *MODEL_SPACE block
    const modelBlockHandle = getNextHandle();
    const modelEndBlockHandle = getNextHandle();
    blocks += dxfGroups([
      [0, 'BLOCK'],
      [5, modelBlockHandle],
      [100, 'AcDbEntity'],
      [8, '0'],
      [100, 'AcDbBlockBegin'],
      [2, '*MODEL_SPACE'],
      [70, 0],
      [10, 0],
      [20, 0],
      [30, 0],
      [3, '*MODEL_SPACE'],
      [1, ''],
      [0, 'ENDBLK'],
      [5, modelEndBlockHandle],
      [100, 'AcDbEntity'],
      [8, '0'],
      [100, 'AcDbBlockEnd'],
    ]);
    
    // *PAPER_SPACE block
    const paperBlockHandle = getNextHandle();
    const paperEndBlockHandle = getNextHandle();
    blocks += dxfGroups([
      [0, 'BLOCK'],
      [5, paperBlockHandle],
      [100, 'AcDbEntity'],
      [8, '0'],
      [100, 'AcDbBlockBegin'],
      [2, '*PAPER_SPACE'],
      [70, 0],
      [10, 0],
      [20, 0],
      [30, 0],
      [3, '*PAPER_SPACE'],
      [1, ''],
      [0, 'ENDBLK'],
      [5, paperEndBlockHandle],
      [100, 'AcDbEntity'],
      [8, '0'],
      [100, 'AcDbBlockEnd'],
    ]);
  } else {
    // R12 blocks
    blocks += dxfGroups([
      [0, 'BLOCK'],
      [8, '0'],
      [2, '$MODEL_SPACE'],
      [70, 0],
      [10, 0],
      [20, 0],
      [30, 0],
      [0, 'ENDBLK'],
      [8, '0'],
      [0, 'BLOCK'],
      [67, 1],
      [8, '0'],
      [2, '$PAPER_SPACE'],
      [70, 0],
      [10, 0],
      [20, 0],
      [30, 0],
      [0, 'ENDBLK'],
      [8, '0'],
    ]);
  }
  
  // Add door/window blocks if enabled
  if (useBlocks) {
    blocks += createDoorBlock(isR2000Plus, BLOCK_NAMES.DOOR_SINGLE, 1.0);
    blocks += createWindowBlock(isR2000Plus, BLOCK_NAMES.WINDOW_SINGLE, 1.0);
  }
  
  blocks += dxfGroup(0, 'ENDSEC');
  
  return blocks;
}

// ============================================================================
// OBJECTS Section (R2000+ only)
// ============================================================================

function createObjectsSection(options: DXFExportOptions): string {
  if (options.version === 'R12') {
    return '';
  }
  
  const dictHandle = getNextHandle();
  
  return dxfGroups([
    [0, 'SECTION'],
    [2, 'OBJECTS'],
    [0, 'DICTIONARY'],
    [5, dictHandle],
    [100, 'AcDbDictionary'],
    [281, 1],
    [0, 'ENDSEC'],
  ]);
}

// ============================================================================
// Entity Converters
// ============================================================================

function getLayerForShape(shape: Shape, options: DXFExportOptions): string {
  // Use AIA layers if enabled
  if (options.useAIALayers !== false) {
    return getAIALayerForShape(shape, options);
  }
  
  // Fallback to standard mapping
  const mapping = options.layerMapping || DEFAULT_DXF_LAYER_MAPPING;
  return mapping[shape.type] || 'GEOMETRY';
}

/**
 * Create an INSERT (block reference) entity for an opening
 */
function createBlockInsert(
  shape: OpeningShape, 
  blockName: string, 
  layer: string, 
  isR2000Plus: boolean,
  options: DXFExportOptions
): string {
  // Calculate rotation angle from direction vector
  const rotation = Math.atan2(shape.direction.y, shape.direction.x) * (180 / Math.PI);
  
  // Scale factor based on opening width
  const scaleX = shape.width;
  const scaleY = 1;
  
  const groups: Array<[number, string | number]> = [
    [0, 'INSERT'],
  ];
  
  if (isR2000Plus) {
    groups.push(
      [5, getNextHandle()],
      [100, 'AcDbEntity']
    );
  }
  
  groups.push(
    [8, layer],
    [2, blockName], // Block name
    [10, shape.anchor.x], // Insertion point X
    [20, shape.anchor.y], // Insertion point Y
    [30, 0], // Insertion point Z
    [41, scaleX], // X scale
    [42, scaleY], // Y scale
    [43, 1], // Z scale
    [50, rotation] // Rotation angle
  );
  
  let entity = dxfGroups(groups);
  
  // Add XDATA if enabled
  if (options.includeBIMData !== false) {
    entity += generateXData(shape);
  }
  
  return entity;
}

function lineToEntity(shape: LineShape, layer: string, isR2000Plus: boolean): string {
  const groups: Array<[number, string | number]> = [
    [0, 'LINE'],
  ];
  
  if (isR2000Plus) {
    groups.push(
      [5, getNextHandle()],
      [100, 'AcDbEntity']
    );
  }
  
  groups.push(
    [8, layer],
  );
  
  if (isR2000Plus) {
    groups.push([100, 'AcDbLine']);
  }
  
  groups.push(
    [10, shape.start.x],
    [20, shape.start.y],
    [30, 0],
    [11, shape.end.x],
    [21, shape.end.y],
    [31, 0]
  );
  
  return dxfGroups(groups);
}

function polylineToEntity(shape: PolylineShape, layer: string, isR2000Plus: boolean): string {
  if (shape.points.length < 2) return '';
  
  const groups: Array<[number, string | number]> = [
    [0, 'LWPOLYLINE'],
  ];
  
  if (isR2000Plus) {
    groups.push(
      [5, getNextHandle()],
      [100, 'AcDbEntity']
    );
  }
  
  groups.push([8, layer]);
  
  if (isR2000Plus) {
    groups.push([100, 'AcDbPolyline']);
  }
  
  groups.push(
    [90, shape.points.length],
    [70, 0]
  );
  
  // Add vertices
  for (const point of shape.points) {
    groups.push(
      [10, point.x],
      [20, point.y]
    );
  }
  
  return dxfGroups(groups);
}

function circleToEntity(shape: CircleShape, layer: string, isR2000Plus: boolean): string {
  const groups: Array<[number, string | number]> = [
    [0, 'CIRCLE'],
  ];
  
  if (isR2000Plus) {
    groups.push(
      [5, getNextHandle()],
      [100, 'AcDbEntity']
    );
  }
  
  groups.push([8, layer]);
  
  if (isR2000Plus) {
    groups.push([100, 'AcDbCircle']);
  }
  
  groups.push(
    [10, shape.center.x],
    [20, shape.center.y],
    [30, 0],
    [40, shape.radius]
  );
  
  return dxfGroups(groups);
}

function rectangleToEntity(shape: RectangleShape, layer: string, isR2000Plus: boolean): string {
  // Convert rectangle to closed polyline
  const minX = Math.min(shape.start.x, shape.end.x);
  const maxX = Math.max(shape.start.x, shape.end.x);
  const minY = Math.min(shape.start.y, shape.end.y);
  const maxY = Math.max(shape.start.y, shape.end.y);
  
  const groups: Array<[number, string | number]> = [
    [0, 'LWPOLYLINE'],
  ];
  
  if (isR2000Plus) {
    groups.push(
      [5, getNextHandle()],
      [100, 'AcDbEntity']
    );
  }
  
  groups.push([8, layer]);
  
  if (isR2000Plus) {
    groups.push([100, 'AcDbPolyline']);
  }
  
  groups.push(
    [90, 4],
    [70, 1], // Closed
    [10, minX],
    [20, minY],
    [10, maxX],
    [20, minY],
    [10, maxX],
    [20, maxY],
    [10, minX],
    [20, maxY]
  );
  
  return dxfGroups(groups);
}

function arcToEntity(shape: ArcShape, layer: string, isR2000Plus: boolean): string {
  // Calculate arc center, radius, and angles from 3 points
  const { start, end, controlPoint } = shape;
  
  const ax = start.x, ay = start.y;
  const bx = controlPoint.x, by = controlPoint.y;
  const cx = end.x, cy = end.y;
  
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  
  if (Math.abs(d) < 1e-10) {
    // Points are collinear, draw as line
    const groups: Array<[number, string | number]> = [
      [0, 'LINE'],
    ];
    if (isR2000Plus) {
      groups.push(
        [5, getNextHandle()],
        [100, 'AcDbEntity']
      );
    }
    groups.push(
      [8, layer],
    );
    if (isR2000Plus) {
      groups.push([100, 'AcDbLine']);
    }
    groups.push(
      [10, ax],
      [20, ay],
      [30, 0],
      [11, cx],
      [21, cy],
      [31, 0]
    );
    return dxfGroups(groups);
  }
  
  const centerX = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const centerY = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  const radius = Math.hypot(ax - centerX, ay - centerY);
  
  // Calculate angles in degrees
  let startAngle = Math.atan2(ay - centerY, ax - centerX) * (180 / Math.PI);
  let endAngle = Math.atan2(cy - centerY, cx - centerX) * (180 / Math.PI);
  
  // Normalize angles
  if (startAngle < 0) startAngle += 360;
  if (endAngle < 0) endAngle += 360;
  
  const groups: Array<[number, string | number]> = [
    [0, 'ARC'],
  ];
  
  if (isR2000Plus) {
    groups.push(
      [5, getNextHandle()],
      [100, 'AcDbEntity']
    );
  }
  
  groups.push([8, layer]);
  
  if (isR2000Plus) {
    groups.push([100, 'AcDbCircle']);
  }
  
  groups.push(
    [10, centerX],
    [20, centerY],
    [30, 0],
    [40, radius]
  );
  
  if (isR2000Plus) {
    groups.push([100, 'AcDbArc']);
  }
  
  groups.push(
    [50, startAngle],
    [51, endAngle]
  );
  
  return dxfGroups(groups);
}

function wallToEntity(shape: WallShape, layer: string, isR2000Plus: boolean, options: DXFExportOptions): string {
  if (shape.centerline.length < 2) return '';
  
  // Calculate wall polygon (similar to boundingBox.ts)
  const start = shape.centerline[0];
  const end = shape.centerline[shape.centerline.length - 1];
  const halfThickness = shape.thickness / 2;
  
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  
  if (length < 1e-6) return '';
  
  const perpX = -dy / length;
  const perpY = dx / length;
  
  let alignmentOffset = 0;
  if (shape.alignment === 'inside') {
    alignmentOffset = halfThickness;
  } else if (shape.alignment === 'outside') {
    alignmentOffset = -halfThickness;
  }
  
  const offset1 = alignmentOffset + halfThickness;
  const offset2 = alignmentOffset - halfThickness;
  
  // Four corners of the wall
  const p1 = { x: start.x + perpX * offset1, y: start.y + perpY * offset1 };
  const p2 = { x: start.x + perpX * offset2, y: start.y + perpY * offset2 };
  const p3 = { x: end.x + perpX * offset2, y: end.y + perpY * offset2 };
  const p4 = { x: end.x + perpX * offset1, y: end.y + perpY * offset1 };
  
  const groups: Array<[number, string | number]> = [
    [0, 'LWPOLYLINE'],
  ];
  
  if (isR2000Plus) {
    groups.push(
      [5, getNextHandle()],
      [100, 'AcDbEntity']
    );
  }
  
  groups.push([8, layer]);
  
  if (isR2000Plus) {
    groups.push([100, 'AcDbPolyline']);
  }
  
  groups.push(
    [90, 4],
    [70, 1], // Closed
    [10, p1.x],
    [20, p1.y],
    [10, p4.x],
    [20, p4.y],
    [10, p3.x],
    [20, p3.y],
    [10, p2.x],
    [20, p2.y]
  );
  
  let entity = dxfGroups(groups);
  
  // Add XDATA with BIM properties
  if (options.includeBIMData !== false) {
    entity += generateXData(shape);
  }
  
  return entity;
}

function textToEntity(shape: TextShape, layer: string, isR2000Plus: boolean): string {
  const groups: Array<[number, string | number]> = [
    [0, 'TEXT'],
  ];
  
  if (isR2000Plus) {
    groups.push(
      [5, getNextHandle()],
      [100, 'AcDbEntity']
    );
  }
  
  groups.push([8, layer]);
  
  if (isR2000Plus) {
    groups.push([100, 'AcDbText']);
  }
  
  groups.push(
    [10, shape.position.x],
    [20, shape.position.y],
    [30, 0],
    [40, shape.fontSize],
    [1, shape.content.replace(/\n/g, '\\P')],
    [7, 'STANDARD'],
    [72, shape.textAlign === 'center' ? 1 : shape.textAlign === 'right' ? 2 : 0],
    [11, shape.position.x],
    [21, shape.position.y],
    [31, 0]
  );
  
  if (isR2000Plus) {
    groups.push([100, 'AcDbText']);
  }
  
  return dxfGroups(groups);
}

function dimensionToEntity(shape: DimensionShape, layer: string, isR2000Plus: boolean): string {
  // Export dimension as lines with text
  // Full DIMENSION entity support is complex, so we use simplified representation
  
  const { start, end, offset } = shape;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  
  if (length < 1e-6) return '';
  
  const perpX = -dy / length;
  const perpY = dx / length;
  
  // Offset points
  const offsetStart = {
    x: start.x + perpX * offset,
    y: start.y + perpY * offset,
  };
  const offsetEnd = {
    x: end.x + perpX * offset,
    y: end.y + perpY * offset,
  };
  
  // Dimension value
  const value = shape.value !== undefined ? shape.value : length;
  const midX = (offsetStart.x + offsetEnd.x) / 2;
  const midY = (offsetStart.y + offsetEnd.y) / 2;
  
  // Helper to create a LINE entity with proper handles
  const createLine = (x1: number, y1: number, x2: number, y2: number): string => {
    const groups: Array<[number, string | number]> = [
      [0, 'LINE'],
    ];
    if (isR2000Plus) {
      groups.push(
        [5, getNextHandle()],
        [100, 'AcDbEntity']
      );
    }
    groups.push([8, layer]);
    if (isR2000Plus) {
      groups.push([100, 'AcDbLine']);
    }
    groups.push(
      [10, x1],
      [20, y1],
      [30, 0],
      [11, x2],
      [21, y2],
      [31, 0]
    );
    return dxfGroups(groups);
  };
  
  // Extension lines + dimension line + text
  let entity = '';
  
  // Extension line 1
  entity += createLine(start.x, start.y, offsetStart.x, offsetStart.y);
  
  // Extension line 2
  entity += createLine(end.x, end.y, offsetEnd.x, offsetEnd.y);
  
  // Dimension line
  entity += createLine(offsetStart.x, offsetStart.y, offsetEnd.x, offsetEnd.y);
  
  // Dimension text
  const textGroups: Array<[number, string | number]> = [
    [0, 'TEXT'],
  ];
  if (isR2000Plus) {
    textGroups.push(
      [5, getNextHandle()],
      [100, 'AcDbEntity']
    );
  }
  textGroups.push([8, layer]);
  if (isR2000Plus) {
    textGroups.push([100, 'AcDbText']);
  }
  textGroups.push(
    [10, midX],
    [20, midY],
    [30, 0],
    [40, 0.1],
    [1, value.toFixed(3)],
    [7, 'STANDARD'],
    [72, 1],
    [11, midX],
    [21, midY],
    [31, 0]
  );
  if (isR2000Plus) {
    textGroups.push([100, 'AcDbText']);
  }
  entity += dxfGroups(textGroups);
  
  return entity;
}

function polygonToEntity(points: Point[], layer: string, closed: boolean, isR2000Plus: boolean): string {
  if (points.length < 2) return '';
  
  const groups: Array<[number, string | number]> = [
    [0, 'LWPOLYLINE'],
  ];
  
  if (isR2000Plus) {
    groups.push(
      [5, getNextHandle()],
      [100, 'AcDbEntity']
    );
  }
  
  groups.push([8, layer]);
  
  if (isR2000Plus) {
    groups.push([100, 'AcDbPolyline']);
  }
  
  groups.push(
    [90, points.length],
    [70, closed ? 1 : 0]
  );
  
  for (const p of points) {
    groups.push([10, p.x], [20, p.y]);
  }
  
  return dxfGroups(groups);
}

/**
 * Room entity with XDATA for BIM properties
 */
function roomToEntity(
  shape: Shape & { points: Point[]; area?: number; centroid?: Point }, 
  layer: string, 
  isR2000Plus: boolean, 
  options: DXFExportOptions
): string {
  if (shape.points.length < 3) return '';
  
  let entity = '';
  
  // Room boundary polygon
  const groups: Array<[number, string | number]> = [
    [0, 'LWPOLYLINE'],
  ];
  
  if (isR2000Plus) {
    groups.push(
      [5, getNextHandle()],
      [100, 'AcDbEntity']
    );
  }
  
  groups.push([8, layer]);
  
  if (isR2000Plus) {
    groups.push([100, 'AcDbPolyline']);
  }
  
  groups.push(
    [90, shape.points.length],
    [70, 1] // Closed
  );
  
  for (const p of shape.points) {
    groups.push([10, p.x], [20, p.y]);
  }
  
  entity += dxfGroups(groups);
  
  // Add XDATA for BIM properties
  if (options.includeBIMData !== false) {
    entity += generateXData(shape);
  }
  
  // Add room label at centroid if name exists
  const shapeName = (shape as Shape & { name?: string }).name;
  if (shapeName && shape.centroid) {
    const textGroups: Array<[number, string | number]> = [
      [0, 'TEXT'],
    ];
    if (isR2000Plus) {
      textGroups.push(
        [5, getNextHandle()],
        [100, 'AcDbEntity']
      );
    }
    textGroups.push([8, 'A-AREA-IDEN']);
    if (isR2000Plus) {
      textGroups.push([100, 'AcDbText']);
    }
    textGroups.push(
      [10, shape.centroid.x],
      [20, shape.centroid.y],
      [30, 0],
      [40, 0.15], // Text height
      [1, shapeName],
      [7, 'STANDARD'],
      [72, 1], // Center alignment
      [11, shape.centroid.x],
      [21, shape.centroid.y],
      [31, 0]
    );
    if (isR2000Plus) {
      textGroups.push([100, 'AcDbText']);
    }
    entity += dxfGroups(textGroups);
    
    // Add area text below room name
    if (shape.area) {
      const areaTextGroups: Array<[number, string | number]> = [
        [0, 'TEXT'],
      ];
      if (isR2000Plus) {
        areaTextGroups.push(
          [5, getNextHandle()],
          [100, 'AcDbEntity']
        );
      }
      areaTextGroups.push([8, 'A-AREA-IDEN']);
      if (isR2000Plus) {
        areaTextGroups.push([100, 'AcDbText']);
      }
      areaTextGroups.push(
        [10, shape.centroid.x],
        [20, shape.centroid.y - 0.25],
        [30, 0],
        [40, 0.1],
        [1, `${shape.area.toFixed(2)} m²`],
        [7, 'STANDARD'],
        [72, 1],
        [11, shape.centroid.x],
        [21, shape.centroid.y - 0.25],
        [31, 0]
      );
      if (isR2000Plus) {
        areaTextGroups.push([100, 'AcDbText']);
      }
      entity += dxfGroups(areaTextGroups);
    }
  }
  
  return entity;
}

// ============================================================================
// Main Export Function
// ============================================================================

function shapeToEntity(shape: Shape, options: DXFExportOptions): string {
  const layer = getLayerForShape(shape, options);
  const isR2000Plus = options.version !== 'R12';
  
  switch (shape.type) {
    case 'line':
      return lineToEntity(shape, layer, isR2000Plus);
    case 'polyline':
      return polylineToEntity(shape, layer, isR2000Plus);
    case 'circle':
      return circleToEntity(shape, layer, isR2000Plus);
    case 'rectangle':
      return rectangleToEntity(shape, layer, isR2000Plus);
    case 'arc':
      return arcToEntity(shape, layer, isR2000Plus);
    case 'wall':
      return wallToEntity(shape, layer, isR2000Plus, options);
    case 'text':
      return textToEntity(shape, layer, isR2000Plus);
    case 'dimension':
      return dimensionToEntity(shape, layer, isR2000Plus);
    case 'room':
      return roomToEntity(shape, layer, isR2000Plus, options);
    case 'zone':
      return polygonToEntity(shape.points, layer, true, isR2000Plus);
    case 'curve':
      // Curves are approximated as polylines
      return polylineToEntity({ ...shape, type: 'polyline' } as unknown as PolylineShape, layer, isR2000Plus);
    case 'opening': {
      // Use block insert for doors/windows if enabled
      if (options.useBlockReferences !== false) {
        const blockName = shape.category === 'window'
          ? BLOCK_NAMES.WINDOW_SINGLE
          : BLOCK_NAMES.DOOR_SINGLE;
        return createBlockInsert(shape, blockName, layer, isR2000Plus, options);
      }
      
      // Fallback: Simple line representation
      const halfWidth = shape.width / 2;
      const groups: Array<[number, string | number]> = [
        [0, 'LINE'],
      ];
      if (isR2000Plus) {
        groups.push(
          [5, getNextHandle()],
          [100, 'AcDbEntity']
        );
      }
      groups.push([8, layer]);
      if (isR2000Plus) {
        groups.push([100, 'AcDbLine']);
      }
      groups.push(
        [10, shape.anchor.x - shape.direction.x * halfWidth],
        [20, shape.anchor.y - shape.direction.y * halfWidth],
        [30, 0],
        [11, shape.anchor.x + shape.direction.x * halfWidth],
        [21, shape.anchor.y + shape.direction.y * halfWidth],
        [31, 0]
      );
      
      let entity = dxfGroups(groups);
      
      // Add XDATA
      if (options.includeBIMData !== false) {
        entity += generateXData(shape);
      }
      
      return entity;
    }
    case 'guideline':
      if (!options.includeGuidelines) return '';
      if (shape.start && shape.end) {
        const groups: Array<[number, string | number]> = [
          [0, 'LINE'],
        ];
        if (isR2000Plus) {
          groups.push(
            [5, getNextHandle()],
            [100, 'AcDbEntity']
          );
        }
        groups.push([8, layer]);
        if (isR2000Plus) {
          groups.push([100, 'AcDbLine']);
        }
        groups.push(
          [10, shape.start.x],
          [20, shape.start.y],
          [30, 0],
          [11, shape.end.x],
          [21, shape.end.y],
          [31, 0]
        );
        return dxfGroups(groups);
      }
      return '';
    default:
      return '';
  }
}

function createEntitiesSection(shapes: Shape[], options: DXFExportOptions): string {
  let entities = dxfGroups([
    [0, 'SECTION'],
    [2, 'ENTITIES'],
  ]);
  
  for (const shape of shapes) {
    entities += shapeToEntity(shape, options);
  }
  
  entities += dxfGroup(0, 'ENDSEC');
  
  return entities;
}

/**
 * Export shapes as DXF format
 * 
 * File structure:
 * - HEADER section: Version, units, drawing extents
 * - CLASSES section: (R2000+ only) Object class definitions
 * - TABLES section: Layers, linetypes, styles, etc.
 * - BLOCKS section: Block definitions (required)
 * - ENTITIES section: The actual geometry
 * - OBJECTS section: (R2000+ only) Object dictionary
 * - EOF: End of file marker
 */
export async function exportAsDXF(
  shapes: Shape[],
  bounds: ExportBoundingBox,
  options: DXFExportOptions
): Promise<Blob> {
  // Reset handle counter for each export
  resetHandleCounter();
  
  // Filter out shapes we don't want to export
  let exportShapes = shapes;
  if (!options.includeGuidelines) {
    exportShapes = exportShapes.filter(s => s.type !== 'guideline');
  }
  
  // Build DXF content
  let dxf = '';
  
  // Header section
  dxf += createHeaderSection(options, bounds);
  
  // Classes section (R2000+ only)
  dxf += createClassesSection(options);
  
  // Tables section
  dxf += createTablesSection(options);
  
  // Blocks section (required for all versions)
  dxf += createBlocksSection(options);
  
  // Entities section
  dxf += createEntitiesSection(exportShapes, options);
  
  // Objects section (R2000+ only)
  dxf += createObjectsSection(options);
  
  // EOF
  dxf += dxfGroup(0, 'EOF');
  
  // Use Windows-style line endings for maximum compatibility
  // Some CAD software is strict about line endings
  const dxfWithCRLF = dxf.replace(/\n/g, '\r\n');
  
  return new Blob([dxfWithCRLF], { type: 'application/dxf' });
}

/**
 * Get a preview of the DXF content (for debugging)
 */
export function getDXFPreview(
  shapes: Shape[],
  bounds: ExportBoundingBox,
  options: DXFExportOptions
): string {
  // Reset handle counter for preview
  resetHandleCounter();
  
  let dxf = '';
  dxf += createHeaderSection(options, bounds);
  dxf += createClassesSection(options);
  dxf += createTablesSection(options);
  dxf += createBlocksSection(options);
  dxf += createEntitiesSection(shapes.slice(0, 5), options); // Only first 5 shapes
  dxf += createObjectsSection(options);
  dxf += dxfGroup(0, 'EOF');
  return dxf;
}

