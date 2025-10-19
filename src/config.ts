import fs from "fs";
import yaml from "js-yaml";

export interface VisitConfig {
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

export interface QueryConfig {
  enabled: boolean;
  missing_data_probability: number;
  out_of_range_probability: number;
}

export interface SimulatorConfig {
  study: {
    id: string;
    name: string;
    seed?: number;
    speed_factor: number;
    interval_ms: number;
    batch_percentage: number;
  };
  structure: {
    sites: number;
    subjects_per_site: number;
  };
  visits: VisitConfig[];
  queries: QueryConfig;
}

function assert(condition: any, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validate(cfg: SimulatorConfig): void {
  assert(cfg.study != null, "study section is required");
  assert(cfg.structure != null, "structure section is required");
  assert(Array.isArray(cfg.visits), "visits must be an array");

  const b = cfg.study.batch_percentage;
  assert(b >= 0 && b <= 100, "batch_percentage must be within 0..100");

  for (const v of cfg.visits) {
    assert(v.probability >= 0 && v.probability <= 1, `visit ${v.name} probability must be within 0..1`);
    if (v.simulate_delayed) {
      assert(typeof v.max_delay_days === "number" && v.max_delay_days >= 0, `visit ${v.name} max_delay_days required and >=0 when simulate_delayed=true`);
    }
    if (v.missing_field_probability != null) {
      assert(v.missing_field_probability >= 0 && v.missing_field_probability <= 1, `visit ${v.name} missing_field_probability must be within 0..1`);
    }
  }
}

export function loadConfig(path = "study.config.yaml") {
  const raw = fs.readFileSync(path, "utf8");
  const loaded = yaml.load(raw);
  if (!loaded || typeof loaded !== "object") throw new Error("Configuration file is empty or invalid");
  const data = loaded as SimulatorConfig;
  validate(data);
  return data;
}
