import { Study, Subject, Site, FormRecord, Visit } from './models';
import { Storage } from './storage/Storage';
import { v4 as uuid } from 'uuid';
import { randomFloat } from './utils/random';
import { faker } from '@faker-js/faker';
import { SeededRNG } from './utils/seededRandom';

export class Generator {
  private intervalId?: NodeJS.Timeout;
  private rng: SeededRNG;

  constructor(private storage: Storage, private study: Study, private visits: Visit[]) {
    const seed = study.config.study.seed ?? 12345;
    this.rng = new SeededRNG(seed);
    faker.seed(seed);
  }

  /** Seed initial sites and subjects */
  async seedOnce() {
    const cfg = this.study.config.structure;

    const sites: Site[] = [];
    for (let i = 0; i < cfg.sites; i++) {
      sites.push({
        id: uuid(),
        studyId: this.study.id,
        code: `SITE-${i + 1}`,
        name: `Site ${i + 1}`,
      });
    }
    await this.storage.createSites(sites);

    const subjects: Subject[] = [];
    for (const site of sites) {
      for (let i = 0; i < cfg.subjects_per_site; i++) {
        subjects.push({
          id: uuid(),
          studyId: this.study.id,
          siteId: site.id,
          subjectCode: `SUBJ-${site.code}-${i + 1}`,
        });
      }
    }
    await this.storage.createSubjects(subjects);
  }

  private makeFormData(formName: string, visit?: Visit): Record<string, any> {
    let data: Record<string, any>;

    if (formName.toLowerCase().includes('vital')) {
      data = {
        bp_systolic: randomFloat(90, 160, 1),
        bp_diastolic: randomFloat(50, 100, 1),
        heart_rate: randomFloat(50, 120, 1),
        temperature: randomFloat(36.0, 38.5, 0.1),
      };
    } else if (formName.toLowerCase().includes('demo')) {
      data = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        dob: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }).toISOString().slice(0, 10),
      };
    } else {
      data = { text: faker.lorem.sentence(), updatedAt: new Date().toISOString() };
    }

    if (visit?.partial_forms) {
      const prob = visit.missing_field_probability ?? 0.2;
      for (const key of Object.keys(data)) {
        if (this.rng.chance(prob)) data[key] = null;
      }
    }
    return data;
  }

  start(intervalMs = 10000, batchPct = 5, timeAccel = 1) {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.simulateVisits(batchPct, timeAccel), intervalMs);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = undefined;
  }

  /** One simulation tick, deterministic via SeededRNG */
  async simulateVisits(batchPct: number, timeAccel: number) {
    const subjects = await this.storage.getSubjects(this.study.id);
    const count = Math.max(1, Math.floor(subjects.length * batchPct / 100));

    for (let i = 0; i < count; i++) {
      const subj = this.rng.pick(subjects);

      for (const visit of this.visits) {
        const allowMissed = visit.simulate_missed !== false;
        if (allowMissed && !this.rng.chance(visit.probability)) continue;

        let visitDay = visit.day;
        const allowDelayed = visit.simulate_delayed === true && typeof visit.max_delay_days === 'number' && visit.max_delay_days > 0;
        if (allowDelayed) {
          const delay = this.rng.int(0, visit.max_delay_days!);
          visitDay += delay;
        }

        for (const formName of visit.forms) {
          const rec: FormRecord = {
            id: uuid(),
            studyId: this.study.id,
            subjectId: subj.id,
            siteId: subj.siteId,
            name: formName,
            data: this.makeFormData(formName, visit),
            lastUpdated: new Date(Date.now() * timeAccel + visitDay * 24 * 60 * 60 * 1000).toISOString(),
          };
          await this.storage.createForm(rec);
        }
      }
    }
  }
}
