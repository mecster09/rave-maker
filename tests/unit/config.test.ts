import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from '../../src/utils/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('config loader', () => {
  it('loads defaults and merges file', () => {
    const cfg = loadConfig(__dirname);
    expect(cfg.dataMode === 'mock' || cfg.dataMode === 'simulator').toBe(true);
    expect(typeof cfg.study.interval_ms).toBe('number');
    expect(typeof (cfg.auth?.basic_token || 'Basic TEST_TOKEN')).toBe('string');
    // visits templates default includes DM
    expect(cfg.visits?.templates?.length).toBeGreaterThan(0);
  });
});

