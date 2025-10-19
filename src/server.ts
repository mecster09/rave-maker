import express from 'express';
import { Simulator } from './simulator';

export function buildServer(sim?: Simulator) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.get('/api/studies/:id/subjects', async (req, res) => {
    const data = await sim?.getStorage().getSubjects(req.params.id);
    res.json(data ?? []);
  });

  app.get('/api/studies/:id/forms', async (req, res) => {
    const data = await sim?.getStorage().getForms(req.params.id, req.query.subjectId as string | undefined);
    res.json(data ?? []);
  });

  app.get('/api/studies/:id/queries', async (req, res) => {
    const data = await sim?.getStorage().getQueries(req.params.id);
    res.json(data ?? []);
  });

  app.post('/api/control/tick', async (_req, res) => {
    await sim?.tick();
    res.json({ status: 'advanced' });
  });

  return app;
}

export default buildServer;
