import { loadConfig, SimulatorConfig } from './config';
import { InMemoryStorage } from './storage/InMemoryStorage';
import { Generator } from './generator';
import { v4 as uuid } from 'uuid';
import { Visit, Study } from './models';

export class Simulator {
  private storage = new InMemoryStorage();
  private generator?: Generator;
  private visits: Visit[] = [];
  private study!: Study;

  async initialize(configPath: string) {
    const config: SimulatorConfig = loadConfig(configPath);

    this.study = {
      id: config.study.id || uuid(),
      name: config.study.name,
      description: undefined,
      config
    };

    this.visits = config.visits.map(v => ({ ...v, id: uuid(), studyId: this.study.id }));
    this.generator = new Generator(this.storage, this.study, this.visits);

    await this.generator.seedOnce();
  }

  start() {
    if (!this.generator) throw new Error("Simulator not initialized");
    const cfg = this.study.config.study;
    setTimeout(() =>
      this.generator!.simulateVisits(cfg.batch_percentage, cfg.speed_factor),
      this.study.config.study.interval_ms
    );
  }

  getStorage() { return this.storage; }
  getStudyId() { return this.study.id; }
}
