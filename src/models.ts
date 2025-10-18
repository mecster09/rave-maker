export interface Study {
  id: string;
  name: string;
  description?: string;
  config: any;
  status?: "running" | "stopped";
}

export interface Site {
  id: string;
  studyId: string;
  code: string;
  name: string;
}

export interface Subject {
  id: string;
  studyId: string;
  siteId: string;
  subjectCode: string;
}

export interface FormRecord {
  id: string;
  studyId: string;
  subjectId: string;
  siteId: string;
  name: string;
  data: Record<string, any>;
  lastUpdated: string;
}

export interface Visit {
  id: string;
  studyId: string;
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

export interface Query {
  id: string;
  studyId: string;
  formId: string;
  field: string;
  type: "MissingData" | "OutOfRange" | "Inconsistency";
  status: "Open" | "Answered" | "Closed";
  text: string;
  createdAt: string;
}
