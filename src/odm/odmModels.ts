// ==========================================
// ODM Metadata Models
// ==========================================
// Study metadata definitions for ODM structure

import { StudyEvent, FormDef, ItemGroupDef, ItemDef } from '../models';

/**
 * Complete study metadata for ODM
 */
export interface StudyMetadata {
  studyOID: string;
  studyName: string;
  studyDescription?: string;
  protocolName?: string;
  metadataVersionOID: string;
  metadataVersionName?: string;
  studyEvents: StudyEvent[];
  forms: FormDef[];
  itemGroups: ItemGroupDef[];
  items: ItemDef[];
}

/**
 * Helper to create default metadata for common clinical data
 */
export function createDefaultMetadata(studyOID: string, studyName: string): StudyMetadata {
  // Define common items (fields)
  const items: ItemDef[] = [
    // Vital Signs
    { oid: 'VITALS.BP_SYSTOLIC', name: 'Systolic BP', dataType: 'integer' },
    { oid: 'VITALS.BP_DIASTOLIC', name: 'Diastolic BP', dataType: 'integer' },
    { oid: 'VITALS.HEART_RATE', name: 'Heart Rate', dataType: 'integer' },
    { oid: 'VITALS.TEMPERATURE', name: 'Temperature', dataType: 'float' },
    { oid: 'VITALS.WEIGHT', name: 'Weight (kg)', dataType: 'float' },
    { oid: 'VITALS.HEIGHT', name: 'Height (cm)', dataType: 'float' },
    
    // Demographics
    { oid: 'DEMO.FIRSTNAME', name: 'First Name', dataType: 'text', length: 50 },
    { oid: 'DEMO.LASTNAME', name: 'Last Name', dataType: 'text', length: 50 },
    { oid: 'DEMO.DOB', name: 'Date of Birth', dataType: 'date' },
    { oid: 'DEMO.GENDER', name: 'Gender', dataType: 'text', length: 1 },
    { oid: 'DEMO.ETHNICITY', name: 'Ethnicity', dataType: 'text', length: 50 },
    
    // Labs
    { oid: 'LABS.HEMOGLOBIN', name: 'Hemoglobin', dataType: 'float' },
    { oid: 'LABS.WBC', name: 'White Blood Cell Count', dataType: 'float' },
    { oid: 'LABS.PLATELETS', name: 'Platelet Count', dataType: 'integer' },
    { oid: 'LABS.CREATININE', name: 'Creatinine', dataType: 'float' },
    { oid: 'LABS.ALT', name: 'ALT', dataType: 'integer' },
    { oid: 'LABS.AST', name: 'AST', dataType: 'integer' },
    
    // Adverse Events
    { oid: 'AE.TERM', name: 'AE Term', dataType: 'text', length: 200 },
    { oid: 'AE.SEVERITY', name: 'Severity', dataType: 'text', length: 20 },
    { oid: 'AE.START_DATE', name: 'Start Date', dataType: 'date' },
    { oid: 'AE.END_DATE', name: 'End Date', dataType: 'date' },
    { oid: 'AE.OUTCOME', name: 'Outcome', dataType: 'text', length: 50 }
  ];

  // Define item groups
  const itemGroups: ItemGroupDef[] = [
    {
      oid: 'VITALS_LOG_LINE',
      name: 'Vital Signs Log Line',
      repeating: false,
      itemOIDs: [
        'VITALS.BP_SYSTOLIC',
        'VITALS.BP_DIASTOLIC',
        'VITALS.HEART_RATE',
        'VITALS.TEMPERATURE',
        'VITALS.WEIGHT',
        'VITALS.HEIGHT'
      ]
    },
    {
      oid: 'DEMO_LOG_LINE',
      name: 'Demographics Log Line',
      repeating: false,
      itemOIDs: [
        'DEMO.FIRSTNAME',
        'DEMO.LASTNAME',
        'DEMO.DOB',
        'DEMO.GENDER',
        'DEMO.ETHNICITY'
      ]
    },
    {
      oid: 'LABS_LOG_LINE',
      name: 'Laboratory Results Log Line',
      repeating: false,
      itemOIDs: [
        'LABS.HEMOGLOBIN',
        'LABS.WBC',
        'LABS.PLATELETS',
        'LABS.CREATININE',
        'LABS.ALT',
        'LABS.AST'
      ]
    },
    {
      oid: 'AE_LOG_LINE',
      name: 'Adverse Event Log Line',
      repeating: true,
      itemOIDs: [
        'AE.TERM',
        'AE.SEVERITY',
        'AE.START_DATE',
        'AE.END_DATE',
        'AE.OUTCOME'
      ]
    }
  ];

  // Define forms
  const forms: FormDef[] = [
    {
      oid: 'VITALS',
      name: 'Vital Signs',
      repeating: false,
      itemGroupOIDs: ['VITALS_LOG_LINE']
    },
    {
      oid: 'DEMOGRAPHICS',
      name: 'Demographics',
      repeating: false,
      itemGroupOIDs: ['DEMO_LOG_LINE']
    },
    {
      oid: 'LABS',
      name: 'Laboratory Results',
      repeating: false,
      itemGroupOIDs: ['LABS_LOG_LINE']
    },
    {
      oid: 'AE',
      name: 'Adverse Events',
      repeating: true,
      itemGroupOIDs: ['AE_LOG_LINE']
    }
  ];

  // Define study events
  const studyEvents: StudyEvent[] = [
    {
      oid: 'SCREENING',
      name: 'Screening',
      day: 1,
      repeating: false,
      type: 'Scheduled',
      formOIDs: ['DEMOGRAPHICS', 'VITALS', 'LABS']
    },
    {
      oid: 'BASELINE',
      name: 'Baseline',
      day: 14,
      repeating: false,
      type: 'Scheduled',
      formOIDs: ['VITALS', 'LABS']
    },
    {
      oid: 'VISIT_1',
      name: 'Visit 1',
      day: 28,
      repeating: false,
      type: 'Scheduled',
      formOIDs: ['VITALS', 'LABS', 'AE']
    },
    {
      oid: 'VISIT_2',
      name: 'Visit 2',
      day: 56,
      repeating: false,
      type: 'Scheduled',
      formOIDs: ['VITALS', 'LABS', 'AE']
    },
    {
      oid: 'END_OF_STUDY',
      name: 'End of Study',
      day: 84,
      repeating: false,
      type: 'Scheduled',
      formOIDs: ['VITALS', 'LABS', 'AE']
    },
    {
      oid: 'UNSCHEDULED',
      name: 'Unscheduled Visit',
      day: 0,
      repeating: true,
      type: 'Unscheduled',
      formOIDs: ['VITALS', 'AE']
    }
  ];

  return {
    studyOID,
    studyName,
    metadataVersionOID: '1',
    metadataVersionName: 'Version 1.0',
    studyEvents,
    forms,
    itemGroups,
    items
  };
}

/**
 * Parse study OID to extract project name and environment
 */
export function parseStudyOID(studyOID: string): { projectName: string; environment: string } | null {
  const match = studyOID.match(/^(.+)\((.+)\)$/);
  if (!match) return null;
  
  return {
    projectName: match[1],
    environment: match[2]
  };
}

/**
 * Build study OID from project name and environment
 */
export function buildStudyOID(projectName: string, environment: string): string {
  return `${projectName}(${environment})`;
}
