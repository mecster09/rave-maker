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

export interface FormConfig {
  name: string;
  update_probability?: number;
  fields?: any[];
}

export interface QueryConfig {
  enabled: boolean;
  missing_data_probability?: number;
  out_of_range_probability?: number;
}

export interface SimulatorConfig {
  study: {
    id: string;
    name: string;
    description?: string;
    seed?: number;
  };
  structure: {
    sites: number;
    subjects_per_site: number;
    forms: FormConfig[];
  };
  visits: VisitConfig[];
  simulation: {
    mode: "realtime" | "accelerated";
    time_acceleration: number;
    update_interval_sec: number;
    update_batch_pct: number;
    start_delay_sec?: number;
    end_behavior?: "loop" | "stop";
  };
  queries?: QueryConfig;
  output: {
    log_level: "info" | "debug" | "warn" | "error";
    persist_data: boolean;
    emit_events: boolean;
    event_target: string;
  };
}

export function loadConfig(path = "study.config.yaml"): SimulatorConfig {
  const raw = fs.readFileSync(path, "utf8");
  const loaded = yaml.load(raw);

  if (!loaded || typeof loaded !== "object") {
    throw new Error("Configuration file is empty or invalid");
  }

  const data = loaded as SimulatorConfig;

  if (!data.visits || !Array.isArray(data.visits)) {
    throw new Error("Configuration error: 'visits' must be defined as an array in the config file");
  }

  return data;
}
