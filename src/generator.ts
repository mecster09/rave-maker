import { Study, Subject, Site, FormRecord, Visit, Query } from './models';
import { Storage } from './storage/Storage';
import { v4 as uuid } from 'uuid';
import { randomFloat } from './utils/random';
import { faker } from '@faker-js/faker';

export class Generator {
  private intervalId?: NodeJS.Timeout;

  constructor(private storage: Storage, private study: Study, private visits: Visit[]) {}

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

    console.log(
      `[Generator] Seeded ${sites.length} sites and ${subjects.length} subjects for study '${this.study.name}'`
    );
  }

  /** Generate realistic form data with optional partial forms */
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

    // Apply partial forms
    if (visit?.partial_forms) {
      const prob = visit.missing_field_probability ?? 0.2;
      for (const key of Object.keys(data)) {
        if (Math.random() < prob) {
          data[key] = null;
        }
      }
    }

    return data;
  }

  /** Start simulation */
  start(intervalMs = 10000, batchPct = 5, timeAccel = 1) {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.simulateVisits(batchPct, timeAccel), intervalMs);
  }

  /** Simulate visits */
  private async simulateVisits(batchPct: number, timeAccel: number) {
    const subjects = await this.storage.getSubjects(this.study.id);
    const sampleCount = Math.max(1, Math.floor(subjects.length * batchPct / 100));

    for (let i = 0; i < sampleCount; i++) {
      const subj = subjects[Math.floor(Math.random() * subjects.length)];

      for (const visit of this.visits) {
        // Missed visit
        const allowMissed = visit.simulate_missed !== false;
        if (allowMissed && Math.random() > visit.probability) continue;

        // Delayed visit (safe for optional max_delay_days)
        let visitDay = visit.day;
        const allowDelayed =
          visit.simulate_delayed === true &&
          typeof visit.max_delay_days === 'number' &&
          visit.max_delay_days > 0;

        if (allowDelayed) {
          const maxDelay = visit.max_delay_days!; // TypeScript-safe
          const delay = Math.floor(Math.random() * (maxDelay + 1));
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

          await this.simulateQuery(rec);
        }
      }
    }
  }

  /** Simulate queries */
  private async simulateQuery(form: FormRecord) {
    const cfg = this.study.config.queries;
    if (!cfg?.enabled) return;

    if (Math.random() < (cfg.missing_data_probability ?? 0)) {
      await this.storage.createQuery({
        id: uuid(),
        studyId: form.studyId,
        formId: form.id,
        field: Object.keys(form.data)[0],
        type: 'MissingData',
        status: 'Open',
        text: 'Simulated missing data',
        createdAt: new Date().toISOString(),
      });
    }

    if (Math.random() < (cfg.out_of_range_probability ?? 0)) {
      const field = Object.keys(form.data)[0];
      await this.storage.createQuery({
        id: uuid(),
        studyId: form.studyId,
        formId: form.id,
        field,
        type: 'OutOfRange',
        status: 'Open',
        text: `Out-of-range simulated value for ${field}`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = undefined;
  }
}
