import { Storage } from "./Storage";
import { Study, Site, Subject, FormInstance, Query, SubjectEvent } from "../models";

export class InMemoryStorage implements Storage {
  private studies: Study[] = [];
  private sites: Site[] = [];
  private subjects: Subject[] = [];
  private forms: FormInstance[] = [];
  private queries: Query[] = [];
  private subjectEvents: SubjectEvent[] = [];

  async createStudy(study: Study) { this.studies.push(study); }
  async createSites(sites: Site[]) { this.sites.push(...sites); }
  async createSubjects(subjects: Subject[]) { this.subjects.push(...subjects); }
  async createForm(form: FormInstance) { this.forms.push(form); }
  async createQuery(query: Query) { this.queries.push(query); }

  async getAllStudies() { return [...this.studies]; }
  
  async getStudy(studyOID: string) {
    return this.studies.find(s => s.oid === studyOID);
  }

  async getSubjects(studyId: string) { return this.subjects.filter(s => s.studyOID === studyId); }
  
  async getForms(studyId: string, subjectId?: string) {
    return this.forms.filter(f => 
      f.subjectKey && (!subjectId || f.subjectKey === subjectId)
    );
  }
  
  async getQueries(studyId: string) { return this.queries.filter(q => q.studyOID === studyId); }

  async getClinicalData(studyOID: string, formOid?: string): Promise<SubjectEvent[]> {
    // Get all subject events for this study
    // Note: We need to filter by study through subjects
    const studySubjects = this.subjects.filter(s => s.studyOID === studyOID);
    const subjectKeys = studySubjects.map(s => s.subjectKey);
    
    let events = this.subjectEvents.filter(e => subjectKeys.includes(e.subjectKey));
    
    // Filter by form OID if specified
    if (formOid) {
      events = events.map(e => ({
        ...e,
        formInstances: e.formInstances.filter(f => f.formOID === formOid)
      })).filter(e => e.formInstances.length > 0);
    }
    
    return events;
  }

  async getSubjectClinicalData(studyOID: string, subjectKey: string, formOid?: string): Promise<SubjectEvent[]> {
    // Verify subject belongs to study
    const subject = this.subjects.find(s => s.studyOID === studyOID && s.subjectKey === subjectKey);
    if (!subject) {
      return [];
    }
    
    // Get events for this subject
    let events = this.subjectEvents.filter(e => e.subjectKey === subjectKey);
    
    // Filter by form OID if specified
    if (formOid) {
      events = events.map(e => ({
        ...e,
        formInstances: e.formInstances.filter(f => f.formOID === formOid)
      })).filter(e => e.formInstances.length > 0);
    }
    
    return events;
  }
}
