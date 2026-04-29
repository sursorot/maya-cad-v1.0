/**
 * Classification System - Industry standard classification codes
 * 
 * Supports OmniClass, Uniclass 2015, MasterFormat, UniFormat, and custom systems.
 * Compatible with IFC IfcClassificationReference.
 */

// ============================================================================
// Classification System Types
// ============================================================================

export type ClassificationSystemType =
  | 'OmniClass'
  | 'Uniclass2015'
  | 'MasterFormat'
  | 'UniFormat'
  | 'NRM'           // UK New Rules of Measurement
  | 'SfB'           // Swedish classification
  | 'custom';

// ============================================================================
// Classification Reference
// ============================================================================

export interface ClassificationReference {
  /** Classification system identifier */
  system: ClassificationSystemType;
  
  /** Classification code (e.g., "21-01 10 10" for OmniClass) */
  code: string;
  
  /** Human-readable title */
  title: string;
  
  /** Edition/version of the classification system */
  edition?: string;
  
  /** Optional description */
  description?: string;
  
  /** Source/location of the classification system */
  source?: string;
}

// ============================================================================
// OmniClass Tables (Table 21 - Elements, Table 23 - Products)
// ============================================================================

export const OMNICLASS_TABLE_21 = {
  // Substructure
  '21-01 10': { title: 'Substructure', table: 21 },
  '21-01 10 10': { title: 'Foundations', table: 21 },
  
  // Shell
  '21-02': { title: 'Shell', table: 21 },
  '21-02 10': { title: 'Superstructure', table: 21 },
  '21-02 10 10': { title: 'Floor Construction', table: 21 },
  '21-02 10 20': { title: 'Roof Construction', table: 21 },
  '21-02 20': { title: 'Exterior Enclosure', table: 21 },
  '21-02 20 10': { title: 'Exterior Walls', table: 21 },
  '21-02 20 14': { title: 'Exterior Windows', table: 21 },
  '21-02 20 18': { title: 'Exterior Doors', table: 21 },
  
  // Interiors
  '21-03': { title: 'Interiors', table: 21 },
  '21-03 10': { title: 'Interior Construction', table: 21 },
  '21-03 10 10': { title: 'Partitions', table: 21 },
  '21-03 10 20': { title: 'Interior Doors', table: 21 },
  '21-03 20': { title: 'Interior Finishes', table: 21 },
  '21-03 20 10': { title: 'Wall Finishes', table: 21 },
  '21-03 20 20': { title: 'Floor Finishes', table: 21 },
  '21-03 20 30': { title: 'Ceiling Finishes', table: 21 },
  
  // Services
  '21-04': { title: 'Services', table: 21 },
  '21-04 10': { title: 'Fire Protection', table: 21 },
  '21-04 20': { title: 'Plumbing', table: 21 },
  '21-04 30': { title: 'HVAC', table: 21 },
  '21-04 40': { title: 'Electrical', table: 21 },
} as const;

// ============================================================================
// Uniclass 2015 (UK Standard)
// ============================================================================

export const UNICLASS_2015 = {
  // Systems (Ss)
  'Ss_25': { title: 'Wall and barrier systems', category: 'Ss' },
  'Ss_25_10': { title: 'Wall structure systems', category: 'Ss' },
  'Ss_25_10_30': { title: 'Framed wall structure systems', category: 'Ss' },
  'Ss_25_10_50': { title: 'Monolithic wall structure systems', category: 'Ss' },
  'Ss_25_30': { title: 'External wall systems', category: 'Ss' },
  'Ss_25_50': { title: 'Internal wall systems', category: 'Ss' },
  
  'Ss_30': { title: 'Roof and floor opening systems', category: 'Ss' },
  'Ss_32': { title: 'Door and window systems', category: 'Ss' },
  'Ss_32_10': { title: 'Door systems', category: 'Ss' },
  'Ss_32_10_30': { title: 'External door systems', category: 'Ss' },
  'Ss_32_10_35': { title: 'Hinged door systems', category: 'Ss' },
  'Ss_32_10_70': { title: 'Sliding door systems', category: 'Ss' },
  'Ss_32_20': { title: 'Window systems', category: 'Ss' },
  
  // Products (Pr)
  'Pr_25': { title: 'Wall and barrier products', category: 'Pr' },
  'Pr_25_71': { title: 'Doors', category: 'Pr' },
  'Pr_25_71_21': { title: 'External doors', category: 'Pr' },
  'Pr_25_71_36': { title: 'Internal doors', category: 'Pr' },
  
  // Spaces (Sp)
  'Sp_30': { title: 'Commercial spaces', category: 'Sp' },
  'Sp_32': { title: 'Office spaces', category: 'Sp' },
  'Sp_45': { title: 'Circulation spaces', category: 'Sp' },
  'Sp_55': { title: 'Storage spaces', category: 'Sp' },
  'Sp_65': { title: 'Sanitary and cleaning spaces', category: 'Sp' },
} as const;

// ============================================================================
// Classification Factory Functions
// ============================================================================

/**
 * Create a classification reference
 */
export function createClassification(
  system: ClassificationSystemType,
  code: string,
  title: string,
  options?: {
    edition?: string;
    description?: string;
    source?: string;
  }
): ClassificationReference {
  return {
    system,
    code,
    title,
    ...options,
  };
}

/**
 * Create an OmniClass classification
 */
export function createOmniClassRef(code: string, title?: string): ClassificationReference {
  const lookup = OMNICLASS_TABLE_21[code as keyof typeof OMNICLASS_TABLE_21];
  return {
    system: 'OmniClass',
    code,
    title: title || lookup?.title || code,
    edition: '2012',
    source: 'https://www.csiresources.org/standards/omniclass',
  };
}

/**
 * Create a Uniclass 2015 classification
 */
export function createUniclassRef(code: string, title?: string): ClassificationReference {
  const lookup = UNICLASS_2015[code as keyof typeof UNICLASS_2015];
  return {
    system: 'Uniclass2015',
    code,
    title: title || lookup?.title || code,
    edition: '2015 v1.31',
    source: 'https://www.thenbs.com/our-tools/uniclass-2015',
  };
}

// ============================================================================
// Default Classifications for Shape Types
// ============================================================================

export const DEFAULT_CLASSIFICATIONS = {
  wall: {
    external: createOmniClassRef('21-02 20 10', 'Exterior Walls'),
    internal: createOmniClassRef('21-03 10 10', 'Partitions'),
  },
  door: {
    external: createOmniClassRef('21-02 20 18', 'Exterior Doors'),
    internal: createOmniClassRef('21-03 10 20', 'Interior Doors'),
  },
  window: {
    external: createOmniClassRef('21-02 20 14', 'Exterior Windows'),
  },
  room: {
    office: createUniclassRef('Sp_32', 'Office spaces'),
    circulation: createUniclassRef('Sp_45', 'Circulation spaces'),
    storage: createUniclassRef('Sp_55', 'Storage spaces'),
    sanitary: createUniclassRef('Sp_65', 'Sanitary and cleaning spaces'),
  },
} as const;

// ============================================================================
// Search and Validation
// ============================================================================

/**
 * Search OmniClass codes by title
 */
export function searchOmniClass(query: string): ClassificationReference[] {
  const normalizedQuery = query.toLowerCase();
  return Object.entries(OMNICLASS_TABLE_21)
    .filter(([, data]) => data.title.toLowerCase().includes(normalizedQuery))
    .map(([code, data]) => createOmniClassRef(code, data.title));
}

/**
 * Search Uniclass codes by title
 */
export function searchUniclass(query: string): ClassificationReference[] {
  const normalizedQuery = query.toLowerCase();
  return Object.entries(UNICLASS_2015)
    .filter(([, data]) => data.title.toLowerCase().includes(normalizedQuery))
    .map(([code, data]) => createUniclassRef(code, data.title));
}

/**
 * Validate a classification code format
 */
export function validateClassificationCode(
  system: ClassificationSystemType,
  code: string
): boolean {
  switch (system) {
    case 'OmniClass':
      // OmniClass format: XX-XX XX XX (with optional spaces)
      return /^\d{2}-\d{2}(\s?\d{2}){0,2}$/.test(code.replace(/\s+/g, ' ').trim());
    case 'Uniclass2015':
      // Uniclass format: Xx_XX_XX_XX
      return /^[A-Z][a-z](_\d{2}){1,3}$/.test(code);
    case 'MasterFormat':
      // MasterFormat: XX XX XX
      return /^\d{2}(\s\d{2}){0,2}$/.test(code);
    default:
      return code.length > 0;
  }
}

