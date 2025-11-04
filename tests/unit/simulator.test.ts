import { describe, it, expect } from 'vitest';
import { RwsSimulator } from '../../src/simulator/index';

describe('RwsSimulator', () => {
  it('produces subjects and audit XML', () => {
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 2,
      logging: false,
    });
    // Manual tick should create some audit events
    sim.tick();
    const subjects = sim.subjectsXml();
    const audits = sim.auditXml();
    expect(subjects.trim().startsWith('<')).toBe(true);
    expect(audits.trim().startsWith('<')).toBe(true);
  });

  it('produces metadata XML that reflects study OID', () => {
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      visits: {
        templates: [
          { name: 'Demographics', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] },
          { name: 'Vitals', dayOffset: 14, forms: [{ oid: 'VS', name: 'Vitals' }] },
        ],
      },
    });
    const md = sim.metadataXml('Study-XYZ');
    expect(md.includes('Study OID="Study-XYZ"')).toBe(true);
    expect(md.includes('<FormDef OID="DM"')).toBe(true);
    expect(md.includes('<FormDef OID="VS"')).toBe(true);
    expect(md.includes('<ItemDef OID="DM.SEX"')).toBe(true);
  });

  it('respects visit probabilities (missed)', () => {
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      visits: { templates: [{ name: 'V1', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] }], probabilities: { missed: 1 } },
    });
    sim.tick();
    const subjects = sim.subjectsXml();
    expect(subjects.includes('VisitStatus="Missed"')).toBe(true);
  });

  it('respects visit probabilities (delayed)', () => {
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      visits: { templates: [{ name: 'V1', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] }], probabilities: { missed: 0, delayed: 1 }, delayMs: { min: 1000, max: 2000 } },
    });
    sim.tick();
    const subjects = sim.subjectsXml();
    expect(subjects.includes('VisitStatus="Delayed"')).toBe(true);
    expect(subjects.includes('DelayedUntil="')).toBe(true);
  });

  it('respects visit probabilities (partial)', () => {
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      visits: { templates: [{ name: 'V1', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }, { oid: 'VS', name: 'Vitals' }] }], probabilities: { missed: 0, delayed: 0, partial: 1 } },
    });
    sim.tick();
    const subjects = sim.subjectsXml();
    expect(subjects.includes('VisitStatus="Partial"')).toBe(true);
  });

  it('adds SiteName attribute when configured', () => {
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 2,
      subjectsPerSite: 1,
      logging: false,
      siteNames: ['Alpha Site', 'Beta Site'],
      visits: { templates: [{ name: 'V1', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] }] },
    });
    const subjects = sim.subjectsXml();
    expect(subjects.includes('SiteName="Alpha Site"') || subjects.includes('SiteName="Beta Site"')).toBe(true);
  });

  it('uses value rules for audit field values', () => {
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      visits: { templates: [{ name: 'V1', dayOffset: 0, forms: [{ oid: 'VS', name: 'Vitals' }] }] },
      audit: { fieldOids: ['VS.HR'] },
      valueRules: { 'VS.HR': { type: 'number', range: { min: 55, max: 60 } } },
    });
    sim.tick();
    const audits = sim.auditXml();
    expect(audits.includes('FieldOID="VS.HR"')).toBe(true);
  });
});
