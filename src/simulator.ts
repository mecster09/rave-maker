import { loadConfig, SimulatorConfig } from './config';
import { InMemoryStorage } from './storage/InMemoryStorage';
import { Generator } from './generator';
import { Study, VisitConfig } from './models';
import { buildStudyOID } from './odm/odmModels';

export class Simulator {
  private storage = new InMemoryStorage();
  private generator?: Generator;
  private visits: VisitConfig[] = [];
  private study!: Study;
  private loggingEnabled = false;

  async initialize(configPath: string) {
    const config: SimulatorConfig = loadConfig(configPath);

    this.loggingEnabled = config.logging?.simulator ?? false;

    const studyOID = buildStudyOID(config.study.project_name, config.study.environment);
    
    this.study = {
      oid: studyOID,
      projectName: config.study.project_name,
      environment: config.study.environment,
      name: config.study.name,
      description: config.study.description,
      metadataVersionOID: config.study.metadata_version_oid || '1',
      config,
      status: 'running'
    };

    if (this.loggingEnabled) {
      console.log(`[SIMULATOR] Initializing study: ${this.study.name} (OID: ${this.study.oid})`);
      console.log(`[SIMULATOR] Configuration: ${config.visits.length} visits, ${config.structure.sites} sites, ${config.structure.subjects_per_site} subjects/site`);
    }

    this.visits = config.visits;
    await this.storage.createStudy(this.study);
    this.generator = new Generator(this.storage, this.study, this.visits, this.loggingEnabled);

    await this.generator.seedOnce();
    
    if (this.loggingEnabled) {
      const subjects = await this.storage.getSubjects(this.study.oid);
      console.log(`[SIMULATOR] Seeded ${subjects.length} subjects across ${config.structure.sites} sites`);
    }
  }

  async tick() {
    if (!this.generator) throw new Error("Simulator not initialized");
    const cfg = this.study.config.study;
    
    if (this.loggingEnabled) {
      const beforeCount = (await this.storage.getForms(this.study.oid)).length;
      await this.generator.simulateVisits(cfg.batch_percentage, cfg.speed_factor);
      const afterCount = (await this.storage.getForms(this.study.oid)).length;
      const created = afterCount - beforeCount;
      console.log(`[SIMULATOR] Tick completed: ${created} new forms created (total: ${afterCount})`);
    } else {
      await this.generator.simulateVisits(cfg.batch_percentage, cfg.speed_factor);
    }
  }

  getStorage() { return this.storage; }
  getStudyId() { return this.study.oid; }
  getConfig() { return this.study.config; }
}
