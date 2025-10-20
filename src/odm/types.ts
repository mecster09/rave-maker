// ==========================================
// ODM Type Definitions
// ==========================================
// CDISC ODM 1.3 TypeScript Interfaces
// See: https://www.cdisc.org/standards/data-exchange/odm

/**
 * Root ODM element attributes
 */
export interface ODMAttributes {
  FileType: 'Snapshot' | 'Transactional';
  FileOID: string;
  CreationDateTime: string;
  ODMVersion: '1.3';
  xmlns?: string;
  'xmlns:mdsol'?: string;
  'xmlns:xlink'?: string;
}

/**
 * Study reference in ClinicalData
 */
export interface ClinicalData {
  '@_StudyOID': string;
  '@_MetaDataVersionOID': string;
  SubjectData?: SubjectData | SubjectData[];
}

/**
 * Subject data element
 */
export interface SubjectData {
  '@_SubjectKey': string;
  SiteRef?: SiteRef;
  StudyEventData?: StudyEventData | StudyEventData[];
}

/**
 * Site reference
 */
export interface SiteRef {
  '@_LocationOID': string;
}

/**
 * Study Event (Visit) data
 */
export interface StudyEventData {
  '@_StudyEventOID': string;
  '@_StudyEventRepeatKey'?: string;
  FormData?: FormData | FormData[];
}

/**
 * Form data element
 */
export interface FormData {
  '@_FormOID': string;
  '@_FormRepeatKey'?: string;
  ItemGroupData?: ItemGroupData | ItemGroupData[];
}

/**
 * Item Group data element
 */
export interface ItemGroupData {
  '@_ItemGroupOID': string;
  '@_ItemGroupRepeatKey'?: string;
  ItemData?: ItemData | ItemData[];
}

/**
 * Individual data item (field)
 */
export interface ItemData {
  '@_ItemOID': string;
  '@_Value': string | number | boolean;
}

/**
 * Complete ODM structure
 */
export interface ODM {
  '?xml'?: {
    '@_version': '1.0';
    '@_encoding': 'utf-8';
  };
  ODM: {
    '@_FileType': 'Snapshot' | 'Transactional';
    '@_FileOID': string;
    '@_CreationDateTime': string;
    '@_ODMVersion': '1.3';
    '@_xmlns': string;
    '@_xmlns:mdsol'?: string;
    '@_xmlns:xlink'?: string;
    ClinicalData?: ClinicalData | ClinicalData[];
    Study?: Study | Study[];
  };
}

/**
 * Study metadata element
 */
export interface Study {
  '@_OID': string;
  GlobalVariables?: GlobalVariables;
  MetaDataVersion?: MetaDataVersion | MetaDataVersion[];
}

/**
 * Global study variables
 */
export interface GlobalVariables {
  StudyName?: string;
  StudyDescription?: string;
  ProtocolName?: string;
}

/**
 * Metadata version element
 */
export interface MetaDataVersion {
  '@_OID': string;
  '@_Name'?: string;
  Protocol?: Protocol;
  StudyEventDef?: StudyEventDef | StudyEventDef[];
  FormDef?: FormDef | FormDef[];
  ItemGroupDef?: ItemGroupDef | ItemGroupDef[];
  ItemDef?: ItemDef | ItemDef[];
}

/**
 * Protocol definition
 */
export interface Protocol {
  StudyEventRef?: StudyEventRef | StudyEventRef[];
}

/**
 * Study Event reference in protocol
 */
export interface StudyEventRef {
  '@_StudyEventOID': string;
  '@_OrderNumber'?: number;
  '@_Mandatory'?: 'Yes' | 'No';
}

/**
 * Study Event definition
 */
export interface StudyEventDef {
  '@_OID': string;
  '@_Name': string;
  '@_Repeating'?: 'Yes' | 'No';
  '@_Type'?: 'Scheduled' | 'Unscheduled' | 'Common';
  FormRef?: FormRef | FormRef[];
}

/**
 * Form reference in study event
 */
export interface FormRef {
  '@_FormOID': string;
  '@_OrderNumber'?: number;
  '@_Mandatory'?: 'Yes' | 'No';
}

/**
 * Form definition
 */
export interface FormDef {
  '@_OID': string;
  '@_Name': string;
  '@_Repeating'?: 'Yes' | 'No';
  ItemGroupRef?: ItemGroupRef | ItemGroupRef[];
}

/**
 * ItemGroup reference in form
 */
export interface ItemGroupRef {
  '@_ItemGroupOID': string;
  '@_OrderNumber'?: number;
  '@_Mandatory'?: 'Yes' | 'No';
}

/**
 * ItemGroup definition
 */
export interface ItemGroupDef {
  '@_OID': string;
  '@_Name': string;
  '@_Repeating'?: 'Yes' | 'No';
  ItemRef?: ItemRef | ItemRef[];
}

/**
 * Item reference in item group
 */
export interface ItemRef {
  '@_ItemOID': string;
  '@_OrderNumber'?: number;
  '@_Mandatory'?: 'Yes' | 'No';
}

/**
 * Item definition
 */
export interface ItemDef {
  '@_OID': string;
  '@_Name': string;
  '@_DataType': 'text' | 'integer' | 'float' | 'date' | 'datetime' | 'time' | 'boolean';
  '@_Length'?: number;
}

/**
 * RWS Studies response structure
 */
export interface RWSStudies {
  ODM: {
    '@_FileType': 'Snapshot';
    '@_FileOID': string;
    '@_CreationDateTime': string;
    '@_ODMVersion': '1.3';
    Study?: Study | Study[];
  };
}

/**
 * RWS Subjects response structure
 */
export interface RWSSubjects {
  ODM: {
    '@_FileType': 'Snapshot';
    '@_FileOID': string;
    '@_CreationDateTime': string;
    '@_ODMVersion': '1.3';
    ClinicalData: {
      '@_StudyOID': string;
      '@_MetaDataVersionOID': string;
      SubjectData?: Array<{
        '@_SubjectKey': string;
      }>;
    };
  };
}
