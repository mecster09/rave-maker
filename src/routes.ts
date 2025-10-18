import { FastifyInstance } from 'fastify';
import { v4 as uuid } from 'uuid';
import { InMemoryStorage } from './storage/InMemoryStorage';
import { Generator } from './generator';
import { Study } from './models';

const storage = new InMemoryStorage();
const generators = new Map<string, Generator>();

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => ({ ok: true }));

  fastify.post('/api/studies', async (req, reply) => {
    const body = req.body as any;
    const id = uuid();
    const study: Study = {
      id,
      name: body.name || `Study-${id.slice(0,6)}`,
      config: body.config,
      status: 'stopped'
    };
    await storage.createStudy(study);
    return reply.code(201).send(study);
  });

  fastify.get('/api/studies/:studyId', async (req, reply) => {
    const study = await storage.getStudy((req.params as any).studyId);
    if (!study) return reply.code(404).send({ error: 'not found' });
    return study;
  });

  fastify.post('/api/studies/:studyId/start', async (req, reply) => {
    const id = (req.params as any).studyId;
    const study = await storage.getStudy(id);
    if (!study) return reply.code(404).send({ error: 'study not found' });

    // create generator if missing
    if (!generators.has(id)) {
      const g = new Generator(storage, study);
      await g.seedOnce();
      generators.set(id, g);
      g.start((study.config.generationRatePerMin && study.config.generationRatePerMin > 0) ? Math.max(1000, Math.floor(60_000 / study.config.generationRatePerMin)) : 10_000);
    } else {
      generators.get(id)!.start();
    }

    study.status = 'running';
    // update (if storage had persistent store, update it)
    await storage.createStudy(study);
    return { ok: true };
  });

  fastify.post('/api/studies/:studyId/stop', async (req, reply) => {
    const id = (req.params as any).studyId;
    const study = await storage.getStudy(id);
    if (!study) return reply.code(404).send({ error: 'study not found' });
    const g = generators.get(id);
    if (g) g.stop();
    study.status = 'stopped';
    await storage.createStudy(study);
    return { ok: true };
  });

  fastify.get('/api/studies/:studyId/sites', async (req, reply) => {
    const id = (req.params as any).studyId;
    return storage.getSites(id);
  });

  fastify.get('/api/studies/:studyId/subjects', async (req, reply) => {
    const id = (req.params as any).studyId;
    return storage.getSubjects(id);
  });

  fastify.get('/api/studies/:studyId/forms', async (req, reply) => {
    const id = (req.params as any).studyId;
    return storage.getForms(id);
  });

  fastify.post('/api/studies/:studyId/generate', async (req, reply) => {
    const id = (req.params as any).studyId;
    const study = await storage.getStudy(id);
    if (!study) return reply.code(404).send({ error: 'study not found' });
    const g = generators.get(id) ?? new Generator(storage, study);
    await g.deltaUpdateOnce();
    return { ok: true };
  });
}
