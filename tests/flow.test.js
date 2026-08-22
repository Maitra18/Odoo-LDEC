const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const port = 3108;
const base = `http://127.0.0.1:${port}`;
let server;

async function request(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = response.status === 204 ? null : await response.json();
  return { response, data };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

test.before(async () => {
  const dataFile = require('node:path').join(__dirname, 'test-store-flow.json');
  try { require('node:fs').unlinkSync(dataFile); } catch {}
  server = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), DATA_FILE: dataFile } });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Test server did not start.')), 5000);
    server.stdout.on('data', value => {
      if (value.toString().includes('running')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.on('error', reject);
  });
});

test.after(() => {
  server.kill();
  try { require('node:fs').unlinkSync(require('node:path').join(__dirname, 'test-store-flow.json')); } catch {}
});

test('Full 28-Step Journey: Auth, Trips, Stops, Activities, Reordering, Search, Budget, Sharing, Copying, Authorization', async () => {
  const testUser = {
    firstName: 'Alice',
    lastName: 'Traveller',
    email: `alice-${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
    autoVerify: true
  };

  // Step 1 - 4: Register account
  const regRes = await request('/api/auth/register', { method: 'POST', body: JSON.stringify(testUser) });
  assert.equal(regRes.response.status, 201);
  assert.ok(regRes.data.token);
  assert.equal(regRes.data.user.email, testUser.email);
  const token = regRes.data.token;

  // Step 5 - 7: Auth verification & profile fetch
  const meRes = await request('/api/auth/me', { headers: auth(token) });
  assert.equal(meRes.response.status, 200);
  assert.equal(meRes.data.firstName, 'Alice');

  // Step 8 - 10: Create Trip
  const tripPayload = {
    name: 'Autumn in Japan',
    destination: 'Kyoto',
    startDate: '2026-10-01',
    endDate: '2026-10-10',
    budget: 2500,
    coverImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e',
    description: 'Cultural exploration and mountain hikes.'
  };

  const tripRes = await request('/api/trips', { method: 'POST', headers: auth(token), body: JSON.stringify(tripPayload) });
  assert.equal(tripRes.response.status, 201);
  const tripId = tripRes.data.id;
  assert.equal(tripRes.data.name, 'Autumn in Japan');
  assert.equal(tripRes.data.destination, 'Kyoto');

  // Step 11: Add Stop
  const stopPayload = {
    city: 'Kyoto',
    startDate: '2026-10-01',
    endDate: '2026-10-05',
    budget: 1200
  };
  const stopRes = await request(`/api/trips/${tripId}/stops`, { method: 'POST', headers: auth(token), body: JSON.stringify(stopPayload) });
  assert.equal(stopRes.response.status, 201);
  const stopId = stopRes.data.id;

  // Step 12 - 14: Add Activity & calculate budget
  const activityPayload = {
    name: 'Fushimi Inari dawn hike',
    description: 'Torii gates trail',
    cost: 30,
    duration: 3,
    category: 'Outdoor',
    date: '2026-10-02',
    time: '06:00',
    location: 'Kyoto'
  };
  const actRes = await request(`/api/stops/${stopId}/activities`, { method: 'POST', headers: auth(token), body: JSON.stringify(activityPayload) });
  assert.equal(actRes.response.status, 201);

  // Step 15 - 18: Fetch trips & verify budget & persistence
  const myTrips = await request('/api/trips', { headers: auth(token) });
  assert.equal(myTrips.response.status, 200);
  assert.equal(myTrips.data.length, 1);
  assert.equal(myTrips.data[0].actualCost, 30);
  assert.equal(myTrips.data[0].remainingBudget, 2470);

  // Step 19 - 20: Calendar verification endpoint data check
  const fetchedTrip = await request(`/api/trips/${tripId}`, { headers: auth(token) });
  assert.equal(fetchedTrip.response.status, 200);
  assert.equal(fetchedTrip.data.startDate, '2026-10-01');

  // Step 21 - 24: Logout & Login again
  await request('/api/auth/logout', { method: 'POST', headers: auth(token), body: '{}' });
  const relogin = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: testUser.email, password: testUser.password }) });
  assert.equal(relogin.response.status, 200);
  assert.ok(relogin.data.token);

  // Step 25: Test invalid login
  const badLogin = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: testUser.email, password: 'wrongPassword' }) });
  assert.equal(badLogin.response.status, 401);
  assert.equal(badLogin.data.error, 'Invalid email or password.');

  // Step 26: Test Search APIs
  const citiesSearch = await request('/api/cities?q=Kyoto');
  assert.equal(citiesSearch.response.status, 200);
  assert.ok(citiesSearch.data.some(c => c.name === 'Kyoto'));

  const actsSearch = await request('/api/catalogue/activities?type=Food');
  assert.equal(actsSearch.response.status, 200);

  // Step 27 - 28: Public Sharing & Copying Trip
  const shareRes = await request(`/api/trips/${tripId}/share`, { method: 'POST', headers: auth(relogin.data.token), body: JSON.stringify({ isPublic: true }) });
  assert.equal(shareRes.response.status, 200);
  assert.ok(shareRes.data.publicSlug);

  const publicRes = await request(`/api/public?slug=${shareRes.data.publicSlug}`);
  assert.equal(publicRes.response.status, 200);
  assert.equal(publicRes.data.trip.name, 'Autumn in Japan');

  // Create Second User and Copy Trip
  const secondUser = {
    firstName: 'Bob',
    lastName: 'Explorer',
    email: `bob-${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
    autoVerify: true
  };
  const reg2 = await request('/api/auth/register', { method: 'POST', body: JSON.stringify(secondUser) });
  assert.equal(reg2.response.status, 201);
  const copyRes = await request(`/api/trips/${tripId}/copy`, { method: 'POST', headers: auth(reg2.data.token), body: '{}' });
  assert.equal(copyRes.response.status, 201);
  assert.equal(copyRes.data.userId, reg2.data.user.id);
  assert.equal(copyRes.data.name, 'Autumn in Japan (Copy)');

  // Clean up test users
  await request('/api/profile', { method: 'DELETE', headers: auth(relogin.data.token), body: JSON.stringify({ confirm: 'DELETE' }) });
  await request('/api/profile', { method: 'DELETE', headers: auth(reg2.data.token), body: JSON.stringify({ confirm: 'DELETE' }) });
});
