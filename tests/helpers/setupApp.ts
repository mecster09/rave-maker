import buildServer from '../../src/server';
import { Simulator } from '../../src/simulator';

export async function makeAppAndStudy() {
  const sim = new Simulator();
  await sim.initialize('study.config.yaml');
  const app = buildServer(sim);
  const studyId = sim.getStudyId();
  return { app, sim, studyId };
}
