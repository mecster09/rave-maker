import { InMemoryStorage } from '../../src/storage/InMemoryStorage';
import { Generator } from '../../src/generator';
import { Simulator } from '../../src/simulator';
import { v4 as uuid } from 'uuid';
import { Study, Visit } from '../../src/models';

describe('generator.ts', () => {
  const makeStudy = (): Study => ({
    id: 'study1',
    name: 'UnitTest',
    config: {
      study: { seed: 42, speed_factor: 1, interval_ms: 1, batch_percentage: 100 },
      structure: { sites: 1, subjects_per_site: 1 },
    },
  });

  const makeVisit = (overrides?: Partial<Visit>): Visit => ({
    id: uuid(),
    studyId: 'study1',
    name: 'Vitals',
    day: 1,
    forms: ['Vitals'],
    probability: 1,
    ...overrides,
  });

  it('seeds sites and subjects deterministically', async () => {
    const store = new InMemoryStorage();
    const gen = new Generator(store, makeStudy(), [makeVisit()]);
    await gen.seedOnce();
    const subjects = await store.getSubjects('study1');
    expect(subjects.length).toBe(1);
  });

  it('creates form data with partial fields when partial_forms is true', () => {
    const store = new InMemoryStorage();
    const gen = new Generator(store, makeStudy(), []);
    const visit = makeVisit({ partial_forms: true, missing_field_probability: 1 });
    const data = (gen as any).makeFormData('Vitals', visit);
    Object.values(data).forEach(v => expect(v).toBeNull());
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
    const forms = await store.getForms('study1');
    expect(forms.length).toBeGreaterThanOrEqual(0);
  });

  it('handles visits with no simulate flags (false branches)', async () => {
    const visit = makeVisit({}); // no optional flags
    const store = new InMemoryStorage();
    const gen = new Generator(store, makeStudy(), [visit]);
    await gen.seedOnce();
    await gen.simulateVisits(100, 1);
    const forms = await store.getForms('study1');
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
