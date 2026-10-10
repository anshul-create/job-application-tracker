import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/job-tracker-test';

let authCookie;
let applicationId;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);

  // Register + login
  await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Dashboard User', email: 'dashboarduser@example.com', password: 'Password123!' });

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'dashboarduser@example.com', password: 'Password123!' });

  authCookie = loginRes.headers['set-cookie'];

  // Seed applications with various statuses
  const statuses = [
    { company: 'Corp A', role: 'Dev A', status: 'saved' },
    { company: 'Corp B', role: 'Dev B', status: 'applied' },
    { company: 'Corp C', role: 'Dev C', status: 'applied' },
    { company: 'Corp D', role: 'Dev D', status: 'interview' },
    { company: 'Corp E', role: 'Dev E', status: 'offer' },
  ];

  for (const s of statuses) {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Cookie', authCookie)
      .send(s);
    if (s.status === 'interview') {
      applicationId = res.body.data.application.id;
    }
  }

  // Seed an upcoming interview (future date, pending result)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);

  await request(app)
    .post(`/api/v1/applications/${applicationId}/interviews`)
    .set('Cookie', authCookie)
    .send({
      roundName: 'Technical Interview',
      scheduledAt: futureDate.toISOString(),
      meetingUrl: 'https://meet.example.com/abc',
      notes: 'Prepare well.',
    });
});

afterAll(async () => {
  await mongoose.connection.collection('interviews').deleteMany({});
  await mongoose.connection.collection('applications').deleteMany({});
  await mongoose.connection.collection('users').deleteMany({ email: 'dashboarduser@example.com' });
  await mongoose.disconnect();
});

// ─── GET /api/v1/dashboard/summary ───────────────────────────────────────────

describe('GET /api/v1/dashboard/summary', () => {
  it('200 — returns correct total applications', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalApplications).toBe(5);
  });

  it('statusCounts — returns counts for all 7 statuses', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Cookie', authCookie);

    const { statusCounts } = res.body.data;
    expect(statusCounts.saved).toBe(1);
    expect(statusCounts.applied).toBe(2);
    expect(statusCounts.interview).toBe(1);
    expect(statusCounts.offer).toBe(1);
    expect(statusCounts.rejected).toBe(0);
    expect(statusCounts.withdrawn).toBe(0);
    expect(statusCounts.online_assessment).toBe(0);
  });

  it('upcomingInterviews — only returns future + pending interviews', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Cookie', authCookie);

    const { upcomingInterviews } = res.body.data;
    expect(Array.isArray(upcomingInterviews)).toBe(true);
    expect(upcomingInterviews.length).toBeGreaterThanOrEqual(1);

    const now = new Date();
    upcomingInterviews.forEach((i) => {
      expect(new Date(i.scheduledAt).getTime()).toBeGreaterThan(now.getTime() - 1000);
    });
  });

  it('upcomingInterviews — each item has correct shape', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Cookie', authCookie);

    const interview = res.body.data.upcomingInterviews[0];
    expect(interview.id).toBeDefined();
    expect(interview.applicationId).toBeDefined();
    expect(interview.company).toBeDefined();
    expect(interview.role).toBeDefined();
    expect(interview.roundName).toBeDefined();
    expect(interview.scheduledAt).toBeDefined();
  });

  it('upcomingInterviews — enriched with company and role from application', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Cookie', authCookie);

    const interview = res.body.data.upcomingInterviews.find(
      (i) => i.applicationId === applicationId
    );
    expect(interview).toBeDefined();
    expect(interview.company).toBe('Corp D');
    expect(interview.role).toBe('Dev D');
    expect(interview.roundName).toBe('Technical Interview');
  });

  it('401 — no cookie returns NOT_AUTHENTICATED', async () => {
    const res = await request(app).get('/api/v1/dashboard/summary');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  it('cross-user — only counts the authenticated user\'s data', async () => {
    // Register a second user with no applications
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Empty User', email: 'emptyuser@example.com', password: 'Password123!' });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'emptyuser@example.com', password: 'Password123!' });
    const otherCookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Cookie', otherCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.totalApplications).toBe(0);
    expect(res.body.data.upcomingInterviews).toEqual([]);

    // Cleanup
    await mongoose.connection.collection('users').deleteMany({ email: 'emptyuser@example.com' });
  });
});
