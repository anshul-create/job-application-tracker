import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/job-tracker-test';

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.collection('users').deleteMany({ email: /testregister|testlogin|testme|testlogout/ });
  await mongoose.disconnect();
});

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  const validPayload = {
    name: 'Test User',
    email: 'testregister1@example.com',
    password: 'Password123!',
  };

  it('201 — creates a new user and returns sanitised data', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const { user } = res.body.data;
    expect(user.id).toBeDefined();
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('testregister1@example.com');
    expect(user.createdAt).toBeDefined();
    expect(user.password).toBeUndefined();
  });

  it('409 — duplicate email returns EMAIL_ALREADY_EXISTS', async () => {
    await request(app).post('/api/v1/auth/register').send(validPayload);
    const res = await request(app).post('/api/v1/auth/register').send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('400 — missing name returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'testregister2@example.com', password: 'Password123!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'name')).toBe(true);
  });

  it('400 — invalid email returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'Password123!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'email')).toBe(true);
  });

  it('400 — short password returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test', email: 'testregister3@example.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'password')).toBe(true);
  });

  it('400 — empty body returns VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  const credentials = {
    email: 'testlogin@example.com',
    password: 'Password123!',
  };

  beforeAll(async () => {
    // seed a user to log in with
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Login User', ...credentials });
  });

  it('200 — valid credentials return user and set cookie', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { user } = res.body.data;
    expect(user.id).toBeDefined();
    expect(user.name).toBe('Login User');
    expect(user.email).toBe('testlogin@example.com');
    expect(user.password).toBeUndefined();

    // HttpOnly cookie must be set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith('token='))).toBe(true);
    expect(cookies.some((c) => c.toLowerCase().includes('httponly'))).toBe(true);
  });

  it('401 — wrong password returns INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('401 — unknown email returns INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password123!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('400 — missing email returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'Password123!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'email')).toBe(true);
  });

  it('400 — missing password returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'password')).toBe(true);
  });
});


// ─── /me ─────────────────────────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  let authCookie;

  beforeAll(async () => {
    // Register + login to get a valid session cookie
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Me User', email: 'testme@example.com', password: 'Password123!' });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'testme@example.com', password: 'Password123!' });

    authCookie = loginRes.headers['set-cookie'];
  });

  it('200 — returns current user when authenticated', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { user } = res.body.data;
    expect(user.id).toBeDefined();
    expect(user.name).toBe('Me User');
    expect(user.email).toBe('testme@example.com');
    expect(user.password).toBeUndefined();
  });

  it('401 — no cookie returns NOT_AUTHENTICATED', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  it('401 — invalid token returns INVALID_TOKEN', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', 'token=totallyinvalidtoken');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  let authCookie;

  beforeAll(async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Logout User', email: 'testlogout@example.com', password: 'Password123!' });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'testlogout@example.com', password: 'Password123!' });

    authCookie = loginRes.headers['set-cookie'];
  });

  it('204 — clears the token cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', authCookie);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});

    // The response should set a cookie with an expired/empty token
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('token=;'))).toBe(true);
  });

  it('204 — works even without a cookie (idempotent)', async () => {
    const res = await request(app).post('/api/v1/auth/logout');

    expect(res.status).toBe(204);
  });

  it('after logout, /me returns 401', async () => {
    // Login fresh
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'testlogout@example.com', password: 'Password123!' });
    const freshCookie = loginRes.headers['set-cookie'];

    // Logout
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', freshCookie);

    expect(logoutRes.status).toBe(204);

    // Extract the cleared cookie and try /me
    const clearedCookie = logoutRes.headers['set-cookie'];
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', clearedCookie);

    expect(meRes.status).toBe(401);
  });
});
