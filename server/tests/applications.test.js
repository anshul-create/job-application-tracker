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

// seed helper
async function createApp(cookie, fields = {}) {
  const res = await request(app)
    .post('/api/v1/applications')
    .set('Cookie', cookie)
    .send({ company: 'Seed Corp', role: 'Engineer', ...fields });
  return res.body.data.application;
}

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


// ─── GET /api/v1/applications ─────────────────────────────────────────────────

describe('GET /api/v1/applications', () => {
  beforeAll(async () => {
    // Seed 5 known applications for list tests
    await createApp(authCookie, { company: 'Alpha Inc', role: 'Frontend Dev', status: 'applied' });
    await createApp(authCookie, { company: 'Beta Ltd', role: 'Backend Dev', status: 'interview' });
    await createApp(authCookie, { company: 'Gamma LLC', role: 'Full Stack Dev', status: 'interview' });
    await createApp(authCookie, { company: 'Delta Co', role: 'DevOps Engineer', status: 'offer' });
    await createApp(authCookie, { company: 'Alpha Systems', role: 'QA Engineer', status: 'applied' });
  });

  it('200 — returns paginated list with correct shape', async () => {
    const res = await request(app)
      .get('/api/v1/applications')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.applications)).toBe(true);

    const { pagination } = res.body.data;
    expect(pagination.page).toBeDefined();
    expect(pagination.limit).toBeDefined();
    expect(pagination.totalItems).toBeDefined();
    expect(pagination.totalPages).toBeDefined();
  });

  it('pagination — page=1&limit=2 returns 2 results', async () => {
    const res = await request(app)
      .get('/api/v1/applications?page=1&limit=2')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.applications.length).toBe(2);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(2);
  });

  it('pagination — page=2&limit=2 returns different results than page=1', async () => {
    const page1 = await request(app)
      .get('/api/v1/applications?page=1&limit=2')
      .set('Cookie', authCookie);
    const page2 = await request(app)
      .get('/api/v1/applications?page=2&limit=2')
      .set('Cookie', authCookie);

    const ids1 = page1.body.data.applications.map((a) => a.id);
    const ids2 = page2.body.data.applications.map((a) => a.id);
    expect(ids1).not.toEqual(ids2);
  });

  it('filter — status=interview returns only interview applications', async () => {
    const res = await request(app)
      .get('/api/v1/applications?status=interview')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    const apps = res.body.data.applications;
    expect(apps.length).toBeGreaterThan(0);
    apps.forEach((a) => expect(a.status).toBe('interview'));
  });

  it('search — search=alpha matches company name case-insensitively', async () => {
    const res = await request(app)
      .get('/api/v1/applications?search=alpha')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    const apps = res.body.data.applications;
    expect(apps.length).toBeGreaterThan(0);
    apps.forEach((a) =>
      expect(a.company.toLowerCase() + a.role.toLowerCase()).toMatch(/alpha/)
    );
  });

  it('search — search=fullstack matches role name', async () => {
    const res = await request(app)
      .get('/api/v1/applications?search=full+stack')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.applications.length).toBeGreaterThan(0);
  });

  it('sortOrder — sortBy=company&sortOrder=asc returns ascending order', async () => {
    const res = await request(app)
      .get('/api/v1/applications?sortBy=company&sortOrder=asc&limit=100')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    const companies = res.body.data.applications.map((a) => a.company);
    const sorted = [...companies].sort((a, b) => a.localeCompare(b));
    expect(companies).toEqual(sorted);
  });

  it('sortOrder — sortBy=company&sortOrder=desc returns descending order', async () => {
    const res = await request(app)
      .get('/api/v1/applications?sortBy=company&sortOrder=desc&limit=100')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    const companies = res.body.data.applications.map((a) => a.company);
    const sorted = [...companies].sort((a, b) => b.localeCompare(a));
    expect(companies).toEqual(sorted);
  });

  it('401 — no cookie returns NOT_AUTHENTICATED', async () => {
    const res = await request(app).get('/api/v1/applications');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  it('400 — invalid status filter returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .get('/api/v1/applications?status=invalid')
      .set('Cookie', authCookie);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid sortBy returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .get('/api/v1/applications?sortBy=password')
      .set('Cookie', authCookie);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid sortOrder returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .get('/api/v1/applications?sortOrder=random')
      .set('Cookie', authCookie);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('only returns applications belonging to the authenticated user', async () => {
    // Register a second user with their own application
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Other User', email: 'otherappuser@example.com', password: 'Password123!' });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'otherappuser@example.com', password: 'Password123!' });
    const otherCookie = loginRes.headers['set-cookie'];
    await createApp(otherCookie, { company: 'Other Corp', role: 'Other Role' });

    // User A's list must not contain Other Corp
    const res = await request(app)
      .get('/api/v1/applications?limit=100')
      .set('Cookie', authCookie);

    const companies = res.body.data.applications.map((a) => a.company);
    expect(companies).not.toContain('Other Corp');
  });
});


// ─── PATCH /api/v1/applications/:applicationId ───────────────────────────────

describe('PATCH /api/v1/applications/:applicationId', () => {
  let testAppId;

  beforeAll(async () => {
    const app = await createApp(authCookie, { company: 'Patch Corp', role: 'Patch Engineer', status: 'applied' });
    testAppId = app.id;
  });

  it('200 — updates status and notes', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${testAppId}`)
      .set('Cookie', authCookie)
      .send({ status: 'interview', notes: 'Technical interview scheduled.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { application } = res.body.data;
    expect(application.status).toBe('interview');
    expect(application.notes).toBe('Technical interview scheduled.');
    // Untouched fields preserved
    expect(application.company).toBe('Patch Corp');
    expect(application.role).toBe('Patch Engineer');
  });

  it('200 — updatedAt changes after update', async () => {
    const before = await request(app)
      .get(`/api/v1/applications/${testAppId}`)
      .set('Cookie', authCookie);

    await new Promise((r) => setTimeout(r, 10)); // ensure timestamp differs

    const res = await request(app)
      .patch(`/api/v1/applications/${testAppId}`)
      .set('Cookie', authCookie)
      .send({ status: 'offer' });

    const oldUpdatedAt = new Date(before.body.data.application.updatedAt);
    const newUpdatedAt = new Date(res.body.data.application.updatedAt);

    expect(newUpdatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
    expect(res.body.data.application.status).toBe('offer');
  });

  it('404 — nonexistent applicationId returns APPLICATION_NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/api/v1/applications/${fakeId}`)
      .set('Cookie', authCookie)
      .send({ status: 'rejected' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('401 — no cookie returns NOT_AUTHENTICATED', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${testAppId}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  it('400 — empty body returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${testAppId}`)
      .set('Cookie', authCookie)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid status returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${testAppId}`)
      .set('Cookie', authCookie)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'status')).toBe(true);
  });

  it('400 — invalid jobUrl returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${testAppId}`)
      .set('Cookie', authCookie)
      .send({ jobUrl: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'jobUrl')).toBe(true);
  });

  it('400 — client cannot set userId, id, createdAt, updatedAt', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const fakeDate = '2020-01-01T00:00:00.000Z';

    const res = await request(app)
      .patch(`/api/v1/applications/${testAppId}`)
      .set('Cookie', authCookie)
      .send({
        status: 'withdrawn',
        userId: fakeId,
        id: fakeId,
        createdAt: fakeDate,
        updatedAt: fakeDate,
      });

    expect(res.status).toBe(200);
    const { application } = res.body.data;
    // Server-managed fields are stripped by Joi and ignored
    expect(application.userId).not.toBe(fakeId);
    expect(application.id).toBe(testAppId);
    expect(new Date(application.createdAt).toISOString()).not.toBe(fakeDate);
  });

  it('cross-user — cannot PATCH another user\'s application', async () => {
    // Register a second user
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Patcher B', email: 'patcherb@example.com', password: 'Password123!' });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'patcherb@example.com', password: 'Password123!' });
    const otherCookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .patch(`/api/v1/applications/${testAppId}`)
      .set('Cookie', otherCookie)
      .send({ status: 'rejected' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });
});


// ─── DELETE /api/v1/applications/:applicationId ──────────────────────────────

describe('DELETE /api/v1/applications/:applicationId', () => {
  let deleteAppId;

  beforeAll(async () => {
    const app = await createApp(authCookie, { company: 'Delete Corp', role: 'Delete Engineer', status: 'applied' });
    deleteAppId = app.id;
  });

  it('204 — deletes the application, no body returned', async () => {
    const res = await request(app)
      .delete(`/api/v1/applications/${deleteAppId}`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('404 — second delete returns APPLICATION_NOT_FOUND', async () => {
    const res = await request(app)
      .delete(`/api/v1/applications/${deleteAppId}`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('404 — nonexistent ID returns APPLICATION_NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/api/v1/applications/${fakeId}`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('401 — no cookie returns NOT_AUTHENTICATED', async () => {
    const res = await request(app)
      .delete(`/api/v1/applications/${deleteAppId}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  it('cross-user — cannot DELETE another user\'s application', async () => {
    // User A creates an app
    const myApp = await createApp(authCookie, { company: 'Cross Delete Corp', role: 'Engineer' });

    // User B tries to delete it
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Deleter B', email: 'deleterb@example.com', password: 'Password123!' });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'deleterb@example.com', password: 'Password123!' });
    const otherCookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .delete(`/api/v1/applications/${myApp.id}`)
      .set('Cookie', otherCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');

    // Verify it still exists for User A
    const verifyRes = await request(app)
      .get(`/api/v1/applications/${myApp.id}`)
      .set('Cookie', authCookie);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.application.company).toBe('Cross Delete Corp');
  });
});


// ─── DELETE cascade — interviews deleted with application ───────────────────

describe('DELETE /api/v1/applications/:applicationId — cascade deletes interviews', () => {
  let cascadeAppId;
  let cascadeInterviewId;

  beforeAll(async () => {
    // Create an application
    const appRes = await createApp(authCookie, { company: 'Cascade Corp', role: 'Cascade Engineer' });
    cascadeAppId = appRes.id;

    // Create an interview on that application
    const interviewRes = await request(app)
      .post(`/api/v1/applications/${cascadeAppId}/interviews`)
      .set('Cookie', authCookie)
      .send({ roundName: 'Cascade Round', scheduledAt: '2026-11-01T09:00:00.000Z' });
    cascadeInterviewId = interviewRes.body.data.interview.id;
  });

  it('204 — deletes the application', async () => {
    const res = await request(app)
      .delete(`/api/v1/applications/${cascadeAppId}`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(204);
  });

  it('associated interview is also deleted (cascade)', async () => {
    // Check the interview no longer exists via PATCH (should 404)
    const res = await request(app)
      .patch(`/api/v1/interviews/${cascadeInterviewId}`)
      .set('Cookie', authCookie)
      .send({ result: 'passed' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INTERVIEW_NOT_FOUND');
  });

  it('interview count in DB is 0 for the deleted application', async () => {
    const count = await mongoose.connection
      .collection('interviews')
      .countDocuments({ applicationId: new mongoose.Types.ObjectId(cascadeAppId) });

    expect(count).toBe(0);
  });
});
