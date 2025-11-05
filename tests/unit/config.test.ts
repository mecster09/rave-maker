import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadConfig } from '../../src/utils/config';

function createTempRoot(content: unknown) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'rws-cfg-'));
  const srcDir = path.join(base, 'src');
  const configDir = path.join(base, 'config');
  fs.mkdirSync(srcDir);
  fs.mkdirSync(configDir);
  fs.writeFileSync(path.join(configDir, 'simulator.json'), JSON.stringify(content), 'utf8');
  return {
    root: srcDir,
    cleanup() {
      fs.rmSync(base, { recursive: true, force: true });
    },
  };
}

afterEach(() => {
  delete process.env.DATA_MODE;
  delete process.env.SIM_MODE;
});

describe('config loader', () => {
  it('falls back to defaults when config file is missing', () => {
    const cfg = loadConfig(process.cwd());
    expect(cfg.dataMode).toBe('mock');
    expect(cfg.study.interval_ms).toBeGreaterThanOrEqual(0);
    expect(cfg.structure.sites).toBeGreaterThan(0);
    expect(cfg.auth?.username).toBe('TEST_USER');
    expect(cfg.auth?.password).toBe('TEST_PASSWORD');
    expect(cfg.auth?.basic_token).toBe('Basic VEVTVF9VU0VSOlRFU1RfUEFTU1dPUkQ=');
    expect(cfg.persistence?.enabled).toBe(true);
    expect(cfg.persistence?.state_file).toBe('data/simulator-state.json');
    expect(cfg.persistence?.fresh_seed_on_start).toBe(false);
  });

  it('respects environment overrides and merges nested values', () => {
    const fixture = createTempRoot({
      dataMode: 'mock',
      study: { interval_ms: 5 },
      structure: { sites: 3 },
      logging: { simulator: true },
      auth: { username: 'alpha', password: 'beta' },
      persistence: { enabled: false, state_file: 'tmp/state.json', fresh_seed_on_start: true },
      visits: {
        templates: [
          { name: 'Screening', day_offset: 2, forms: [{ oid: 'SC', name: 'Screening' }] },
          { name: 'Baseline', day_offset: 6, forms: [{ oid: 'BL', name: 'Baseline' }] },
          { name: 'FollowUp', day_offset: 10, forms: [{ oid: 'FU', name: 'Follow Up' }] },
        ],
        probabilities: { missed: 0.4 },
        delay_ms: { max: 5000 },
        days_between: [5, 10],
      },
      audit: { per_page_default: 250 },
    });

    process.env.DATA_MODE = 'simulator';
    try {
      const cfg = loadConfig(fixture.root);
      expect(cfg.dataMode).toBe('simulator');
      expect(cfg.study.interval_ms).toBe(5);
      expect(cfg.study.batch_percentage).toBe(25);
      expect(cfg.structure.sites).toBe(3);
      expect(cfg.logging?.simulator).toBe(true);
      expect(cfg.logging?.generator).toBe(false);
      expect(cfg.auth?.basic_token).toBe('Basic YWxwaGE6YmV0YQ==');
      expect(cfg.persistence?.enabled).toBe(false);
      expect(cfg.persistence?.state_file).toBe('tmp/state.json');
      expect(cfg.persistence?.fresh_seed_on_start).toBe(true);
      expect(cfg.visits?.templates?.[0].day_offset).toBe(0);
      expect(cfg.visits?.templates?.[1].day_offset).toBe(5);
      expect(cfg.visits?.templates?.[2].day_offset).toBe(15);
      expect(cfg.audit?.per_page_default).toBe(250);
      expect(cfg.visits?.delay_ms?.min).toBe(0);
      expect(cfg.visits?.delay_ms?.max).toBe(5000);
      expect(cfg.visits?.probabilities?.missed).toBe(0.4);
      expect(cfg.visits?.probabilities?.partial).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  it('applies numeric days_between when normalizing visit offsets', () => {
    const fixture = createTempRoot({
      visits: {
        templates: [
          { name: 'Visit1', day_offset: 3, forms: [{ oid: 'V1', name: 'Visit1' }] },
          { name: 'Visit2', day_offset: 7, forms: [{ oid: 'V2', name: 'Visit2' }] },
          { name: 'Visit3', day_offset: 11, forms: [{ oid: 'V3', name: 'Visit3' }] },
        ],
        days_between: 14,
      },
    });

    try {
      const cfg = loadConfig(fixture.root);
      const offsets = cfg.visits?.templates?.map(t => t.day_offset);
      expect(offsets).toEqual([0, 14, 28]);
    } finally {
      fixture.cleanup();
    }
  });
});
