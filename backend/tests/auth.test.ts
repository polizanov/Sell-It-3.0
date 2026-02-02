import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

jest.mock('../src/services/email.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined)
}));

import { app } from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/database';
import { User } from '../src/models/User';
import { hashVerificationToken } from '../src/utils/verificationToken';
import { sendVerificationEmail } from '../src/services/email.service';

describe('auth', () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_secret';
    mongod = await MongoMemoryServer.create();
    await connectToDatabase(mongod.getUri());
  });

  afterAll(async () => {
    await disconnectToClean();
    if (mongod) await mongod.stop();
  });

  async function disconnectToClean() {
    await disconnectFromDatabase();
  }

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('registers and returns token + user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'password123', username: 'alice' })
      .expect(201);

    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({
      email: 'a@b.com',
      username: 'alice',
      isEmailVerified: false
    });
  });

  it('register -> verify-email -> login reflects verified status (no inbox required)', async () => {
    const email = 'jocewe6310@cimario.com';
    const username = 'test';
    const password = '12341234';

    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password, username })
      .expect(201);

    // Registration logs the user in even before verification.
    expect(typeof reg.body.token).toBe('string');
    expect(reg.body.user).toMatchObject({ email, username, isEmailVerified: false });

    // Capture the verification token from the mocked email sender.
    const mockedSend = sendVerificationEmail as unknown as jest.Mock;
    expect(mockedSend).toHaveBeenCalled();
    const lastCall = mockedSend.mock.calls[mockedSend.mock.calls.length - 1] as [string, string];
    expect(lastCall[0]).toBe(email);
    const verificationToken = lastCall[1];
    expect(typeof verificationToken).toBe('string');
    expect(verificationToken.length).toBeGreaterThanOrEqual(10);

    // Before verification, login succeeds but user remains unverified.
    const loginBefore = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    expect(loginBefore.body.user).toMatchObject({ email, username, isEmailVerified: false });

    // Verify email using the captured token.
    const verify = await request(app)
      .get('/api/auth/verify-email')
      .query({ token: verificationToken })
      .expect(200);
    expect(verify.body.user).toMatchObject({ email, username, isEmailVerified: true });

    // After verification, login returns user as verified.
    const loginAfter = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    expect(loginAfter.body.user).toMatchObject({ email, username, isEmailVerified: true });
  });

  it('logs in and returns token + user', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'password123', username: 'alice' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'password123' })
      .expect(200);

    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('a@b.com');
  });

  it('me requires auth and works with token', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'password123', username: 'alice' })
      .expect(201);

    await request(app).get('/api/auth/me').expect(401);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .expect(200);

    expect(me.body.user.email).toBe('a@b.com');
  });

  it('verifies email with token', async () => {
    const token = 'test_token_123';
    const tokenHash = hashVerificationToken(token);

    const user = await User.create({
      email: 'a@b.com',
      username: 'alice',
      passwordHash: 'hash',
      isEmailVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationTokenExpiresAt: new Date(Date.now() + 60_000)
    });

    const res = await request(app)
      .get('/api/auth/verify-email')
      .query({ token })
      .expect(200);

    expect(res.body.user.isEmailVerified).toBe(true);

    const updated = await User.findById(user._id);
    expect(updated?.isEmailVerified).toBe(true);
    // Token hash is kept after verification so we can identify the user if they click the link again
    expect(updated?.emailVerificationTokenHash).toBe(tokenHash);
  });

  it('resends verification email for unverified user', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'password123', username: 'alice' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .expect(200);

    expect(res.body.message).toMatch(/sent|already/i);
  });

  it('returns success when verifying email again after already verified', async () => {
    const token = 'test_token_123';
    const tokenHash = hashVerificationToken(token);

    const user = await User.create({
      email: 'a@b.com',
      username: 'alice',
      passwordHash: 'hash',
      isEmailVerified: true,
      emailVerificationTokenHash: tokenHash,
      emailVerificationTokenExpiresAt: new Date(Date.now() + 60_000)
    });

    // First verification attempt (user already verified)
    const res = await request(app)
      .get('/api/auth/verify-email')
      .query({ token })
      .expect(200);

    expect(res.body.message).toBe('Email already verified');
    expect(res.body.user.isEmailVerified).toBe(true);

    // Token hash is kept after verification so we can identify the user if they click the link again
    const updated = await User.findById(user._id);
    expect(updated?.emailVerificationTokenHash).toBe(tokenHash);
  });
});

