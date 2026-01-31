import request from 'supertest';

import { app } from '../src/app';

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', name: 'SellIt API' });
  });
});

