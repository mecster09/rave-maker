import { Study, Subject, Site, VisitConfig, SubjectEvent, FormInstance, ItemGroupInstance, ItemInstance } from './models';
import { Storage } from './storage/Storage';
import { randomFloat } from './utils/random';
import { faker } from '@faker-js/faker';
import { SeededRNG } from './utils/seededRandom';
import { createDefaultMetadata } from './odm/odmModels';

export class Generator {
  private rng: SeededRNG;
  private metadata: any;

  constructor(private storage: Storage, private study: Study, private visits: VisitConfig[], private loggingEnabled = false) {
    const seed = study.config.study.seed ?? 12345;
    this.rng = new SeededRNG(seed);
    faker.seed(seed);
    this.metadata = createDefaultMetadata(study.oid, study.name);
    if (this.loggingEnabled) {
      console.log(`[GENERATOR] Initialized with seed: ${seed}`);
    }
  }

  /** Seed initial sites and subjects */
  async seedOnce() {
    const cfg = this.study.config.structure;

    const sites: Site[] = [];
    for (let i = 0; i < cfg.sites; i++) {
      const siteCode = `SITE-${i + 1}`;
      sites.push({
        oid: siteCode,
        studyOID: this.study.oid,
        code: siteCode,
        name: `Site ${i + 1}`,
      });
    }
    await this.storage.createSites(sites);
    if (this.loggingEnabled) {
      console.log(`[GENERATOR] Created ${sites.length} sites`);
    }

    const subjects: Subject[] = [];
    for (const site of sites) {
      for (let i = 0; i < cfg.subjects_per_site; i++) {
        const subjectKey = `SUBJ-${site.code}-${String(i + 1).padStart(3, '0')}`;
        subjects.push({
          subjectKey,
          studyOID: this.study.oid,
          siteOID: site.oid,
        });
      }
    }
    await this.storage.createSubjects(subjects);
    if (this.loggingEnabled) {
      console.log(`[GENERATOR] Created ${subjects.length} subjects`);
    }
  }

  private makeItemGroupInstances(formOID: string, visit?: VisitConfig): ItemGroupInstance[] {
    const items: ItemInstance[] = [];
    
    if (formOID === 'VITALS') {
      items.push(
        { itemOID: 'VITALS.BP_SYSTOLIC', value: Math.round(randomFloat(90, 160, 1)) },
        { itemOID: 'VITALS.BP_DIASTOLIC', value: Math.round(randomFloat(50, 100, 1)) },
        { itemOID: 'VITALS.HEART_RATE', value: Math.round(randomFloat(50, 120, 1)) },
        { itemOID: 'VITALS.TEMPERATURE', value: randomFloat(36.0, 38.5, 0.1) }
      );
      return [{ itemGroupOID: 'VITALS_LOG_LINE', items }];
    } else if (formOID === 'DEMOGRAPHICS') {
      items.push(
        { itemOID: 'DEMO.FIRSTNAME', value: faker.person.firstName() },
        { itemOID: 'DEMO.LASTNAME', value: faker.person.lastName() },
        { itemOID: 'DEMO.DOB', value: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }).toISOString().slice(0, 10) }
      );
      return [{ itemGroupOID: 'DEMO_LOG_LINE', items }];
    } else if (formOID === 'LABS') {
      items.push(
        { itemOID: 'LABS.HEMOGLOBIN', value: randomFloat(12, 18, 0.1) },
        { itemOID: 'LABS.WBC', value: randomFloat(4, 11, 0.1) }
      );
      return [{ itemGroupOID: 'LABS_LOG_LINE', items }];
    } else {
      // Default/unknown form
      items.push({ itemOID: 'UNKNOWN.TEXT', value: faker.lorem.sentence() });
      return [{ itemGroupOID: 'UNKNOWN_LOG_LINE', items }];
    }
  }

  /** One simulation tick, deterministic via SeededRNG */
  async simulateVisits(batchPct: number, timeAccel: number) {
    const subjects = await this.storage.getSubjects(this.study.oid);
    const count = Math.max(1, Math.floor(subjects.length * batchPct / 100));

    if (this.loggingEnabled) {
      console.log(`[GENERATOR] Processing ${count} subjects (${batchPct}% of ${subjects.length} total)`);
    }

    let formsCreated = 0;
    let visitsMissed = 0;
    let visitsDelayed = 0;

    for (let i = 0; i < count; i++) {
      const subj = this.rng.pick(subjects);

      // Map visit config names to StudyEvent OIDs
      // For now, use simplified mapping - in production, this would use metadata
      const visitEventMap: Record<string, string> = {
        'Screening': 'SCREENING',
        'Baseline': 'BASELINE',
        'Visit 1': 'VISIT_1',
        'Visit 2': 'VISIT_2',
        'End of Study': 'END_OF_STUDY'
      };

      for (const visit of this.visits) {
        const allowMissed = visit.simulate_missed !== false;
        if (allowMissed && !this.rng.chance(visit.probability)) {
          visitsMissed++;
          continue;
        }

        let visitDay = visit.day;
        const allowDelayed = visit.simulate_delayed === true && typeof visit.max_delay_days === 'number' && visit.max_delay_days > 0;
        if (allowDelayed) {
          const delay = this.rng.int(0, visit.max_delay_days!);
          if (delay > 0) visitsDelayed++;
          visitDay += delay;
        }

        const studyEventOID = visitEventMap[visit.name] || 'UNSCHEDULED';
        const eventDate = new Date(Date.now() * timeAccel + visitDay * 24 * 60 * 60 * 1000).toISOString();
        const formInstances: FormInstance[] = [];

        // Map form names to FormOIDs
        const formOIDMap: Record<string, string> = {
          'Vitals': 'VITALS',
          'Demographics': 'DEMOGRAPHICS',
          'Labs': 'LABS',
          'Adverse Events': 'AE'
        };

        for (const formName of visit.forms) {
          const formOID = formOIDMap[formName] || formName.toUpperCase().replace(/\s+/g, '_');
          const itemGroupInstances = this.makeItemGroupInstances(formOID, visit);
          
          const formInstance: FormInstance = {
            formOID,
            repeatKey: 1,
            subjectKey: subj.subjectKey,
            studyEventOID,
            studyEventRepeatKey: 1,
            itemGroupInstances,
            lastUpdated: eventDate
          };
          
          formInstances.push(formInstance);
          await this.storage.createForm(formInstance);
          formsCreated++;
        }
      }
    }

    if (this.loggingEnabled) {
      console.log(`[GENERATOR] Created ${formsCreated} forms, ${visitsMissed} visits missed, ${visitsDelayed} visits delayed`);
    }
  }
}
