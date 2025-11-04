import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureAuthorized } from './utils/auth.js';
import { rwsError } from './utils/errors.js';
import { readXml } from './utils/file.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockRoot = path.resolve(__dirname, '..', '..', 'mockData');

const fastify = Fastify({ logger: false });

// Global auth preHandler
fastify.addHook('preHandler', (req, reply, done) => {
  const ok = ensureAuthorized(req.headers['authorization']);
  if (!ok) {
    reply.type('application/xml').code(401)
      .send('<Response ReasonCode="RWS00008" ErrorClientResponseMessage="Unauthorized"/>');
    return;
  }
  done();
});

// 1) Study Metadata
fastify.get('/RaveWebServices/studies/:studyOid/datasets/metadata/regular', async (req, reply) => {
  try {
    const xml = readXml(path.join(mockRoot, 'metadata.xml'));
    reply.type('application/xml').send(xml);
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err.message));
  }
});

// 2) Clinical Audit Records
fastify.get('/RaveWebServices/datasets/ClinicalAuditRecords.odm', async (req, reply) => {
  try {
    const xml = readXml(path.join(mockRoot, 'auditRecords.xml'));
    reply.type('application/xml').send(xml);
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err.message));
  }
});

// 3) Subjects
fastify.get('/RaveWebServices/studies/:studyOid/Subjects', async (req, reply) => {
  try {
    const xml = readXml(path.join(mockRoot, 'subjects.xml'));
    reply.type('application/xml').send(xml);
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err.message));
  }
});

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
