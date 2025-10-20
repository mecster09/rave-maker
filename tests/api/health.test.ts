import request from 'supertest';
import { makeAppAndStudy } from '../helpers/setupApp';

describe('API: /health', () => {
  it('returns ok', async () => {
    const { app } = await makeAppAndStudy();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('tick endpoint works', async () => {
    const { app } = await makeAppAndStudy();
    const res = await request(app).post('/api/control/tick').send({});
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'advanced');
  });
});
