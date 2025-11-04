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
    basic_token?: string; // expected Authorization header value
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
}

const defaultConfig: SimulatorConfig = {
  dataMode: 'mock',
  study: { oid: 'Mediflex(Prod)', interval_ms: 0, batch_percentage: 25, speed_factor: 1.0 },
  auth: { basic_token: 'Basic TEST_TOKEN' },
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
};

export function loadConfig(rootDir: string): SimulatorConfig {
  // Allow environment override
  const envMode = (process.env.DATA_MODE || process.env.SIM_MODE) as DataMode | undefined;
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
    visits: {
      ...defaultConfig.visits,
      ...(fileConfig.visits || {}),
      probabilities: { ...(defaultConfig.visits?.probabilities || {}), ...((fileConfig.visits && fileConfig.visits.probabilities) || {}) },
      delay_ms: { ...(defaultConfig.visits?.delay_ms || {}), ...((fileConfig.visits && fileConfig.visits.delay_ms) || {}) },
    },
    audit: { ...defaultConfig.audit, ...(fileConfig.audit || {}) },
    values: { ...defaultConfig.values, ...(fileConfig.values || {}) },
  };
  if (envMode === 'mock' || envMode === 'simulator') {
    merged.dataMode = envMode;
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
