import { Study, Site, Subject, FormRecord, Query } from "../models";

export interface Storage {
  createStudy(study: Study): Promise<void>;
  createSites(sites: Site[]): Promise<void>;
  createSubjects(subjects: Subject[]): Promise<void>;
  createForm(form: FormRecord): Promise<void>;
  createQuery(query: Query): Promise<void>;
  getSubjects(studyId: string): Promise<Subject[]>;
  getForms(studyId: string, subjectId?: string): Promise<FormRecord[]>;
  getQueries(studyId: string): Promise<Query[]>;
}
