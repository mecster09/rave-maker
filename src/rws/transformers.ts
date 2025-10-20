// ==========================================
// RWS Data Transformers
// ==========================================
// Transform internal data models to ODM builder format

import { SubjectEvent, FormInstance, ItemGroupInstance, ItemInstance } from '../models';

/**
 * Clinical data subject format for ODM builder
 */
export interface ClinicalDataSubject {
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
}

/**
 * Transform SubjectEvent[] to ClinicalDataSubject[] for ODM builder
 */
export function transformSubjectEventsToODM(
  subjectEvents: SubjectEvent[],
  siteOIDMap: Map<string, string>
): ClinicalDataSubject[] {
  // Group events by subject
  const subjectMap = new Map<string, SubjectEvent[]>();
  
  for (const event of subjectEvents) {
    const existing = subjectMap.get(event.subjectKey) || [];
    existing.push(event);
    subjectMap.set(event.subjectKey, existing);
  }

  // Transform each subject's events
  const subjects: ClinicalDataSubject[] = [];
  
  for (const [subjectKey, events] of subjectMap) {
    const siteOID = siteOIDMap.get(subjectKey) || 'SITE-UNKNOWN';
    
    subjects.push({
      subjectKey,
      siteOID,
      events: events.map(event => ({
        eventOID: event.studyEventOID,
        repeatKey: event.repeatKey,
        forms: event.formInstances.map(form => ({
          formOID: form.formOID,
          repeatKey: form.repeatKey,
          itemGroups: form.itemGroupInstances.map(group => ({
            itemGroupOID: group.itemGroupOID,
            items: group.items.map(item => ({
              itemOID: item.itemOID,
              value: item.value ?? ''
            }))
          }))
        }))
      }))
    });
  }

  return subjects;
}

/**
 * Create empty subject data for subjects with no events yet
 */
export function createEmptySubject(subjectKey: string, siteOID: string): ClinicalDataSubject {
  return {
    subjectKey,
    siteOID,
    events: []
  };
}
