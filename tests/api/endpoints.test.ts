import request from 'supertest';
import { makeAppAndStudy } from '../helpers/setupApp';

describe('API: endpoints', () => {
  it('lists subjects for a study', async () => {
    const { app, studyId } = await makeAppAndStudy();
    const res = await request(app).get(`/api/studies/${studyId}/subjects`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('advances a tick and returns forms', async () => {
    const { app, studyId } = await makeAppAndStudy();
    // advance simulation
    await request(app).post('/api/control/tick').send({});
    const res = await request(app).get(`/api/studies/${studyId}/forms`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
