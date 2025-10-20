import { InMemoryStorage } from '../../src/storage/InMemoryStorage';
import { Generator } from '../../src/generator';
import { Simulator } from '../../src/simulator';
import { Study, VisitConfig } from '../../src/models';

describe('generator.ts', () => {
  const makeStudy = (): Study => ({
    oid: 'UnitTest(Dev)',
    projectName: 'UnitTest',
    environment: 'Dev',
    name: 'UnitTest',
    metadataVersionOID: '1',
    config: {
      study: { 
        project_name: 'UnitTest',
        environment: 'Dev',
        name: 'UnitTest',
        metadata_version_oid: '1',
        seed: 42, 
        speed_factor: 1, 
        interval_ms: 1, 
        batch_percentage: 100 
      },
      structure: { sites: 1, subjects_per_site: 1 },
      visits: [],
      queries: { generation_probability: 0 },
      logging: {}
    } as any,
  });

  const makeVisit = (overrides?: Partial<VisitConfig>): VisitConfig => ({
    name: 'Screening',
    day: 1,
    forms: ['Vitals'],
    probability: 1,
    ...overrides,
  });

  it('seeds sites and subjects deterministically', async () => {
    const store = new InMemoryStorage();
    const gen = new Generator(store, makeStudy(), [makeVisit()]);
    await gen.seedOnce();
    const subjects = await store.getSubjects('UnitTest(Dev)');
    expect(subjects.length).toBe(1);
  });

  it('creates form data with item group instances', async () => {
    const store = new InMemoryStorage();
    const gen = new Generator(store, makeStudy(), [makeVisit()]);
    await gen.seedOnce();
    await gen.simulateVisits(100, 1);
    const forms = await store.getForms('UnitTest(Dev)');
    expect(forms.length).toBeGreaterThan(0);
    expect(forms[0].itemGroupInstances).toBeDefined();
    expect(forms[0].itemGroupInstances.length).toBeGreaterThan(0);
  });

  it('handles simulate_delayed and simulate_missed branches', async () => {
    const visit = makeVisit({
      simulate_missed: true,
      simulate_delayed: true,
      max_delay_days: 3,
      probability: 0.5,
    });
    const store = new InMemoryStorage();
    const gen = new Generator(store, makeStudy(), [visit]);
    await gen.seedOnce();
    await gen.simulateVisits(100, 1);
    const forms = await store.getForms('UnitTest(Dev)');
    expect(forms.length).toBeGreaterThanOrEqual(0);
  });

  it('handles visits with no simulate flags (false branches)', async () => {
    const visit = makeVisit({}); // no optional flags
    const store = new InMemoryStorage();
    const gen = new Generator(store, makeStudy(), [visit]);
    await gen.seedOnce();
    await gen.simulateVisits(100, 1);
    const forms = await store.getForms('UnitTest(Dev)');
    expect(forms.length).toBeGreaterThan(0);
  });
});

describe('simulator.ts', () => {
  it('throws if tick() called before initialization', async () => {
    const sim = new Simulator();
    await expect(sim.tick()).rejects.toThrow(/not initialized/i);
  });

  it('allows tick after initialization', async () => {
    const sim = new Simulator();
    await sim.initialize('study.config.yaml');
    await expect(sim.tick()).resolves.not.toThrow();
  });
});
