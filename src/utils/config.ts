import fs from 'fs';
import path from 'path';

export type DataMode = 'mock' | 'simulator';

export interface SimulatorConfig {
  dataMode: DataMode;
  study: {
    oid?: string;
    interval_ms: number; // 0 disables auto-ticking
    batch_percentage: number; // 0-100
    speed_factor: number; // time multiplier for timestamps
  };
  auth?: {
    username?: string; // raw username used for Basic auth
    password?: string; // raw password used for Basic auth
    basic_token?: string; // derived Authorization header value
  };
  persistence?: {
    enabled?: boolean;
    state_file?: string;
    fresh_seed_on_start?: boolean;
  };
  structure: {
    sites: number;
    subjects_per_site: number;
    progress_increment?: number; // percent per tick
    site_names?: string[]; // optional friendly site names
  };
  logging?: {
    simulator?: boolean;
    generator?: boolean;
  };
  visits?: {
    count?: number;
    templates?: Array<{
      name: string;
      day_offset: number;
      forms: Array<{ oid: string; name: string }>;
    }>;
    probabilities?: { delayed?: number; missed?: number; partial?: number };
    delay_ms?: { min?: number; max?: number };
    days_between?: number | number[]; // optional convenience gaps between visits
  };
  audit?: {
    user?: string;
    field_oids?: string[];
    per_page_default?: number;
  };
  values?: {
    rules?: Record<string, {
      type?: 'enum' | 'number' | 'string';
      enum?: string[];
      range?: { min: number; max: number };
      pattern?: string;
    }>;
  };
  service?: {
    version?: string;
    build_version?: string;
    two_hundred_status?: string;
    two_hundred_message?: string;
    studies?: Array<{ oid: string; environment?: string }>;
    cache_flush_response?: string;
    post_clinical_data_response?: string;
  };
}

const defaultConfig: SimulatorConfig = {
  dataMode: 'mock',
  study: { oid: 'Mediflex(Prod)', interval_ms: 0, batch_percentage: 25, speed_factor: 1.0 },
  auth: { username: 'TEST_USER', password: 'TEST_PASSWORD' },
  persistence: { enabled: true, state_file: 'data/simulator-state.json', fresh_seed_on_start: false },
  structure: { sites: 1, subjects_per_site: 5, progress_increment: 10 },
  logging: { simulator: false, generator: false },
  visits: {
    count: 0,
    templates: [
      { name: 'Demographics', day_offset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] },
    ],
    probabilities: { delayed: 0.0, missed: 0.0, partial: 0.0 },
    delay_ms: { min: 0, max: 0 },
    days_between: 0,
  },
  audit: { user: 'raveuser', field_oids: ['DM.SEX'], per_page_default: 500 },
  values: { rules: { 'DM.SEX': { type: 'enum', enum: ['M','F'] } } },
  service: {
    version: 'Rave Web Services Version 1.0.0',
    build_version: 'Build 2025.11.01',
    two_hundred_status: '200',
    two_hundred_message: 'TwoHundred OK',
    studies: [
      { oid: 'Mediflex(Prod)', environment: 'Prod' },
      { oid: 'Mediflex_UAT', environment: 'UAT' },
    ],
    cache_flush_response: '<Success/>',
    post_clinical_data_response: '<ODM><Success/></ODM>',
  },
};

function deriveBasicToken(username?: string, password?: string): string | undefined {
  if (typeof username !== 'string' || typeof password !== 'string') return undefined;
  const credentials = `${username}:${password}`;
  // Basic auth requires base64 of username:password using UTF-8
  return `Basic ${Buffer.from(credentials, 'utf8').toString('base64')}`;
}

export function loadConfig(rootDir: string): SimulatorConfig {
  // Allow environment override
  const envMode = (process.env.DATA_MODE || process.env.SIM_MODE) as DataMode | undefined;
  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  const configPath = path.resolve(rootDir, '..', 'config', 'simulator.json');
  let fileConfig: Partial<SimulatorConfig> = {};
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    fileConfig = JSON.parse(content);
  } catch {
    // Use defaults if no file
  }
  const merged: SimulatorConfig = {
    ...defaultConfig,
    ...fileConfig,
    study: { ...defaultConfig.study, ...(fileConfig.study || {}) },
    structure: { ...defaultConfig.structure, ...(fileConfig.structure || {}) },
    logging: { ...defaultConfig.logging, ...(fileConfig.logging || {}) },
    auth: { ...defaultConfig.auth, ...(fileConfig.auth || {}) },
    persistence: { ...defaultConfig.persistence, ...(fileConfig.persistence || {}) },
    visits: {
      ...defaultConfig.visits,
      ...(fileConfig.visits || {}),
      probabilities: { ...(defaultConfig.visits?.probabilities || {}), ...((fileConfig.visits && fileConfig.visits.probabilities) || {}) },
      delay_ms: { ...(defaultConfig.visits?.delay_ms || {}), ...((fileConfig.visits && fileConfig.visits.delay_ms) || {}) },
    },
    audit: { ...defaultConfig.audit, ...(fileConfig.audit || {}) },
    values: { ...defaultConfig.values, ...(fileConfig.values || {}) },
    service: { ...defaultConfig.service, ...(fileConfig.service || {}) },
  };
  if (!merged.auth) merged.auth = {};
  const derived = deriveBasicToken(merged.auth.username, merged.auth.password);
  if (derived) merged.auth.basic_token = derived;
  if (envMode === 'mock' || envMode === 'simulator') {
    merged.dataMode = envMode;
  } else if (isTestEnv) {
    merged.dataMode = 'mock';
  }
  if (!merged.service) merged.service = {};
  const defaultStudies = defaultConfig.service?.studies ?? [];
  const fileStudies = fileConfig.service?.studies;
  const studiesSource = (fileStudies && fileStudies.length > 0) ? fileStudies : defaultStudies;
  merged.service.studies = studiesSource.map(study => ({ ...study }));
  if (!merged.service.version) merged.service.version = defaultConfig.service?.version;
  if (!merged.service.build_version) merged.service.build_version = defaultConfig.service?.build_version;
  if (!merged.service.two_hundred_status) merged.service.two_hundred_status = defaultConfig.service?.two_hundred_status;
  if (!merged.service.two_hundred_message) merged.service.two_hundred_message = defaultConfig.service?.two_hundred_message;
  if (!merged.service.cache_flush_response) merged.service.cache_flush_response = defaultConfig.service?.cache_flush_response;
  if (!merged.service.post_clinical_data_response) merged.service.post_clinical_data_response = defaultConfig.service?.post_clinical_data_response;
  if (!merged.service.studies || merged.service.studies.length === 0) {
    const baseOid = merged.study.oid || 'Mediflex(Prod)';
    const match = /\(([^)]+)\)\s*$/.exec(baseOid);
    const environment = match ? match[1] : 'Prod';
    merged.service.studies = [{ oid: baseOid, environment }];
  }
  // Normalize visits.days_between into templates.day_offset if provided
  try {
    const templates = merged.visits?.templates;
    const gaps = merged.visits?.days_between;
    if (templates && templates.length > 0 && gaps !== undefined) {
      let offsets: number[] = [];
      if (Array.isArray(gaps)) {
        offsets = [0];
        for (const g of gaps) offsets.push((offsets[offsets.length - 1] || 0) + (Number(g) || 0));
      } else {
        const gap = Number(gaps) || 0;
        offsets = templates.map((_, i) => i * gap);
      }
      for (let i = 0; i < templates.length; i++) {
        templates[i].day_offset = offsets[i] ?? templates[i].day_offset ?? 0;
      }
    }
  } catch {
    // ignore normalization errors
  }
  return merged;
}
