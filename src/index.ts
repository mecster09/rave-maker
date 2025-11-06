import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureAuthorized, DEFAULT_BASIC_TOKEN } from './utils/auth.js';
import { rwsError, escapeXml } from './utils/errors.js';
import { readXml } from './utils/file.js';
import { loadConfig } from './utils/config.js';
import { RwsSimulator } from './simulator/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockRootCandidates = [
  path.resolve(__dirname, '..', '..', 'mockData'),
  path.resolve(__dirname, '..', 'mockData'),
];
const mockRoot = mockRootCandidates.find(candidate =>
  fs.existsSync(path.join(candidate, 'metadata.xml'))
) ?? mockRootCandidates[0];
const config = loadConfig(__dirname);
const studyOidDefault = config.study.oid || 'Mediflex(Prod)';
const useSim = config.dataMode === 'simulator';
const persistenceStateFile = path.resolve(
  __dirname,
  '..',
  '..',
  config.persistence?.state_file ?? 'data/simulator-state.json',
);
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
      persistState: config.persistence?.enabled !== false,
      statePersistencePath: persistenceStateFile,
      freshSeedOnStart: !!config.persistence?.fresh_seed_on_start,
    })
  : undefined;

const fastify = Fastify({ logger: false });
export const app = fastify;

// Accept XML payloads as plain strings
fastify.addContentTypeParser('application/xml', { parseAs: 'string' }, (_req, body, done) => {
  done(null, body);
});
fastify.addContentTypeParser('text/xml', { parseAs: 'string' }, (_req, body, done) => {
  done(null, body);
});

// Global auth preHandler
fastify.addHook('preHandler', (req, reply, done) => {
  const expected = config.auth?.basic_token || DEFAULT_BASIC_TOKEN;
  const ok = ensureAuthorized(req.headers['authorization'], expected);
  if (!ok) {
    reply.type('application/xml').code(401)
      .send('<Response ReasonCode="RWS00008" ErrorClientResponseMessage="Unauthorized"/>');
    return;
  }
  done();
});

// Basic informational endpoints
fastify.get('/RaveWebServices/version', async (_req, reply) => {
  try {
    if (useSim && simulator) {
      const xml = simulator.versionXml();
      reply.type('application/xml').send(xml);
      return;
    }
    const xml = readXml(path.join(mockRoot, 'version.xml'));
    reply.type('application/xml').send(xml);
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err?.message ?? 'Internal test error'));
  }
});

fastify.get('/RaveWebServices/version/build', async (_req, reply) => {
  try {
    if (useSim && simulator) {
      const xml = simulator.buildVersionXml();
      reply.type('application/xml').send(xml);
      return;
    }
    const xml = readXml(path.join(mockRoot, 'versionBuild.xml'));
    reply.type('application/xml').send(xml);
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err?.message ?? 'Internal test error'));
  }
});

fastify.get('/RaveWebServices/twohundred', async (_req, reply) => {
  try {
    if (useSim && simulator) {
      const xml = simulator.twoHundredXml();
      reply.type('application/xml').send(xml);
      return;
    }
    const xml = readXml(path.join(mockRoot, 'twohundred.xml'));
    reply.type('application/xml').send(xml);
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err?.message ?? 'Internal test error'));
  }
});

fastify.get('/RaveWebServices/studies', async (_req, reply) => {
  try {
    if (useSim && simulator) {
      const xml = simulator.studiesXml();
      reply.type('application/xml').send(xml);
      return;
    }
    const xml = readXml(path.join(mockRoot, 'studies.xml'));
    reply.type('application/xml').send(xml);
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err?.message ?? 'Internal test error'));
  }
});

fastify.get('/RaveWebServices/webservice.aspx', async (req: any, reply) => {
  try {
    const query = (req.query || {}) as Record<string, unknown>;
    const hasCacheFlush = Object.keys(query).some(key => key.toLowerCase() === 'cacheflush');
    if (!hasCacheFlush) {
      reply.type('application/xml').code(400)
        .send(rwsError('RWS00020', 'CacheFlush flag required'));
      return;
    }
    if (useSim && simulator) {
      const xml = simulator.cacheFlushXml();
      reply.type('application/xml').send(xml);
      return;
    }
    const xml = readXml(path.join(mockRoot, 'cacheFlush.xml'));
    reply.type('application/xml').send(xml);
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err?.message ?? 'Internal test error'));
  }
});

fastify.post('/RaveWebServices/webservice.aspx', async (req: any, reply) => {
  try {
    const query = (req.query || {}) as Record<string, unknown>;
    const hasPostFlag = Object.keys(query).some(key => key.toLowerCase() === 'postodmclinicaldata');
    if (!hasPostFlag) {
      reply.type('application/xml').code(400)
        .send(rwsError('RWS00020', 'PostODMClinicalData action required'));
      return;
    }
    const body = req.body;
    const payload = typeof body === 'string' ? body : body ? String(body) : '';
    if (!payload.trim()) {
      reply.type('application/xml').code(400)
        .send(rwsError('RWS00020', 'ODM payload is required'));
      return;
    }
    if (useSim && simulator) {
      const xml = simulator.postClinicalDataResponse(payload);
      reply.type('application/xml').send(xml);
      return;
    }
    const xml = readXml(path.join(mockRoot, 'postClinicalDataSuccess.xml'));
    reply.type('application/xml').send(xml);
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err?.message ?? 'Internal test error'));
  }
});

// 1) Study Metadata
fastify.get('/RaveWebServices/studies/:StudyOID/datasets/metadata/regular', async (req: any, reply) => {
  try {
    const params = req.params || {};
    const studyOidParam = params.StudyOID ?? params.studyOid;
    const requestedStudyOid = studyOidParam ? String(studyOidParam) : studyOidDefault;
    if (!requestedStudyOid || requestedStudyOid !== studyOidDefault) {
      reply.type('application/xml').code(404)
        .send('<Response ReasonCode="RWS00012" ErrorClientResponseMessage="Study OID not found"/>');
      return;
    }
    if (useSim && simulator) {
      const xml = simulator.metadataXml(requestedStudyOid);
      reply.type('application/xml').send(xml);
    } else {
      try {
        const xml = readXml(path.join(mockRoot, 'metadata.xml'));
        reply.type('application/xml').send(xml);
      } catch {
        reply.type('application/xml').code(500)
          .send('<Response ReasonCode="RWS00100" ErrorClientResponseMessage="Internal test error"/>');
      }
    }
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err.message));
  }
});

// 2) Clinical Audit Records
fastify.get('/RaveWebServices/datasets/ClinicalAuditRecords.odm', async (req, reply) => {
  try {
    const q = (req.query || {}) as Record<string, unknown>;
    const firstMatch = (...keys: string[]) => {
      for (const key of keys) {
        const value = q[key];
        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      }
      return undefined;
    };
    const perPageRaw = firstMatch('PerPage', 'perPage', 'per_page');
    const startIdRaw = firstMatch('StartID', 'startId', 'startid');
    const unicodeRaw = firstMatch('Unicode', 'unicode');
    const modeRaw = firstMatch('Mode', 'mode');
    const formOidRaw = firstMatch('FormOID', 'formOid', 'formoid');
    const studyOidRaw = firstMatch('StudyOID', 'studyOid', 'studyoid');

    const parsePositiveInt = (val: unknown, fallback: number): number => {
      const num = Number(val);
      return Number.isFinite(num) && num > 0 ? num : fallback;
    };
    const perPage = parsePositiveInt(perPageRaw, config.audit?.per_page_default ?? 500);
    const startId = parsePositiveInt(startIdRaw, 1);

    const unicode = typeof unicodeRaw === 'string' && unicodeRaw.toUpperCase() === 'Y' ? 'Y' : 'N';
    const normalizeMode = (value: unknown): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const lower = trimmed.toLowerCase();
      if (lower === 'changes') return 'Changes';
      if (lower === 'full') return 'Full';
      return trimmed;
    };
    const mode = normalizeMode(modeRaw) ?? 'Full';
    const formOid = typeof formOidRaw === 'string' && formOidRaw.trim() ? formOidRaw.trim() : undefined;
    const studyOidOverride = typeof studyOidRaw === 'string' && studyOidRaw.trim() ? studyOidRaw.trim() : undefined;

    if (useSim && simulator) {
      const xml = simulator.auditXml(perPage, startId, {
        unicode,
        mode,
        formOid,
        studyOid: studyOidOverride,
      });
      reply.type('application/xml').send(xml);
    } else {
      if (studyOidOverride && studyOidOverride !== studyOidDefault) {
        reply.type('application/xml').code(404)
          .send('<Response ReasonCode="RWS00012" ErrorClientResponseMessage="Study OID not found"/>');
        return;
      }
      const recordFieldOid = 'DM.SEX';
      const recordId = 1001;
      const includeRecord =
        perPage > 0 &&
        startId <= recordId &&
        (!formOid || recordFieldOid.startsWith(`${formOid}.`) || formOid === 'DM');
      const auditAttributes = [
        `Mode="${escapeXml(mode)}"`,
        `Unicode="${unicode}"`,
      ];
      if (formOid) {
        auditAttributes.push(`FormOID="${escapeXml(formOid)}"`);
      }
      const recordLines = includeRecord
        ? [
            '      <AuditRecord ID="1001" User="raveuser" FieldOID="DM.SEX" OldValue="M" NewValue="F" DateTimeStamp="2025-10-18T14:21:03Z"/>',
          ]
        : [];
      const xml = [
        '<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3" ODMVersion="1.3" FileType="Snapshot" CreationDateTime="2025-10-18T14:21:03Z" SourceSystem="Rave Mock">',
        `  <ClinicalData StudyOID="${escapeXml(studyOidDefault)}">`,
        `    <AuditRecords ${auditAttributes.join(' ')}>`,
        ...recordLines,
        '    </AuditRecords>',
        '  </ClinicalData>',
        '</ODM>',
      ].join('\n');
      reply.type('application/xml').send(xml);
    }
  } catch (err: any) {
    reply.type('application/xml').code(500)
      .send(rwsError('RWS00100', err.message));
  }
});

// 3) Subjects
fastify.get('/RaveWebServices/studies/:StudyOID/Subjects', async (req: any, reply) => {
  try {
    const params = req.params || {};
    const studyOidParam = params.StudyOID ?? params.studyOid;
    const requestedStudyOid = studyOidParam ? String(studyOidParam) : studyOidDefault;
    if (!requestedStudyOid || requestedStudyOid !== studyOidDefault) {
      reply.type('application/xml').code(404)
        .send('<Response ReasonCode="RWS00013" ErrorClientResponseMessage="No subjects found for study"/>');
      return;
    }
    if (useSim && simulator) {
      const xml = simulator.subjectsXml(requestedStudyOid);
      reply.type('application/xml').send(xml);
    } else {
      try {
        const xml = readXml(path.join(mockRoot, 'subjects.xml'));
        reply.type('application/xml').send(xml);
      } catch {
        reply.type('application/xml').code(500)
          .send('<Response ReasonCode="RWS00100" ErrorClientResponseMessage="Internal test error"/>');
      }
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
  const url = req.raw?.url ?? '';
  let reasonCode = 'RWS00013';
  let message = 'Not found';
  if (url.includes('/RaveWebServices/datasets')) {
    reasonCode = 'RWS00012';
    message = 'Study OID not found';
  } else if (url.includes('/RaveWebServices/studies') && url.includes('/Subjects')) {
    reasonCode = 'RWS00013';
    message = 'No subjects found for study';
  }
  reply.type('application/xml').code(404)
    .send(`<Response ReasonCode="${reasonCode}" ErrorClientResponseMessage="${message}"/>`);
});

// Error handler
fastify.setErrorHandler((error, req, reply) => {
  reply.type('application/xml').code(500)
    .send(rwsError('RWS00100', error.message));
});

if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  fastify.listen({ port, host: '0.0.0.0' })
    .then(() => console.log(`rave-maker mock listening on :${port}`))
    .catch(err => { console.error(err); process.exit(1); });
}
