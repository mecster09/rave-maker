import { loadConfig, SimulatorConfig, VisitConfig } from './config';
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
      description: config.study.description,
      config
    };

    this.visits = config.visits.map(v => ({ ...v, id: uuid(), studyId: this.study.id }));
    this.generator = new Generator(this.storage, this.study, this.visits);

    await this.generator.seedOnce();
  }

  start() {
    if (!this.generator) throw new Error("Simulator not initialized");
    const cfg = this.study.config.simulation;
    const delay = (cfg.start_delay_sec ?? 0) * 1000;
    setTimeout(() => this.generator!.start(cfg.update_interval_sec * 1000, cfg.update_batch_pct, cfg.time_acceleration), delay);
  }

  getStorage() { return this.storage; }
}
