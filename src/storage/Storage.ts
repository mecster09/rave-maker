import { Study, Site, Subject, FormInstance, Query, SubjectEvent } from "../models";

export interface Storage {
  createStudy(study: Study): Promise<void>;
  createSites(sites: Site[]): Promise<void>;
  createSubjects(subjects: Subject[]): Promise<void>;
  createForm(form: FormInstance): Promise<void>;
  createQuery(query: Query): Promise<void>;
  getAllStudies(): Promise<Study[]>;
  getStudy(studyOID: string): Promise<Study | undefined>;
  getSubjects(studyId: string): Promise<Subject[]>;
  getForms(studyId: string, subjectId?: string): Promise<FormInstance[]>;
  getQueries(studyId: string): Promise<Query[]>;
  getClinicalData(studyOID: string, formOid?: string): Promise<SubjectEvent[]>;
  getSubjectClinicalData(studyOID: string, subjectKey: string, formOid?: string): Promise<SubjectEvent[]>;
}
