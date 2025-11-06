import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, vi } from 'vitest';
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

  it('renders service metadata XML from options', () => {
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      service: {
        version: 'Custom Version 9.9.9',
        build_version: 'Build Custom 123',
        two_hundred_status: '201',
        two_hundred_message: 'Partial OK',
        studies: [
          { oid: 'StudyOne(Prod)', environment: 'Prod' },
          { oid: 'StudyTwo(UAT)', environment: 'UAT' },
        ],
        cache_flush_response: '<Success Code="OK"/>',
        post_clinical_data_response: '<ODM><Ack/></ODM>',
      },
    });

    expect(sim.versionXml()).toContain('Custom Version 9.9.9');
    expect(sim.buildVersionXml()).toContain('Build Custom 123');
    const twoHundred = sim.twoHundredXml();
    expect(twoHundred).toContain('<Status>201</Status>');
    expect(twoHundred).toContain('<Message>Partial OK</Message>');
    const studiesXml = sim.studiesXml();
    expect(studiesXml).toContain('StudyOne(Prod)');
    expect(studiesXml).toContain('StudyTwo(UAT)');
    expect(sim.cacheFlushXml()).toBe('<Success Code="OK"/>');
    expect(sim.postClinicalDataResponse('<ODM/>')).toContain('<Ack/>');
  });

  it('falls back to derived study metadata when service section missing studies', () => {
    const sim = new RwsSimulator('StudyAlpha(QA)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      service: {
        version: 'V1',
        build_version: 'B1',
        studies: [],
        cache_flush_response: '',
        post_clinical_data_response: '',
      },
    });

    const studies = sim.studiesXml();
    expect(studies).toContain('StudyAlpha(QA)');
    expect(studies).toContain('Environment="QA"');
    expect(sim.cacheFlushXml()).toBe('<Success/>');
    expect(sim.postClinicalDataResponse('   ')).toContain('<Success/>');
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
    expect(md.includes('<StudyEventDef OID="VISIT-1"')).toBe(true);
    expect(md.includes('SampleSize="1"')).toBe(true);
    expect(md.includes('<FormRef FormOID="DM"')).toBe(true);
  });

  it('metadata aggregates visit and form usage across subjects', () => {
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 2,
      subjectsPerSite: 2,
      logging: false,
      visits: {
        templates: [
          { name: 'Baseline', dayOffset: 0, forms: [{ oid: 'BL', name: 'Baseline' }] },
        ],
      },
    });
    const md = sim.metadataXml();
    expect(md.includes('<StudyEventDef OID="VISIT-1"')).toBe(true);
    expect(md.includes('SampleSize="4"')).toBe(true);
    expect(md.includes('<FormDef OID="BL" Name="Baseline" UsageCount="4"/>')).toBe(true);
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

  it('pauses, resumes, and resets simulator state', () => {
    vi.useFakeTimers();
    try {
      const sim = new RwsSimulator('Mediflex(Prod)', {
        intervalMs: 1000,
        batchPercentage: 100,
        speedFactor: 1.0,
        sites: 1,
        subjectsPerSite: 1,
        logging: false,
        visits: { templates: [{ name: 'V1', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] }] },
      });
      expect(sim.statusXml()).toContain('running="true"');

      sim.pause();
      expect(sim.statusXml()).toContain('running="false"');

      sim.resume();
      expect(sim.statusXml()).toContain('running="true"');

      sim.tick();
      expect(sim.subjectsXml()).toContain('Progress="10"');

      sim.reset();
      expect(sim.statusXml()).toContain('running="true"');
      expect(sim.subjectsXml()).toContain('Progress="0"');
    } finally {
      vi.useRealTimers();
    }
  });

  it('skips delayed subjects until delay expires', () => {
    const nowValues = [1_000, 1_500, 10_000];
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowValues.shift() ?? 10_000);
    const randomValues = [0.0, 0.0, 0.6, 0.9, 0.0, 0.9];
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => randomValues.shift() ?? 0.5);

    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      progressIncrement: 100,
      visits: {
        templates: [{ name: 'V1', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] }],
        probabilities: { delayed: 0.5 },
        delayMs: { min: 1000, max: 1000 },
      },
    });

    sim.tick();
    const delayedSubjects = sim.subjectsXml();
    expect(delayedSubjects).toContain('VisitStatus="Delayed"');
    expect(delayedSubjects).toContain('DelayedUntil="');
    expect(sim.auditXml()).not.toContain('<AuditRecord ');

    sim.tick(); // still within delay window, so skip processing
    expect(sim.auditXml()).not.toContain('<AuditRecord ');

    sim.tick(); // delay expired, resumes normal processing
    expect(sim.subjectsXml()).not.toContain('VisitStatus="Delayed"');
    expect(sim.auditXml()).toContain('<AuditRecord ');

    nowSpy.mockRestore();
    randomSpy.mockRestore();
  });

  it('processes minimum batch sizes and supports audit paging', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 10,
      speedFactor: 1.0,
      sites: 2,
      subjectsPerSite: 1,
      logging: false,
      progressIncrement: 50,
      visits: { templates: [{ name: 'V1', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] }] },
      audit: { fieldOids: ['DM.SEX'], perPageDefault: 1 },
    });

    sim.tick();
    const subjectsAfterFirstTick = sim.subjectsXml();
    const progressedCount = (subjectsAfterFirstTick.match(/Progress="50"/g) || []).length;
    expect(progressedCount).toBe(1);

    sim.tick();
    sim.tick();
    sim.tick();

    const pagedAudit = sim.auditXml(2, 2);
    expect(pagedAudit).toContain('ID="2"');
    expect(pagedAudit).not.toContain('ID="1"');

    randomSpy.mockRestore();
  });

  it('applies audit XML query overrides for StudyOID, Mode, Unicode, and FormOID', () => {
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      visits: {
        templates: [{ name: 'Visit', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }, { oid: 'VS', name: 'Vitals' }] }],
      },
      audit: { fieldOids: ['DM.SEX', 'VS.HR'] },
    });

    sim.tick();
    sim.tick();

    const xml = sim.auditXml(5, 1, { studyOid: 'CustomStudy', unicode: 'Y', mode: 'Changes', formOid: 'VS' });
    expect(xml).toContain('ClinicalData StudyOID="CustomStudy"');
    expect(xml).toContain('<AuditRecords Mode="Changes" Unicode="Y" FormOID="VS">');
    expect(xml).toContain('FieldOID="VS.HR"');
    expect(xml).not.toContain('FieldOID="DM.SEX"');
  });

  it('applies enum, number, and string value rules', () => {
    const randomValues = [0.2, 0.0, 0.5, 0.0, 0.9, 0.8];
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => randomValues.shift() ?? 0.5);
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      progressIncrement: 100,
      visits: {
        templates: [{
          name: 'Composite',
          dayOffset: 0,
          forms: [
            { oid: 'F1', name: 'Form1' },
            { oid: 'F2', name: 'Form2' },
            { oid: 'F3', name: 'Form3' },
          ],
        }],
      },
      audit: { fieldOids: ['ENUM.FIELD', 'NUM.FIELD', 'STR.FIELD'] },
      valueRules: {
        'ENUM.FIELD': { type: 'enum', enum: ['A', 'B', 'C'] },
        'NUM.FIELD': { type: 'number', range: { min: 5, max: 6 } },
        'STR.FIELD': { type: 'string', pattern: 'CODE-{n}' },
      },
    });

    sim.tick();
    const auditXml = sim.auditXml();
    expect(auditXml).toContain('FieldOID="ENUM.FIELD" OldValue="A" NewValue="B"');
    expect(auditXml).toContain('FieldOID="NUM.FIELD" OldValue="5" NewValue="6"');
    expect(auditXml).toContain('FieldOID="STR.FIELD" OldValue="CODE-0" NewValue="CODE-1"');

    randomSpy.mockRestore();
  });

  it('marks subjects inactive when progress completes and logs generator output', () => {
    const randomValues = [0.5, 0.5, 0.0, 0.05];
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => randomValues.shift() ?? 0.5);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      logGenerator: true,
      progressIncrement: 100,
      visits: { templates: [{ name: 'Final', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] }] },
    });

    sim.tick();

    const subjects = sim.subjectsXml();
    expect(subjects).toContain('Status="Inactive"');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[GENERATOR]'));

    randomSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('falls back to default value generation when no rules are defined', () => {
    const randomValues = [0.6, 0.9, 0.0, 0.9];
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => randomValues.shift() ?? 0.5);
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      visits: { templates: [{ name: 'Unruled', dayOffset: 0, forms: [{ oid: 'UN', name: 'Unruled' }] }] },
      audit: { fieldOids: ['UNRULED.FIELD'] },
    });

    sim.tick();
    const audits = sim.auditXml();
    expect(audits).toContain('FieldOID="UNRULED.FIELD"');
    expect(audits).toContain('OldValue=""');
    expect(audits).toContain('NewValue="1"');

    randomSpy.mockRestore();
  });

  it('persists simulator state across instances and supports fresh seeding', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rws-sim-state-'));
    const statePath = path.join(tempDir, 'state.json');
    const baseOptions = {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      visits: { templates: [{ name: 'Persisted', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] }] },
      persistState: true,
      statePersistencePath: statePath,
    } as const;

    try {
      const first = new RwsSimulator('Mediflex(Prod)', { ...baseOptions });
      first.tick();
      const firstSubjects = first.subjectsXml();
      expect(firstSubjects).toContain('Progress="10"');

      const second = new RwsSimulator('Mediflex(Prod)', { ...baseOptions });
      const restored = second.subjectsXml();
      expect(restored).toContain('Progress="10"');

      const third = new RwsSimulator('Mediflex(Prod)', { ...baseOptions, freshSeedOnStart: true });
      const reset = third.subjectsXml();
      expect(reset).toContain('Progress="0"');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('handles persistence write failures gracefully', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rws-sim-write-'));
    const statePath = path.join(tempDir, 'state.json');
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('disk error');
    });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const sim = new RwsSimulator('Mediflex(Prod)', {
        intervalMs: 0,
        batchPercentage: 100,
        speedFactor: 1.0,
        sites: 1,
        subjectsPerSite: 1,
        logging: false,
        visits: { templates: [{ name: 'Persist', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] }] },
        persistState: true,
        statePersistencePath: statePath,
      });

      sim.tick();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to persist simulator state'));
    } finally {
      writeSpy.mockRestore();
      consoleSpy.mockRestore();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('handles persistence read failures gracefully', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rws-sim-read-'));
    const statePath = path.join(tempDir, 'state.json');
    fs.writeFileSync(statePath, '{}', 'utf8');
    const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('read error');
    });
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const sim = new RwsSimulator('Mediflex(Prod)', {
        intervalMs: 0,
        batchPercentage: 100,
        speedFactor: 1.0,
        sites: 1,
        subjectsPerSite: 1,
        logging: false,
        visits: { templates: [{ name: 'Persist', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] }] },
        persistState: true,
        statePersistencePath: statePath,
      });

      expect(sim.subjectsXml()).toContain('Progress="0"');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load simulator state'));
    } finally {
      readSpy.mockRestore();
      existsSpy.mockRestore();
      consoleSpy.mockRestore();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('ignores persisted state when versions mismatch', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rws-sim-invalid-'));
    const statePath = path.join(tempDir, 'state.json');
    const payload = {
      version: 99,
      subjects: [],
      visitPlans: {},
      visitSummaries: [],
      visitFormMap: {},
      formSummaries: [],
    };
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(payload), 'utf8');

    try {
      const sim = new RwsSimulator('Mediflex(Prod)', {
        intervalMs: 0,
        batchPercentage: 100,
        speedFactor: 1.0,
        sites: 1,
        subjectsPerSite: 1,
        logging: false,
        visits: { templates: [{ name: 'Bootstrap', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] }] },
        persistState: true,
        statePersistencePath: statePath,
      });

      const subjects = sim.subjectsXml();
      expect(subjects).toContain('Progress="0"');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

  it('adjusts numeric and string branches in nextValue', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      valueRules: {
        'NUM.FIELD': { type: 'number', range: { min: 5, max: 6 } },
        'STR.FIELD': { type: 'string', pattern: 'CODE-{n}' },
      },
    });

    const nextValue = (sim as unknown as { nextValue: (field: string, prev: string) => string }).nextValue.bind(sim);
    expect(nextValue('NUM.FIELD', '5')).toBe('6');
    expect(nextValue('NUM.FIELD', '6')).toBe('5');
    expect(nextValue('STR.FIELD', 'XYZ')).toBe('CODE-1');
    expect(nextValue('OTHER.FIELD', '1')).toBe('0');
    randomSpy.mockRestore();
  });


  it('defaults planned day to zero when offset is invalid', () => {
    const sim = new RwsSimulator('Mediflex(Prod)', {
      intervalMs: 0,
      batchPercentage: 100,
      speedFactor: 1.0,
      sites: 1,
      subjectsPerSite: 1,
      logging: false,
      visits: {
        templates: [
          { name: 'Invalid', dayOffset: Number.NaN, forms: [{ oid: 'DM', name: 'Demographics' }] },
        ],
      },
    });
    const xml = sim.metadataXml();
    expect(xml).toContain('PlannedDay="0"');
  });

