import { Simulator } from './simulator';
import buildServer from './server';

async function main() {
  const sim = new Simulator();
  await sim.initialize(process.env.STUDY_CONFIG || 'study.config.yaml');

  const app = buildServer(sim);
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(port, () => console.log(`[SERVER] Listening on ${port}`));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
