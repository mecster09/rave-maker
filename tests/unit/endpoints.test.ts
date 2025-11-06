import fs from 'fs';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { app } from '../../src/index';

const AUTH_HEADER = {
  authorization: 'Basic VEVTVF9VU0VSOlRFU1RfUEFTU1dPUkQ=',
};

describe('HTTP endpoints', () => {
  beforeAll(async () => {
    await app.ready();
  });

  it('returns version info as XML', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/version',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.body).toContain('<Version>');
  });

  it('returns build version info as XML', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/version/build',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.body).toContain('<BuildVersion>');
  });

  it('returns TwoHundred status XML', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/twohundred',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.body).toContain('<Status>');
    expect(response.body).toContain('<Message>');
  });

  it('returns studies list XML', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.body).toContain('<Studies>');
    expect(response.body).toContain('<Study');
  });

  it('requires CacheFlush query flag', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/webservice.aspx',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('ReasonCode="RWS00020"');
  });

  it('flushes cache and returns success', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/webservice.aspx?CacheFlush',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.body.trim()).toBe('<Success/>');
  });

  it('requires PostODMClinicalData action', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/RaveWebServices/webservice.aspx',
      headers: {
        ...AUTH_HEADER,
        'content-type': 'application/xml',
      },
      payload: '<ODM/>',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('ReasonCode="RWS00020"');
  });

  it('requires ODM payload for PostODMClinicalData', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/RaveWebServices/webservice.aspx?PostODMClinicalData',
      headers: AUTH_HEADER,
      payload: '',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('ReasonCode="RWS00020"');
    expect(response.body).toContain('ODM payload is required');
  });

  it('accepts PostODMClinicalData and returns success XML', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/RaveWebServices/webservice.aspx?PostODMClinicalData',
      headers: {
        ...AUTH_HEADER,
        'content-type': 'application/xml',
      },
      payload: '<ODM><ClinicalData/></ODM>',
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.body).toContain('<Success/>');
  });

  it('enforces auth and returns RWS-style 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Mediflex(Prod)/datasets/metadata/regular',
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.body).toContain('ReasonCode="RWS00008"');
  });

  it('serves study metadata with ODM namespace', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Mediflex(Prod)/datasets/metadata/regular',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.body).toContain('xmlns="http://www.cdisc.org/ns/odm/v1.3"');
    expect(response.body).toContain('<MetaDataVersion OID="MDV.RAVE.01"');
  });

  it('returns 404 for metadata when StudyOID not found', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/UnknownStudy/datasets/metadata/regular',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('ReasonCode="RWS00012"');
  });

  it('returns audit records honoring uppercase query params', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm?PerPage=1&StartID=1&Unicode=Y&Mode=Changes&FormOID=DM&StudyOID=Mediflex(Prod)',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.body).toContain('<AuditRecords Mode="Changes" Unicode="Y" FormOID="DM">');
    expect(response.body).toContain('<AuditRecord ID="1001"');
  });

  it('rejects audit dataset requests for unknown studies', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm?StudyOID=UnknownStudy',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('ReasonCode="RWS00012"');
  });

  it('filters mock audit records by FormOID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm?FormOID=VS',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.body).toContain('<AuditRecords Mode="Full" Unicode="N" FormOID="VS">');
    expect(response.body).not.toContain('<AuditRecord ID="1001"');
  });

  it('accepts legacy per_page and startid casing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm?per_page=1&startid=1001',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.body).toContain('<AuditRecords Mode="Full" Unicode="N">');
    expect(response.body).toContain('<AuditRecord ID="1001"');
  });

  it('omits audit records when StartID is greater than available data', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm?StartID=9999',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.body).not.toContain('<AuditRecord ID="1001"');
  });

  it('serves subject listings with extended attributes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Mediflex(Prod)/Subjects',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.body).toContain('<Subjects StudyOID="Mediflex(Prod)">');
    expect(response.body).toContain('SiteOID="SITE001"');
    expect(response.body).toContain('SecondarySubjectID="SUBJ-1001"');
  });

  it('returns 404 for subjects when StudyOID not found', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/UnknownStudy/Subjects',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('ReasonCode="RWS00013"');
  });

  it('returns internal test error when metadata XML is unavailable', async () => {
    const original = fs.readFileSync;
    const spy = vi.spyOn(fs, 'readFileSync').mockImplementation((...args: Parameters<typeof fs.readFileSync>) => {
      const [file] = args;
      if (typeof file === 'string' && file.endsWith('metadata.xml')) {
        throw new Error('ENOENT: missing metadata');
      }
      return original(...args);
    });

    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Mediflex(Prod)/datasets/metadata/regular',
      headers: AUTH_HEADER,
    });

    spy.mockRestore();

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('ReasonCode="RWS00100"');
    expect(response.body).toContain('Internal test error');
  });

  it('returns internal test error when subjects XML is unavailable', async () => {
    const original = fs.readFileSync;
    const spy = vi.spyOn(fs, 'readFileSync').mockImplementation((...args: Parameters<typeof fs.readFileSync>) => {
      const [file] = args;
      if (typeof file === 'string' && file.endsWith('subjects.xml')) {
        throw new Error('ENOENT: missing subjects');
      }
      return original(...args);
    });

    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Mediflex(Prod)/Subjects',
      headers: AUTH_HEADER,
    });

    spy.mockRestore();

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('ReasonCode="RWS00100"');
    expect(response.body).toContain('Internal test error');
  });

  it('returns dataset-specific 404 for unknown dataset routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/CompletelyUnknown.odm',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('ReasonCode="RWS00012"');
  });

  it('returns generic 404 for other unmatched routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/Nope',
      headers: AUTH_HEADER,
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('ReasonCode="RWS00013"');
  });
});
