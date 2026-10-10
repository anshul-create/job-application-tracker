import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/job-tracker-test';

let authCookie;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);

  await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'App User', email: 'appuser@example.com', password: 'Password123!' });

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'appuser@example.com', password: 'Password123!' });

  authCookie = loginRes.headers['set-cookie'];
});

afterAll(async () => {
  await mongoose.connection.collection('applications').deleteMany({});
  await mongoose.connection.collection('users').deleteMany({ email: 'appuser@example.com' });
  await mongoose.disconnect();
});

// ─── POST /api/v1/applications ────────────────────────────────────────────────

describe('POST /api/v1/applications', () => {
  it('201 — creates application with required fields only', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Cookie', authCookie)
      .send({ company: 'Acme Technologies', role: 'Software Engineer Intern' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const { application } = res.body.data;
    expect(application.id).toBeDefined();
    expect(application.userId).toBeDefined();
    expect(application.createdAt).toBeDefined();
    expect(application.updatedAt).toBeDefined();
    expect(application.company).toBe('Acme Technologies');
    expect(application.role).toBe('Software Engineer Intern');
    expect(application.status).toBe('saved');
  });

  it('201 — creates application with all optional fields', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Cookie', authCookie)
      .send({
        company: 'Beta Corp',
        role: 'Backend Developer',
        jobUrl: 'https://example.com/jobs/1',
        location: 'Bengaluru',
        status: 'applied',
        appliedAt: '2026-10-10T10:30:00.000Z',
        notes: 'Applied via careers page.',
        salary: { min: 30000, max: 50000, currency: 'INR', period: 'MONTHLY' },
      });

    expect(res.status).toBe(201);
    const { application } = res.body.data;
    expect(application.status).toBe('applied');
    expect(application.location).toBe('Bengaluru');
    expect(application.salary.min).toBe(30000);
    expect(application.salary.currency).toBe('INR');
  });

  it('status defaults to saved and timestamps are set automatically', async () => {
    const before = new Date();

    const res = await request(app)
      .post('/api/v1/applications')
      .set('Cookie', authCookie)
      .send({ company: 'Timestamp Corp', role: 'QA Engineer' });

    const after = new Date();

    expect(res.status).toBe(201);
    const { application } = res.body.data;

    expect(application.status).toBe('saved');

    const createdAt = new Date(application.createdAt);
    const updatedAt = new Date(application.updatedAt);
    expect(isNaN(createdAt.getTime())).toBe(false);
    expect(isNaN(updatedAt.getTime())).toBe(false);
    expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(createdAt.getTime()).toBe(updatedAt.getTime());
  });

  it('saved record belongs to the authenticated user, not any userId from the client', async () => {
    const fakeUserId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post('/api/v1/applications')
      .set('Cookie', authCookie)
      .send({ company: 'Ownership Test Corp', role: 'Engineer', userId: fakeUserId });

    expect(res.status).toBe(201);

    const doc = await mongoose.connection
      .collection('applications')
      .findOne({ company: 'Ownership Test Corp' });

    expect(doc.userId.toString()).not.toBe(fakeUserId);

    const meRes = await request(app).get('/api/v1/auth/me').set('Cookie', authCookie);
    expect(doc.userId.toString()).toBe(meRes.body.data.user.id);
  });

  it('401 — no cookie returns NOT_AUTHENTICATED', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .send({ company: 'Ghost Corp', role: 'Ghost Dev' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  it('unauthenticated request must NOT create a record in the database', async () => {
    const before = await mongoose.connection.collection('applications').countDocuments();

    await request(app)
      .post('/api/v1/applications')
      .send({ company: 'Ghost Corp', role: 'Ghost Dev' });

    const after = await mongoose.connection.collection('applications').countDocuments();
    expect(after).toBe(before);
  });

  it('400 — missing company returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Cookie', authCookie)
      .send({ role: 'Engineer' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'company')).toBe(true);
  });

  it('400 — missing role returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Cookie', authCookie)
      .send({ company: 'Acme' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'role')).toBe(true);
  });

  it('400 — invalid jobUrl returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Cookie', authCookie)
      .send({ company: 'Acme', role: 'Engineer', jobUrl: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'jobUrl')).toBe(true);
  });

  it('400 — invalid status returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Cookie', authCookie)
      .send({ company: 'Acme', role: 'Engineer', status: 'unknown_status' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'status')).toBe(true);
  });

  it('invalid input must NOT create a record in the database', async () => {
    const before = await mongoose.connection.collection('applications').countDocuments();

    await request(app).post('/api/v1/applications').set('Cookie', authCookie).send({ role: 'Engineer' });
    await request(app).post('/api/v1/applications').set('Cookie', authCookie).send({ company: 'Acme', role: 'Engineer', jobUrl: 'not-a-url' });
    await request(app).post('/api/v1/applications').set('Cookie', authCookie).send({ company: 'Acme', role: 'Engineer', status: 'invalid' });

    const after = await mongoose.connection.collection('applications').countDocuments();
    expect(after).toBe(before);
  });
});
