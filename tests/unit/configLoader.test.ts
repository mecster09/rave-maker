import { loadConfig } from '../../src/config';
import fs from 'fs';

describe('Config Loader (unit)', () => {
  it('loads a valid config without throwing', () => {
    const cfg = loadConfig('study.config.yaml');
    expect(cfg.study.name).toBeDefined();
    expect(Array.isArray(cfg.visits)).toBe(true);
  });

  it('throws on invalid YAML structure', () => {
    const badPath = 'bad.config.yaml';
    fs.writeFileSync(badPath, 'study: {}\nstructure: {}\nvisits: [{ simulate_delayed: true }]\nqueries: { enabled: true, missing_data_probability: 0.1, out_of_range_probability: 0.1 }');
    expect(() => loadConfig(badPath)).toThrow();
    fs.unlinkSync(badPath);
  });
});
