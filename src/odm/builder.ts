// ==========================================
// ODM XML Builder
// ==========================================
// Functions to build CDISC ODM 1.3 XML documents

import { XMLBuilder } from 'fast-xml-parser';
import { v4 as uuid } from 'uuid';
import type { ODM, ClinicalData, SubjectData, StudyEventData, FormData, ItemGroupData, ItemData, Study, RWSStudies, RWSSubjects } from './types';

const ODM_NAMESPACE = 'http://www.cdisc.org/ns/odm/v1.3';
const MDSOL_NAMESPACE = 'http://www.mdsol.com/ns/odm/metadata';

/**
 * XML builder configuration for ODM
 */
const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
  attributeNamePrefix: '@_'
});

/**
 * Generate ISO 8601 datetime string
 */
function getCurrentDateTime(): string {
  return new Date().toISOString();
}

/**
 * Build complete ODM XML document
 */
export function buildODM(clinicalData?: ClinicalData | ClinicalData[], study?: Study | Study[]): string {
  const odm: ODM = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'utf-8'
    },
    ODM: {
      '@_FileType': 'Snapshot',
      '@_FileOID': uuid(),
      '@_CreationDateTime': getCurrentDateTime(),
      '@_ODMVersion': '1.3',
      '@_xmlns': ODM_NAMESPACE,
      '@_xmlns:mdsol': MDSOL_NAMESPACE,
      '@_xmlns:xlink': 'http://www.w3.org/1999/xlink'
    }
  };

  if (clinicalData) {
    odm.ODM.ClinicalData = clinicalData;
  }

  if (study) {
    odm.ODM.Study = study;
  }

  return xmlBuilder.build(odm);
}

/**
 * Build ClinicalData element
 */
export function buildClinicalData(
  studyOID: string,
  metadataVersionOID: string,
  subjects?: SubjectData[]
): ClinicalData {
  return {
    '@_StudyOID': studyOID,
    '@_MetaDataVersionOID': metadataVersionOID,
    SubjectData: subjects && subjects.length > 0 ? subjects : undefined
  };
}

/**
 * Build SubjectData element
 */
export function buildSubjectData(
  subjectKey: string,
  siteOID?: string,
  studyEvents?: StudyEventData[]
): SubjectData {
  return {
    '@_SubjectKey': subjectKey,
    SiteRef: siteOID ? { '@_LocationOID': siteOID } : undefined,
    StudyEventData: studyEvents && studyEvents.length > 0 ? studyEvents : undefined
  };
}

/**
 * Build StudyEventData element
 */
export function buildStudyEventData(
  studyEventOID: string,
  repeatKey: string | number,
  forms?: FormData[]
): StudyEventData {
  return {
    '@_StudyEventOID': studyEventOID,
    '@_StudyEventRepeatKey': repeatKey.toString(),
    FormData: forms && forms.length > 0 ? forms : undefined
  };
}

/**
 * Build FormData element
 */
export function buildFormData(
  formOID: string,
  repeatKey: string | number,
  itemGroups?: ItemGroupData[]
): FormData {
  return {
    '@_FormOID': formOID,
    '@_FormRepeatKey': repeatKey.toString(),
    ItemGroupData: itemGroups && itemGroups.length > 0 ? itemGroups : undefined
  };
}

/**
 * Build ItemGroupData element
 */
export function buildItemGroupData(
  itemGroupOID: string,
  items?: ItemData[]
): ItemGroupData {
  return {
    '@_ItemGroupOID': itemGroupOID,
    ItemData: items && items.length > 0 ? items : undefined
  };
}

/**
 * Build ItemData element
 */
export function buildItemData(
  itemOID: string,
  value: string | number | boolean
): ItemData {
  return {
    '@_ItemOID': itemOID,
    '@_Value': value.toString()
  };
}

/**
 * Build Study element for metadata
 */
export function buildStudy(
  studyOID: string,
  studyName: string,
  studyDescription?: string
): Study {
  return {
    '@_OID': studyOID,
    GlobalVariables: {
      StudyName: studyName,
      StudyDescription: studyDescription
    }
  };
}

/**
 * Build RWS Studies list response
 */
export function buildRWSStudies(studies: Array<{ oid: string; name: string; description?: string }>): string {
  const studyElements = studies.map(s => buildStudy(s.oid, s.name, s.description));
  
  const response: RWSStudies = {
    ODM: {
      '@_FileType': 'Snapshot',
      '@_FileOID': uuid(),
      '@_CreationDateTime': getCurrentDateTime(),
      '@_ODMVersion': '1.3',
      Study: studyElements.length === 1 ? studyElements[0] : studyElements
    }
  };

  return xmlBuilder.build({ '?xml': { '@_version': '1.0', '@_encoding': 'utf-8' }, ...response });
}

/**
 * Build RWS Subjects list response
 */
export function buildRWSSubjects(
  studyOID: string,
  metadataVersionOID: string,
  subjectKeys: string[]
): string {
  const response: RWSSubjects = {
    ODM: {
      '@_FileType': 'Snapshot',
      '@_FileOID': uuid(),
      '@_CreationDateTime': getCurrentDateTime(),
      '@_ODMVersion': '1.3',
      ClinicalData: {
        '@_StudyOID': studyOID,
        '@_MetaDataVersionOID': metadataVersionOID,
        SubjectData: subjectKeys.map(key => ({ '@_SubjectKey': key }))
      }
    }
  };

  return xmlBuilder.build({ '?xml': { '@_version': '1.0', '@_encoding': 'utf-8' }, ...response });
}

/**
 * Build complete clinical dataset ODM
 */
export function buildClinicalDataset(
  studyOID: string,
  metadataVersionOID: string,
  subjects: Array<{
    subjectKey: string;
    siteOID: string;
    events: Array<{
      eventOID: string;
      repeatKey: string | number;
      forms: Array<{
        formOID: string;
        repeatKey: string | number;
        itemGroups: Array<{
          itemGroupOID: string;
          items: Array<{
            itemOID: string;
            value: string | number | boolean;
          }>;
        }>;
      }>;
    }>;
  }>
): string {
  const subjectData: SubjectData[] = subjects.map(subject => {
    const studyEvents: StudyEventData[] = subject.events.map(event => {
      const forms: FormData[] = event.forms.map(form => {
        const itemGroups: ItemGroupData[] = form.itemGroups.map(group => {
          const items: ItemData[] = group.items.map(item =>
            buildItemData(item.itemOID, item.value)
          );
          return buildItemGroupData(group.itemGroupOID, items);
        });
        return buildFormData(form.formOID, form.repeatKey, itemGroups);
      });
      return buildStudyEventData(event.eventOID, event.repeatKey, forms);
    });
    return buildSubjectData(subject.subjectKey, subject.siteOID, studyEvents);
  });

  const clinicalData = buildClinicalData(studyOID, metadataVersionOID, subjectData);
  return buildODM(clinicalData);
}
