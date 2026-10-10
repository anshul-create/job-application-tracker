import 'dotenv/config';
import mongoose from 'mongoose';

const BASE = 'http://localhost:5000/api/v1';

async function post(path, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, data, cookie: res.headers.get('set-cookie') };
}

async function get(path, cookie) {
  const headers = {};
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${BASE}${path}`, { headers });
  const data = await res.json();
  return { status: res.status, data };
}

// ── connect DB to clean up after ────────────────────────────────────────────
await mongoose.connect(process.env.MONGO_URI);

console.log('=== Cross-User Authorization Test ===\n');

// ── User A: register + login ──────────────────────────────────────────────
const regA = await post('/auth/register', { name: 'User A', email: 'usera_crosstest@example.com', password: 'Password123!' });
const loginA = await post('/auth/login', { email: 'usera_crosstest@example.com', password: 'Password123!' });
const cookieA = loginA.cookie;
console.log(`[User A] Logged in as: ${loginA.data.data.user.email}`);

// ── User A: create an application ─────────────────────────────────────────
const createRes = await post('/applications', { company: 'Secret Corp', role: 'Senior Engineer' }, cookieA);
const appId = createRes.data.data.application.id;
console.log(`[User A] Created application id: ${appId}  company: Secret Corp`);

// ── User B: register + login ──────────────────────────────────────────────
const regB = await post('/auth/register', { name: 'User B', email: 'userb_crosstest@example.com', password: 'Password123!' });
const loginB = await post('/auth/login', { email: 'userb_crosstest@example.com', password: 'Password123!' });
const cookieB = loginB.cookie;
console.log(`[User B] Logged in as: ${loginB.data.data.user.email}`);

// ── User B: attempt to access User A's application ────────────────────────
const accessRes = await get(`/applications/${appId}`, cookieB);
console.log(`\n[User B] GET /applications/${appId}`);
console.log(`  Status : ${accessRes.status}`);
console.log(`  Success: ${accessRes.data.success}`);
console.log(`  Code   : ${accessRes.data.error?.code}`);
console.log(`  Message: ${accessRes.data.error?.message}`);

// ── Result ────────────────────────────────────────────────────────────────
console.log('\n=== Result ===');
if (accessRes.status === 404 && accessRes.data.error?.code === 'APPLICATION_NOT_FOUND') {
  console.log('✅ PASS — User B cannot access User A\'s application. Authorization enforced.');
} else {
  console.log('❌ FAIL — User B accessed User A\'s application. Authorization is broken!');
}

// ── cleanup ───────────────────────────────────────────────────────────────
await mongoose.connection.collection('applications').deleteMany({ company: 'Secret Corp' });
await mongoose.connection.collection('users').deleteMany({ email: /crosstest/ });
await mongoose.disconnect();
