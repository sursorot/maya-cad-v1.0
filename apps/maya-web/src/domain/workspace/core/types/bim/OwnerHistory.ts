/**
 * Owner History - Change tracking for BIM objects
 * Maps to IFC IfcOwnerHistory
 */

export type ChangeAction = 'added' | 'modified' | 'deleted' | 'unchanged';

export interface OwnerHistory {
  /** User or system that created the object */
  createdBy: string;
  
  /** Creation timestamp */
  createdAt: string; // ISO 8601 date string for JSON serialization
  
  /** User or system that last modified the object */
  modifiedBy?: string;
  
  /** Last modification timestamp */
  modifiedAt?: string; // ISO 8601 date string
  
  /** Type of change action */
  changeAction: ChangeAction;
  
  /** Application that created/modified the object */
  applicationName?: string;
  
  /** Version of the application */
  applicationVersion?: string;
}

/**
 * Create a new owner history record
 */
export function createOwnerHistory(
  createdBy: string = 'Maya',
  applicationName: string = 'Maya',
  applicationVersion: string = '3.5'
): OwnerHistory {
  return {
    createdBy,
    createdAt: new Date().toISOString(),
    changeAction: 'added',
    applicationName,
    applicationVersion,
  };
}

/**
 * Update an existing owner history record
 */
export function updateOwnerHistory(
  history: OwnerHistory,
  modifiedBy: string = 'Maya'
): OwnerHistory {
  return {
    ...history,
    modifiedBy,
    modifiedAt: new Date().toISOString(),
    changeAction: 'modified',
  };
}

