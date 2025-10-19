import { loadConfig } from '../../src/config';
import fs from 'fs';

describe('config.ts', () => {
  describe('loadConfig()', () => {
    it('loads a valid configuration successfully', () => {
      const config = loadConfig('study.config.yaml');
      expect(config.study.name).toBe('Hypertension Simulation');
      expect(Array.isArray(config.visits)).toBe(true);
    });

    it('throws if configuration file is empty or invalid YAML', () => {
      const path = 'empty.yaml';
      fs.writeFileSync(path, '');
      expect(() => loadConfig(path)).toThrow(/invalid/i);
      fs.unlinkSync(path);
    });
  });

  describe('validation rules', () => {
    const base = (overrides: string) => `
study:
  id: "id"
  name: "test"
  speed_factor: 1
  interval_ms: 1
  batch_percentage: 10
structure:
  sites: 1
  subjects_per_site: 1
visits:
${overrides}
queries:
  enabled: true
  missing_data_probability: 0.1
  out_of_range_probability: 0.1
`;

    it('throws when simulate_delayed is true but max_delay_days missing', () => {
      const yaml = base(`  - name: Visit1
    day: 1
    forms: ["Vitals"]
    probability: 1
    simulate_delayed: true`);
      const file = 'invalid1.yaml';
      try {
        fs.writeFileSync(file, yaml);
        expect(() => loadConfig(file)).toThrow(/max_delay_days/);
      } finally {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }
    });

    it('throws when missing_field_probability is out of bounds', () => {
      const yaml = base(`  - name: Visit2
    day: 1
    forms: ["Vitals"]
    probability: 1
    missing_field_probability: 5`);
      const file = 'invalid2.yaml';
      try {
        fs.writeFileSync(file, yaml);
        expect(() => loadConfig(file)).toThrow(/missing_field_probability/);
      } finally {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }
    });

    it('accepts valid visit with no optional flags', () => {
      const yaml = base(`  - name: Visit3
    day: 1
    forms: ["Vitals"]
    probability: 1`);
      const file = 'valid.yaml';
      try {
        fs.writeFileSync(file, yaml);
        const cfg = loadConfig(file);
        expect(cfg.visits[0].simulate_delayed).toBeUndefined();
        expect(cfg.visits[0].missing_field_probability).toBeUndefined();
      } finally {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }
    });
  });
});
