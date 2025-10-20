// ==========================================
// RWS ODM Data Models
// ==========================================
// Models aligned with CDISC ODM 1.3 and Medidata RWS

import { SimulatorConfig } from './config';

/**
 * Study in RWS format: ProjectName(Environment)
 */
export interface Study {
  oid: string;                    // e.g., "RaveSim(Test)"
  projectName: string;            // e.g., "RaveSim"
  environment: string;            // e.g., "Test", "Prod", "Dev"
  name: string;                   // Display name
  description?: string;
  metadataVersionOID: string;     // e.g., "1"
  config: SimulatorConfig;
  status?: "running" | "stopped";
}

/**
 * Site (Location)
 */
export interface Site {
  oid: string;                    // LocationOID, e.g., "SITE-1"
  studyOID: string;               // Study reference
  code: string;                   // Site code
  name: string;                   // Site name
}

/**
 * Subject
 */
export interface Subject {
  subjectKey: string;             // Subject identifier, e.g., "SUBJ-001"
  studyOID: string;               // Study reference
  siteOID: string;                // Site reference
}

/**
 * Study Event (Visit)
 */
export interface StudyEvent {
  oid: string;                    // StudyEventOID, e.g., "SCREENING"
  name: string;                   // Event name
  day: number;                    // Protocol day
  repeating: boolean;             // Whether event can repeat
  type: 'Scheduled' | 'Unscheduled' | 'Common';
  formOIDs: string[];             // Forms in this event
}

/**
 * Form Definition
 */
export interface FormDef {
  oid: string;                    // FormOID, e.g., "VITALS"
  name: string;                   // Form name
  repeating: boolean;             // Whether form can repeat
  itemGroupOIDs: string[];        // Item groups in this form
}

/**
 * Item Group Definition
 */
export interface ItemGroupDef {
  oid: string;                    // ItemGroupOID, e.g., "VITALS_LOG_LINE"
  name: string;                   // Group name
  repeating: boolean;             // Whether group can repeat
  itemOIDs: string[];             // Items in this group
}

/**
 * Item (Field) Definition
 */
export interface ItemDef {
  oid: string;                    // ItemOID, e.g., "VITALS.BP_SYSTOLIC"
  name: string;                   // Item name
  dataType: 'text' | 'integer' | 'float' | 'date' | 'datetime' | 'time' | 'boolean';
  length?: number;
}

/**
 * Subject Event Instance (actual visit occurrence)
 */
export interface SubjectEvent {
  subjectKey: string;             // Subject reference
  studyEventOID: string;          // Event reference
  repeatKey: number;              // Repeat number
  eventDate?: string;             // ISO date when event occurred
  formInstances: FormInstance[];  // Forms completed at this event
}

/**
 * Form Instance (actual form data)
 */
export interface FormInstance {
  formOID: string;                // Form reference
  repeatKey: number;              // Repeat number
  subjectKey: string;             // Subject reference
  studyEventOID: string;          // Event reference
  studyEventRepeatKey: number;    // Event repeat
  itemGroupInstances: ItemGroupInstance[];
  lastUpdated: string;            // ISO datetime
}

/**
 * Item Group Instance (actual group data)
 */
export interface ItemGroupInstance {
  itemGroupOID: string;           // Group reference
  repeatKey?: number;             // Repeat number (for repeating groups)
  items: ItemInstance[];          // Field values
}

/**
 * Item Instance (actual field value)
 */
export interface ItemInstance {
  itemOID: string;                // Item reference
  value: string | number | boolean | null;
}

/**
 * Query (Data Query)
 */
export interface Query {
  id: string;
  studyOID: string;
  subjectKey: string;
  formOID: string;
  itemOID: string;
  type: "MissingData" | "OutOfRange" | "Inconsistency";
  status: "Open" | "Answered" | "Closed";
  queryText: string;
  createdAt: string;
}

/**
 * Visit Configuration (from config file)
 */
export interface VisitConfig {
  name: string;
  day: number;
  forms: string[];
  probability: number;
  simulate_missed?: boolean;
  simulate_delayed?: boolean;
  max_delay_days?: number;
  partial_forms?: boolean;
  missing_field_probability?: number;
}

