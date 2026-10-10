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
    .send({ name: 'Interview User', email: 'interviewuser@example.com', password: 'Password123!' });

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'interviewuser@example.com', password: 'Password123!' });

  authCookie = loginRes.headers['set-cookie'];

  // Create an application to attach interviews to
  const appRes = await request(app)
    .post('/api/v1/applications')
    .set('Cookie', authCookie)
    .send({ company: 'Interview Corp', role: 'Software Engineer', status: 'applied' });

  applicationId = appRes.body.data.application.id;
});

afterAll(async () => {
  await mongoose.connection.collection('interviews').deleteMany({});
  await mongoose.connection.collection('applications').deleteMany({});
  await mongoose.connection.collection('users').deleteMany({ email: 'interviewuser@example.com' });
  await mongoose.disconnect();
});

// ─── POST /api/v1/applications/:applicationId/interviews ───────────────────────

describe('POST /api/v1/applications/:applicationId/interviews', () => {
  const validPayload = {
    roundName: 'Technical Interview',
    scheduledAt: '2026-10-15T09:00:00.000Z',
    meetingUrl: 'https://meet.example.com/abc123',
    notes: 'Review data structures and algorithms.',
  };

  it('201 — creates interview with all fields', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const { interview } = res.body.data;
    expect(interview.id).toBeDefined();
    expect(interview.applicationId).toBe(applicationId);
    expect(interview.roundName).toBe('Technical Interview');
    expect(interview.scheduledAt).toBe('2026-10-15T09:00:00.000Z');
    expect(interview.meetingUrl).toBe('https://meet.example.com/abc123');
    expect(interview.notes).toBe('Review data structures and algorithms.');
    expect(interview.result).toBe('pending'); // default
    expect(interview.createdAt).toBeDefined();
    expect(interview.updatedAt).toBeDefined();
  });

  it('201 — creates interview with only required fields (roundName, scheduledAt)', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send({ roundName: 'HR Round', scheduledAt: '2026-10-16T10:00:00.000Z' });

    expect(res.status).toBe(201);
    const { interview } = res.body.data;
    expect(interview.roundName).toBe('HR Round');
    expect(interview.result).toBe('pending');
    expect(interview.meetingUrl).toBeUndefined();
    expect(interview.notes).toBeUndefined();
  });

  it('result defaults to pending', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send({ roundName: 'Manager Round', scheduledAt: '2026-10-17T14:00:00.000Z' });

    expect(res.body.data.interview.result).toBe('pending');
  });

  it('401 — no cookie returns NOT_AUTHENTICATED', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .send(validPayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  it('404 — nonexistent application returns APPLICATION_NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post(`/api/v1/applications/${fakeId}/interviews`)
      .set('Cookie', authCookie)
      .send(validPayload);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('400 — missing roundName returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send({ scheduledAt: '2026-10-15T09:00:00.000Z' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'roundName')).toBe(true);
  });

  it('400 — missing scheduledAt returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send({ roundName: 'Technical Interview' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'scheduledAt')).toBe(true);
  });

  it('400 — invalid scheduledAt format returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send({ roundName: 'Technical Interview', scheduledAt: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'scheduledAt')).toBe(true);
  });

  it('400 — invalid meetingUrl returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send({ roundName: 'Technical Interview', scheduledAt: '2026-10-15T09:00:00.000Z', meetingUrl: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'meetingUrl')).toBe(true);
  });

  it('cross-user — cannot create interview on another user\'s application', async () => {
    // Register a second user
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Other Interviewer', email: 'otherinterviewer@example.com', password: 'Password123!' });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'otherinterviewer@example.com', password: 'Password123!' });
    const otherCookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', otherCookie)
      .send(validPayload);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });
});


// ─── GET /api/v1/applications/:applicationId/interviews ───────────────────────

describe('GET /api/v1/applications/:applicationId/interviews', () => {
  beforeAll(async () => {
    // Seed multiple interviews
    await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send({ roundName: 'HR Screening', scheduledAt: '2026-10-12T09:00:00.000Z', notes: 'Initial call.' });

    await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send({ roundName: 'Technical Round', scheduledAt: '2026-10-14T10:00:00.000Z', notes: 'Coding test.' });

    await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send({ roundName: 'Manager Round', scheduledAt: '2026-10-16T14:00:00.000Z', notes: 'Final round.' });
  });

  it('200 — returns all interviews for the application', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.interviews)).toBe(true);
    expect(res.body.data.interviews.length).toBeGreaterThanOrEqual(3);
  });

  it('interviews are sorted by scheduledAt ascending', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie);

    const dates = res.body.data.interviews.map((i) => new Date(i.scheduledAt).getTime());
    const sorted = [...dates].sort((a, b) => a - b);
    expect(dates).toEqual(sorted);
  });

  it('each interview has the correct shape', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie);

    const interview = res.body.data.interviews[0];
    expect(interview.id).toBeDefined();
    expect(interview.applicationId).toBe(applicationId);
    expect(interview.roundName).toBeDefined();
    expect(interview.scheduledAt).toBeDefined();
    expect(interview.result).toBeDefined();
    expect(interview.createdAt).toBeDefined();
    expect(interview.updatedAt).toBeDefined();
  });

  it('401 — no cookie returns NOT_AUTHENTICATED', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${applicationId}/interviews`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  it('404 — nonexistent application returns APPLICATION_NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/v1/applications/${fakeId}/interviews`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('cross-user — cannot list interviews on another user\'s application', async () => {
    // Register a second user
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Lister B', email: 'listerb@example.com', password: 'Password123!' });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'listerb@example.com', password: 'Password123!' });
    const otherCookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .get(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', otherCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });
});


// ─── PATCH /api/v1/interviews/:interviewId ─────────────────────────────────────

describe('PATCH /api/v1/interviews/:interviewId', () => {
  let interviewId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send({ roundName: 'Patch Round', scheduledAt: '2026-10-20T09:00:00.000Z', notes: 'Before update.' });
    interviewId = res.body.data.interview.id;
  });

  it('200 — updates scheduledAt and result', async () => {
    const res = await request(app)
      .patch(`/api/v1/interviews/${interviewId}`)
      .set('Cookie', authCookie)
      .send({ scheduledAt: '2026-10-16T09:00:00.000Z', result: 'passed' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { interview } = res.body.data;
    expect(interview.scheduledAt).toBe('2026-10-16T09:00:00.000Z');
    expect(interview.result).toBe('passed');
    expect(interview.roundName).toBe('Patch Round');
  });

  it('200 — updates meetingUrl and notes', async () => {
    const res = await request(app)
      .patch(`/api/v1/interviews/${interviewId}`)
      .set('Cookie', authCookie)
      .send({ meetingUrl: 'https://meet.example.com/updated', notes: 'After update.' });

    expect(res.status).toBe(200);
    expect(res.body.data.interview.meetingUrl).toBe('https://meet.example.com/updated');
    expect(res.body.data.interview.notes).toBe('After update.');
  });

  it('200 — updatedAt changes after update', async () => {
    const before = await request(app)
      .get(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie);
    const target = before.body.data.interviews.find((i) => i.id === interviewId);

    await new Promise((r) => setTimeout(r, 10));

    const res = await request(app)
      .patch(`/api/v1/interviews/${interviewId}`)
      .set('Cookie', authCookie)
      .send({ result: 'failed' });

    const oldUpdatedAt = new Date(target.updatedAt);
    const newUpdatedAt = new Date(res.body.data.interview.updatedAt);
    expect(newUpdatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
  });

  it('404 — nonexistent interview returns INTERVIEW_NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/api/v1/interviews/${fakeId}`)
      .set('Cookie', authCookie)
      .send({ result: 'cancelled' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INTERVIEW_NOT_FOUND');
  });

  it('401 — no cookie returns NOT_AUTHENTICATED', async () => {
    const res = await request(app)
      .patch(`/api/v1/interviews/${interviewId}`)
      .send({ result: 'cancelled' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  it('400 — empty body returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .patch(`/api/v1/interviews/${interviewId}`)
      .set('Cookie', authCookie)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid result returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .patch(`/api/v1/interviews/${interviewId}`)
      .set('Cookie', authCookie)
      .send({ result: 'invalid_result' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'result')).toBe(true);
  });

  it('400 — invalid scheduledAt returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .patch(`/api/v1/interviews/${interviewId}`)
      .set('Cookie', authCookie)
      .send({ scheduledAt: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'scheduledAt')).toBe(true);
  });

  it('400 — invalid meetingUrl returns VALIDATION_ERROR', async () => {
    const res = await request(app)
      .patch(`/api/v1/interviews/${interviewId}`)
      .set('Cookie', authCookie)
      .send({ meetingUrl: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'meetingUrl')).toBe(true);
  });

  it('cross-user — cannot PATCH another user\'s interview', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Patcher X', email: 'patcherx@example.com', password: 'Password123!' });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'patcherx@example.com', password: 'Password123!' });
    const otherCookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .patch(`/api/v1/interviews/${interviewId}`)
      .set('Cookie', otherCookie)
      .send({ result: 'cancelled' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INTERVIEW_NOT_FOUND');
  });
});


// ─── DELETE /api/v1/interviews/:interviewId ───────────────────────────────────

describe('DELETE /api/v1/interviews/:interviewId', () => {
  let deleteInterviewId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send({ roundName: 'Delete Round', scheduledAt: '2026-10-25T09:00:00.000Z' });
    deleteInterviewId = res.body.data.interview.id;
  });

  it('204 — deletes the interview, no body returned', async () => {
    const res = await request(app)
      .delete(`/api/v1/interviews/${deleteInterviewId}`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('404 — second delete returns INTERVIEW_NOT_FOUND', async () => {
    const res = await request(app)
      .delete(`/api/v1/interviews/${deleteInterviewId}`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INTERVIEW_NOT_FOUND');
  });

  it('404 — nonexistent ID returns INTERVIEW_NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/api/v1/interviews/${fakeId}`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INTERVIEW_NOT_FOUND');
  });

  it('401 — no cookie returns NOT_AUTHENTICATED', async () => {
    const res = await request(app)
      .delete(`/api/v1/interviews/${deleteInterviewId}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  it('cross-user — cannot DELETE another user\'s interview', async () => {
    // Create an interview as the main user
    const createRes = await request(app)
      .post(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie)
      .send({ roundName: 'Cross Delete Round', scheduledAt: '2026-10-26T09:00:00.000Z' });
    const myInterviewId = createRes.body.data.interview.id;

    // Register a second user and try to delete it
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Deleter Y', email: 'deletery@example.com', password: 'Password123!' });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'deletery@example.com', password: 'Password123!' });
    const otherCookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .delete(`/api/v1/interviews/${myInterviewId}`)
      .set('Cookie', otherCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INTERVIEW_NOT_FOUND');

    // Verify it still exists for the owner
    const listRes = await request(app)
      .get(`/api/v1/applications/${applicationId}/interviews`)
      .set('Cookie', authCookie);

    expect(listRes.status).toBe(200);
    const stillExists = listRes.body.data.interviews.some((i) => i.id === myInterviewId);
    expect(stillExists).toBe(true);
  });
});
