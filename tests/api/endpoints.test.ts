import request from 'supertest';
import { makeAppAndStudy } from '../helpers/setupApp';
import { XMLParser } from 'fast-xml-parser';

// Test credentials from study.config.yaml
const AUTH_USER = 'testuser';
const AUTH_PASS = 'testpass';

describe('API: RWS endpoints', () => {
  it('returns RWS version', async () => {
    const { app } = await makeAppAndStudy();
    const res = await request(app).get('/RaveWebServices/version');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/\d+\.\d+\.\d+/);
  });

  it('returns 200 for health check', async () => {
    const { app } = await makeAppAndStudy();
    const res = await request(app).get('/RaveWebServices/twohundred');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Health Check');
  });

  it('lists subjects for a study in ODM XML format', async () => {
    const { app, studyId } = await makeAppAndStudy();
    const res = await request(app)
      .get(`/RaveWebServices/studies/${studyId}/subjects`)
      .auth(AUTH_USER, AUTH_PASS);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.text).toContain('ODM');
  });

  it('advances a tick and returns clinical data in ODM format', async () => {
    const { app, studyId } = await makeAppAndStudy();
    // advance simulation
    await request(app).post('/api/control/tick').send({});
    const res = await request(app)
      .get(`/RaveWebServices/studies/${studyId}/datasets/regular`)
      .auth(AUTH_USER, AUTH_PASS);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.text).toContain('ODM');
  });
});
