// ==========================================
// RWS Utilities
// ==========================================
// Helper functions for RWS operations

import { parseStudyOID, buildStudyOID } from '../odm/odmModels';

/**
 * Study name parser result
 */
export interface ParsedStudyName {
  projectName: string;
  environment: string;
  studyOID: string;
}

/**
 * Parse RWS study name format: ProjectName(Environment)
 * 
 * @param studyName - Study name in format "ProjectName(Environment)"
 * @returns Parsed components or null if invalid format
 * 
 * @example
 * parseRWSStudyName("Mediflex(Prod)") // { projectName: "Mediflex", environment: "Prod", studyOID: "Mediflex(Prod)" }
 * parseRWSStudyName("RaveSim(Test)") // { projectName: "RaveSim", environment: "Test", studyOID: "RaveSim(Test)" }
 */
export function parseRWSStudyName(studyName: string): ParsedStudyName | null {
  const parsed = parseStudyOID(studyName);
  if (!parsed) return null;

  return {
    projectName: parsed.projectName,
    environment: parsed.environment,
    studyOID: studyName
  };
}

/**
 * Build RWS study name from components
 * 
 * @param projectName - Project name
 * @param environment - Environment (Prod, Test, Dev, etc.)
 * @returns Study name in RWS format
 * 
 * @example
 * buildRWSStudyName("Mediflex", "Prod") // "Mediflex(Prod)"
 */
export function buildRWSStudyName(projectName: string, environment: string): string {
  return buildStudyOID(projectName, environment);
}

/**
 * Validate RWS study name format
 * 
 * @param studyName - Study name to validate
 * @returns True if valid RWS format
 */
export function isValidRWSStudyName(studyName: string): boolean {
  return parseRWSStudyName(studyName) !== null;
}

/**
 * Extract project and environment from URL parameter
 * Used in routes like /studies/{project}({env})/...
 * 
 * @param param - URL parameter value
 * @returns Parsed components or null
 */
export function parseStudyParam(param: string): ParsedStudyName | null {
  return parseRWSStudyName(param);
}

/**
 * Format current date/time for ODM CreationDateTime
 * 
 * @returns ISO 8601 datetime string
 */
export function getCurrentODMDateTime(): string {
  return new Date().toISOString();
}

/**
 * Generate subject key in standard format
 * 
 * @param siteCode - Site code
 * @param subjectNumber - Subject number
 * @returns Subject key
 * 
 * @example
 * generateSubjectKey("SITE-1", 1) // "SUBJ-SITE-1-001"
 */
export function generateSubjectKey(siteCode: string, subjectNumber: number): string {
  const paddedNumber = subjectNumber.toString().padStart(3, '0');
  return `SUBJ-${siteCode}-${paddedNumber}`;
}

/**
 * Validate metadata version OID format
 * 
 * @param oid - Metadata version OID
 * @returns True if valid
 */
export function isValidMetadataVersionOID(oid: string): boolean {
  return /^\d+$/.test(oid) || /^v\d+(\.\d+)*$/i.test(oid);
}
