import { Simulator } from './simulator';
import buildServer from './server';
import { loadConfig } from './config';

async function main() {
  const configPath = process.env.STUDY_CONFIG || 'study.config.yaml';
  const config = loadConfig(configPath);
  const isDev = process.env.NODE_ENV !== 'production';
  const enableApiLogging = config.logging?.api ?? isDev;

  const sim = new Simulator();
  await sim.initialize(configPath);

  const app = buildServer(sim, enableApiLogging);
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`[SERVER] Listening on ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
