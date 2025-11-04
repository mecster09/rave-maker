import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureAuthorized } from './utils/auth.js';
import { rwsError } from './utils/errors.js';
import { readXml } from './utils/file.js';
import { loadConfig } from './utils/config.js';
import { RwsSimulator } from './simulator/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockRoot = path.resolve(__dirname, '..', '..', 'mockData');
const config = loadConfig(__dirname);
const studyOidDefault = config.study.oid || 'Mediflex(Prod)';
const useSim = config.dataMode === 'simulator';
const simulator = useSim
  ? new RwsSimulator(studyOidDefault, {
      intervalMs: Math.max(0, Number(config.study.interval_ms || 0)),
      batchPercentage: Math.min(100, Math.max(0, Number(config.study.batch_percentage || 25))),
      speedFactor: Number(config.study.speed_factor || 1.0),
      sites: Math.max(1, Number(config.structure.sites || 1)),
      subjectsPerSite: Math.max(1, Number(config.structure.subjects_per_site || 1)),
      logging: !!config.logging?.simulator,
      logGenerator: !!config.logging?.generator,
      progressIncrement: Number(config.structure.progress_increment || 10),
      siteNames: config.structure.site_names,
      visits: {
        templates: config.visits?.templates?.map(v => ({ name: v.name, dayOffset: v.day_offset, forms: v.forms })) || undefined,
        probabilities: { delayed: config.visits?.probabilities?.delayed, missed: config.visits?.probabilities?.missed, partial: config.visits?.probabilities?.partial },
        delayMs: { min: config.visits?.delay_ms?.min, max: config.visits?.delay_ms?.max },
      },
      audit: {
        user: config.audit?.user,
        fieldOids: config.audit?.field_oids,
        perPageDefault: config.audit?.per_page_default,
      },
      valueRules: config.values?.rules,
    })
  : undefined;

const fastify = Fastify({ logger: false });

// Global auth preHandler
fastify.addHook('preHandler', (req, reply, done) => {
  const expected = config.auth?.basic_token || 'Basic TEST_TOKEN';
  const ok = ensureAuthorized(req.headers['authorization'], expected);
  if (!ok) {
    reply.type('application/xml').code(401)
      .send('<Response ReasonCode="RWS00008" ErrorClientResponseMessage="Unauthorized"/>');
    return;
  }
  done();
});

// 1) Study Metadata
fastify.get('/RaveWebServices/studies/:studyOid/datasets/metadata/regular', async (req: any, reply) => {
  try {
    if (useSim && simulator) {
      const studyOid = String(req.params.studyOid || studyOidDefault);
      const xml = simulator.metadataXml(studyOid);
      reply.type('application/xml').send(xml);
    } else {
      const xml = readXml(path.join(mockRoot, 'metadata.xml'));
      reply.type('application/xml').send(xml);
    }
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err.message));
  }
});

// 2) Clinical Audit Records
fastify.get('/RaveWebServices/datasets/ClinicalAuditRecords.odm', async (req, reply) => {
  try {
    if (useSim && simulator) {
      const q = (req.query || {}) as any;
      const perPage = q?.per_page ? Number(q.per_page) : (config.audit?.per_page_default || 500);
      const startId = q?.startid ? Number(q.startid) : 1;
      const xml = simulator.auditXml(perPage, startId);
      reply.type('application/xml').send(xml);
    } else {
      const xml = readXml(path.join(mockRoot, 'auditRecords.xml'));
      reply.type('application/xml').send(xml);
    }
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err.message));
  }
});

// 3) Subjects
fastify.get('/RaveWebServices/studies/:studyOid/Subjects', async (req, reply) => {
  try {
    if (useSim && simulator) {
      const xml = simulator.subjectsXml();
      reply.type('application/xml').send(xml);
    } else {
      const xml = readXml(path.join(mockRoot, 'subjects.xml'));
      reply.type('application/xml').send(xml);
    }
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err.message));
  }
});

// Simulator control endpoints (XML responses)
if (useSim && simulator) {
  // Manual tick control
  fastify.post('/simulator/tick', async (_req, reply) => {
    try {
      simulator.tick();
      reply.type('application/xml').send('<Simulator action="tick" status="advanced"/>');
    } catch (err: any) {
      reply.type('application/xml').code(500).send(rwsError('RWS00100', err.message));
    }
  });

  fastify.post('/simulator/control/:action', async (req: any, reply) => {
    try {
      const action = String(req.params.action);
      if (action === 'pause') simulator.pause();
      else if (action === 'resume') simulator.resume();
      else if (action === 'reset') simulator.reset();
      else if (action === 'tick') simulator.tick();
      else return reply.type('application/xml').code(404).send('<Response ReasonCode="RWS00013" ErrorClientResponseMessage="Not found"/>');
      reply.type('application/xml').send(`<Simulator action="${action}" status="ok"/>`);
    } catch (err: any) {
      reply.type('application/xml').code(500).send(rwsError('RWS00100', err.message));
    }
  });

  fastify.get('/simulator/status', async (_req, reply) => {
    try {
      reply.type('application/xml').send(simulator.statusXml());
    } catch (err: any) {
      reply.type('application/xml').code(500).send(rwsError('RWS00100', err.message));
    }
  });
}

// 404 fallback
fastify.setNotFoundHandler((req, reply) => {
  reply.type('application/xml').code(404)
    .send('<Response ReasonCode="RWS00013" ErrorClientResponseMessage="Not found"/>');
});

// Error handler
fastify.setErrorHandler((error, req, reply) => {
  reply.type('application/xml').code(500)
    .send(rwsError('RWS00100', error.message));
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
fastify.listen({ port, host: '0.0.0.0' })
  .then(() => console.log(`RWS mock listening on :${port}`))
  .catch(err => { console.error(err); process.exit(1); });
