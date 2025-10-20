// ==========================================
// RWS Route Handlers
// ==========================================
// Request handlers for RWS endpoints

import { FastifyRequest, FastifyReply } from 'fastify';
import { Storage } from '../storage/Storage';
import { SimulatorConfig } from '../config';
import { buildRWSStudies, buildRWSSubjects, buildClinicalDataset, buildODM, buildStudy } from '../odm/builder';
import { parseStudyParam } from './utils';
import { StudyMetadata } from '../odm/odmModels';
import { transformSubjectEventsToODM } from './transformers';

/**
 * GET /RaveWebServices/version
 * Returns the RWS version number
 */
export async function handleVersion(
  request: FastifyRequest,
  reply: FastifyReply,
  config: SimulatorConfig
): Promise<void> {
  const version = config.rws?.version || '1.18.0';
  reply
    .type('text/plain')
    .send(version);
}

/**
 * GET /RaveWebServices/twohundred
 * Health check endpoint returning 200 OK
 */
export async function handleTwoHundred(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>RaveWebServices - Health Check</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    .status { color: #28a745; font-size: 24px; font-weight: bold; }
    .info { margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 4px; }
    .timestamp { color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>RaveWebServices Health Check</h1>
    <p class="status">✓ Service is running</p>
    <div class="info">
      <p><strong>Status:</strong> OK</p>
      <p><strong>Endpoint:</strong> /RaveWebServices/twohundred</p>
      <p class="timestamp"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>`;

  reply
    .type('text/html')
    .send(html);
}

/**
 * GET /RaveWebServices/studies
 * Returns list of all studies user has access to
 */
export async function handleStudies(
  request: FastifyRequest,
  reply: FastifyReply,
  storage: Storage,
  config: SimulatorConfig
): Promise<void> {
  // Get all studies from storage
  const studies = await storage.getAllStudies();
  
  const studyList = studies.map(s => ({
    oid: s.oid,
    name: s.name,
    description: s.description
  }));

  const xml = buildRWSStudies(studyList);
  
  reply
    .type('application/xml')
    .send(xml);
}

/**
 * GET /RaveWebServices/studies/{project}({env})/subjects
 * Returns list of subjects in a study
 */
export async function handleStudySubjects(
  request: FastifyRequest<{
    Params: { study: string };
    Querystring: { status?: string; include?: string; subjectKeyType?: string; links?: string };
  }>,
  reply: FastifyReply,
  storage: Storage
): Promise<void> {
  const { study } = request.params;
  
  // Parse study name
  const parsed = parseStudyParam(study);
  if (!parsed) {
    reply.code(400).send({ error: 'Invalid study name format. Expected: ProjectName(Environment)' });
    return;
  }

  // Get study
  const studyData = await storage.getStudy(parsed.studyOID);
  if (!studyData) {
    reply.code(404).send({ error: 'Study not found' });
    return;
  }

  // Get subjects
  const subjects = await storage.getSubjects(parsed.studyOID);
  const subjectKeys = subjects.map(s => s.subjectKey);

  const xml = buildRWSSubjects(parsed.studyOID, studyData.metadataVersionOID, subjectKeys);
  
  reply
    .type('application/xml')
    .send(xml);
}

/**
 * GET /RaveWebServices/studies/{project}({env})/datasets/regular
 * Returns clinical data for entire study in ODM format
 */
export async function handleStudyDataset(
  request: FastifyRequest<{
    Params: { study: string };
    Querystring: { formOid?: string };
  }>,
  reply: FastifyReply,
  storage: Storage
): Promise<void> {
  const { study } = request.params;
  const { formOid } = request.query;
  
  // Parse study name
  const parsed = parseStudyParam(study);
  if (!parsed) {
    reply.code(400).send({ error: 'Invalid study name format. Expected: ProjectName(Environment)' });
    return;
  }

  // Get study
  const studyData = await storage.getStudy(parsed.studyOID);
  if (!studyData) {
    reply.code(404).send({ error: 'Study not found' });
    return;
  }

  // Get all clinical data
  const subjectEvents = await storage.getClinicalData(parsed.studyOID, formOid);

  // Get subjects to build siteOID map
  const subjects = await storage.getSubjects(parsed.studyOID);
  const siteOIDMap = new Map(subjects.map(s => [s.subjectKey, s.siteOID]));

  // Transform to ODM format
  const clinicalData = transformSubjectEventsToODM(subjectEvents, siteOIDMap);

  const xml = buildClinicalDataset(
    parsed.studyOID,
    studyData.metadataVersionOID,
    clinicalData
  );
  
  reply
    .type('application/xml')
    .send(xml);
}

/**
 * GET /RaveWebServices/studies/{project}({env})/subjects/{subjectKey}/datasets/regular
 * Returns clinical data for a specific subject
 */
export async function handleSubjectDataset(
  request: FastifyRequest<{
    Params: { study: string; subjectKey: string };
    Querystring: { formOid?: string };
  }>,
  reply: FastifyReply,
  storage: Storage
): Promise<void> {
  const { study, subjectKey } = request.params;
  const { formOid } = request.query;
  
  // Parse study name
  const parsed = parseStudyParam(study);
  if (!parsed) {
    reply.code(400).send({ error: 'Invalid study name format. Expected: ProjectName(Environment)' });
    return;
  }

  // Get study
  const studyData = await storage.getStudy(parsed.studyOID);
  if (!studyData) {
    reply.code(404).send({ error: 'Study not found' });
    return;
  }

  // Get subject data
  const subjectEvents = await storage.getSubjectClinicalData(parsed.studyOID, subjectKey, formOid);

  if (subjectEvents.length === 0) {
    reply.code(404).send({ error: 'Subject not found' });
    return;
  }

  // Get subject to find siteOID
  const subjects = await storage.getSubjects(parsed.studyOID);
  const subject = subjects.find(s => s.subjectKey === subjectKey);
  const siteOIDMap = new Map([[subjectKey, subject?.siteOID || 'SITE-UNKNOWN']]);

  // Transform to ODM format
  const clinicalData = transformSubjectEventsToODM(subjectEvents, siteOIDMap);

  const xml = buildClinicalDataset(
    parsed.studyOID,
    studyData.metadataVersionOID,
    clinicalData
  );
  
  reply
    .type('application/xml')
    .send(xml);
}

/**
 * POST /RaveWebServices/studies/{project}({env})/subjects
 * Register a new subject (placeholder - not fully implemented)
 */
export async function handleRegisterSubject(
  request: FastifyRequest<{
    Params: { study: string };
    Body: { subjectKey?: string; siteOID?: string };
  }>,
  reply: FastifyReply,
  storage: Storage
): Promise<void> {
  const { study } = request.params;
  
  // Parse study name
  const parsed = parseStudyParam(study);
  if (!parsed) {
    reply.code(400).send({ error: 'Invalid study name format. Expected: ProjectName(Environment)' });
    return;
  }

  // For now, return 501 Not Implemented
  // Full implementation would require ODM XML parsing from request body
  reply.code(501).send({ 
    error: 'Not Implemented',
    message: 'Subject registration not yet implemented in simulator'
  });
}
