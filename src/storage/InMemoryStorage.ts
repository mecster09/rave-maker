import { Storage } from "./Storage";
import { Study, Site, Subject, FormRecord, Query } from "../models";

export class InMemoryStorage implements Storage {
  private studies: Study[] = [];
  private sites: Site[] = [];
  private subjects: Subject[] = [];
  private forms: FormRecord[] = [];
  private queries: Query[] = [];

  async createStudy(study: Study) { this.studies.push(study); }
  async createSites(sites: Site[]) { this.sites.push(...sites); }
  async createSubjects(subjects: Subject[]) { this.subjects.push(...subjects); }
  async createForm(form: FormRecord) { this.forms.push(form); }
  async createQuery(query: Query) { this.queries.push(query); }

  async getSubjects(studyId: string) {
    return this.subjects.filter(s => s.studyId === studyId);
  }

  async getForms(studyId: string, subjectId?: string) {
    return this.forms.filter(f => f.studyId === studyId && (!subjectId || f.subjectId === subjectId));
  }

  async getQueries(studyId: string) {
    return this.queries.filter(q => q.studyId === studyId);
  }
}
