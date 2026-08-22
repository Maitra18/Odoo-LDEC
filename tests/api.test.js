const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const port = 3107;
const base = `http://127.0.0.1:${port}`;
let server;
async function request(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = response.status === 204 ? null : await response.json();
  return { response, data };
}
async function createUser(label) {
  const result = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ firstName: label, lastName: 'Traveller', email: `${label}-${Date.now()}@example.com`, password: 'SecurePassword123!', confirmPassword: 'SecurePassword123!', autoVerify: true }) });
  assert.equal(result.response.status, 201);
  return result.data;
}
const crypto = require('node:crypto');

function base32Decode(base32Str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanStr = String(base32Str || '').toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0, value = 0;
  const output = [];
  for (let i = 0; i < cleanStr.length; i++) {
    const idx = alphabet.indexOf(cleanStr[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateTOTP(secretBase32, timeStep = Math.floor(Date.now() / 1000 / 30)) {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(timeStep), 0);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const codeInt = ((hmac[offset] & 0x7f) << 24) |
                  ((hmac[offset + 1] & 0xff) << 16) |
                  ((hmac[offset + 2] & 0xff) << 8) |
                  (hmac[offset + 3] & 0xff);
  return (codeInt % 1000000).toString().padStart(6, '0');
}

function auth(token) { return { Authorization: `Bearer ${token}` }; }

test.before(async () => {
  const dataFile = require('node:path').join(__dirname, 'test-store-api.json');
  try { require('node:fs').unlinkSync(dataFile); } catch {}
  server = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), DATA_FILE: dataFile } });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Test server did not start.')), 5000); server.stdout.on('data', value => { if (value.toString().includes('running')) { clearTimeout(timer); resolve(); } }); server.on('error', reject); });
});
test.after(() => {
  server.kill();
  try { require('node:fs').unlinkSync(require('node:path').join(__dirname, 'test-store-api.json')); } catch {}
});

test('a registered account can log out, return to login, and authenticate again', async () => {
  const email = `login-flow-${Date.now()}@example.com`;
  const password = 'SecurePassword123!';
  const register = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ firstName: 'Login', lastName: 'Flow', email, password, confirmPassword: password, autoVerify: true }) });
  assert.equal(register.response.status, 201);
  assert.ok(register.data.token);
  const current = await request('/api/auth/me', { headers: auth(register.data.token) });
  assert.equal(current.response.status, 200);
  assert.equal(current.data.email, email);
  const logout = await request('/api/auth/logout', { method: 'POST', headers: auth(register.data.token), body: '{}' });
  assert.equal(logout.response.status, 204);
  const afterLogout = await request('/api/auth/me', { headers: auth(register.data.token) });
  assert.equal(afterLogout.response.status, 401);
  const invalid = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'WrongPassword123!' }) });
  assert.equal(invalid.response.status, 401);
  assert.equal(invalid.data.error, 'Invalid email or password.');
  const login = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  assert.equal(login.response.status, 200);
  assert.equal(login.data.user.email, email);
  await request('/api/profile', { method: 'DELETE', headers: auth(login.data.token), body: JSON.stringify({ confirm: 'DELETE' }) });
});

test('a user can persist a complete trip flow across logout and login', async () => {
  const email = `trip-flow-${Date.now()}@example.com`;
  const password = 'SecurePassword123!';
  const badRegistration = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ firstName: 'Trip', lastName: 'Flow', email: `mismatch-${Date.now()}@example.com`, password, confirmPassword: 'DifferentPassword123!' }) });
  assert.equal(badRegistration.response.status, 422);
  assert.equal(badRegistration.data.error, 'Passwords do not match.');
  const registration = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ firstName: 'Trip', lastName: 'Flow', email, password, confirmPassword: password, autoVerify: true, city: 'Delhi', country: 'India' }) });
  assert.equal(registration.response.status, 201);
  const headers = auth(registration.data.token);
  const tripResponse = await request('/api/trips', { method: 'POST', headers, body: JSON.stringify({ name: 'Lisbon itinerary', destination: 'Lisbon', startDate: '2026-10-02', endDate: '2026-10-05', budget: 700 }) });
  assert.equal(tripResponse.response.status, 201);
  const stopResponse = await request(`/api/trips/${tripResponse.data.id}/stops`, { method: 'POST', headers, body: JSON.stringify({ city: 'Lisbon', startDate: '2026-10-02', endDate: '2026-10-05', budget: 500 }) });
  assert.equal(stopResponse.response.status, 201);
  const activityResponse = await request(`/api/stops/${stopResponse.data.id}/activities`, { method: 'POST', headers, body: JSON.stringify({ name: 'Old town food walk', date: '2026-10-03', time: '10:00', cost: 55, duration: 3, category: 'Food' }) });
  assert.equal(activityResponse.response.status, 201);
  const savedTrips = await request('/api/trips', { headers });
  assert.equal(savedTrips.data.length, 1);
  assert.equal(savedTrips.data[0].actualCost, 55);
  assert.equal(savedTrips.data[0].startDate, '2026-10-02');
  const profile = await request('/api/profile', { method: 'PATCH', headers, body: JSON.stringify({ city: 'Mumbai', language: 'English' }) });
  assert.equal(profile.data.city, 'Mumbai');
  const destinations = await request('/api/cities?q=Lisbon');
  const catalogue = await request('/api/catalogue/activities?type=Food');
  assert.ok(destinations.data.some(city => city.name === 'Lisbon'));
  assert.ok(catalogue.data.every(activity => activity.category === 'Food'));
  await request('/api/auth/logout', { method: 'POST', headers, body: '{}' });
  const login = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  const persistedTrips = await request('/api/trips', { headers: auth(login.data.token) });
  assert.equal(persistedTrips.data[0].name, 'Lisbon itinerary');
  assert.equal(persistedTrips.data[0].stops[0].activities[0].name, 'Old town food walk');
  await request('/api/profile', { method: 'DELETE', headers: auth(login.data.token), body: JSON.stringify({ confirm: 'DELETE' }) });
});

test('private itineraries are owner-protected and shared itineraries can be copied', async () => {
  const first = await createUser('First');
  const second = await createUser('Second');
  const tripResult = await request('/api/trips', { method: 'POST', headers: auth(first.token), body: JSON.stringify({ name: 'Private route', destination: 'Lisbon', startDate: '2026-09-01', endDate: '2026-09-03', budget: 400 }) });
  assert.equal(tripResult.response.status, 201);
  const trip = tripResult.data;
  const privateRead = await request(`/api/trips/${trip.id}`, { headers: auth(second.token) });
  assert.equal(privateRead.response.status, 404);
  const stop = await request(`/api/trips/${trip.id}/stops`, { method: 'POST', headers: auth(first.token), body: JSON.stringify({ city: 'Lisbon', startDate: '2026-09-01', endDate: '2026-09-03', budget: 300 }) });
  assert.equal(stop.response.status, 201);
  const activity = await request(`/api/stops/${stop.data.id}/activities`, { method: 'POST', headers: auth(first.token), body: JSON.stringify({ name: 'Food walk', date: '2026-09-01', cost: 45, duration: 2, category: 'Food' }) });
  assert.equal(activity.response.status, 201);
  const share = await request(`/api/trips/${trip.id}/share`, { method: 'POST', headers: auth(first.token), body: JSON.stringify({ isPublic: true }) });
  assert.equal(share.response.status, 200);
  const publicView = await request(`/api/public?slug=${share.data.publicSlug}`);
  assert.equal(publicView.response.status, 200);
  assert.equal(publicView.data.trip.actualCost, 45);
  const copied = await request(`/api/trips/${trip.id}/copy`, { method: 'POST', headers: auth(second.token), body: '{}' });
  assert.equal(copied.response.status, 201);
  assert.equal(copied.data.userId, second.user.id);
  assert.equal(copied.data.stops[0].activities[0].cost, 45);
  await request('/api/profile', { method: 'DELETE', headers: auth(first.token), body: JSON.stringify({ confirm: 'DELETE' }) });
  await request('/api/profile', { method: 'DELETE', headers: auth(second.token), body: JSON.stringify({ confirm: 'DELETE' }) });
});

test('GET /api/analytics returns real user-scoped travel statistics and respects isolation', async () => {
  const u1 = await createUser('AnalyticsUser1');
  const u2 = await createUser('AnalyticsUser2');

  // 1. New user analytics (empty state)
  const emptyAnalytics = await request('/api/analytics', { headers: auth(u1.token) });
  assert.equal(emptyAnalytics.response.status, 200);
  assert.equal(emptyAnalytics.data.totalTrips, 0);
  assert.equal(emptyAnalytics.data.totalSpending, 0);

  // 2. User 1 creates a trip, stop, and activities
  const t1 = await request('/api/trips', {
    method: 'POST',
    headers: auth(u1.token),
    body: JSON.stringify({ name: 'Tokyo Adventure', destination: 'Tokyo', startDate: '2026-11-01', endDate: '2026-11-07', budget: 50000 })
  });
  assert.equal(t1.response.status, 201);

  const s1 = await request(`/api/trips/${t1.data.id}/stops`, {
    method: 'POST',
    headers: auth(u1.token),
    body: JSON.stringify({ city: 'Tokyo', startDate: '2026-11-01', endDate: '2026-11-07', budget: 30000 })
  });
  assert.equal(s1.response.status, 201);

  await request(`/api/stops/${s1.data.id}/activities`, {
    method: 'POST',
    headers: auth(u1.token),
    body: JSON.stringify({ name: 'Ramen Tasting', cost: 2500, date: '2026-11-02', category: 'Food' })
  });
  await request(`/api/stops/${s1.data.id}/activities`, {
    method: 'POST',
    headers: auth(u1.token),
    body: JSON.stringify({ name: 'Temple Tour', cost: 1500, date: '2026-11-03', category: 'Culture' })
  });

  // 3. User 1 analytics verified
  const u1Analytics = await request('/api/analytics', { headers: auth(u1.token) });
  assert.equal(u1Analytics.response.status, 200);
  assert.equal(u1Analytics.data.totalTrips, 1);
  assert.equal(u1Analytics.data.totalStops, 1);
  assert.equal(u1Analytics.data.totalActivities, 2);
  assert.equal(u1Analytics.data.totalBudget, 50000);
  assert.equal(u1Analytics.data.totalSpending, 4000);
  assert.equal(u1Analytics.data.mostPlannedDestination, 'Tokyo');

  // 4. User 2 analytics isolation verified (must still be 0)
  const u2Analytics = await request('/api/analytics', { headers: auth(u2.token) });
  assert.equal(u2Analytics.response.status, 200);
  assert.equal(u2Analytics.data.totalTrips, 0);
  assert.equal(u2Analytics.data.totalSpending, 0);

  // Clean up
  await request('/api/profile', { method: 'DELETE', headers: auth(u1.token), body: JSON.stringify({ confirm: 'DELETE' }) });
  await request('/api/profile', { method: 'DELETE', headers: auth(u2.token), body: JSON.stringify({ confirm: 'DELETE' }) });
});

test('Location Hierarchy Validation: Enforces strict Country -> State -> City parent-child relationships', async () => {
  const user = await createUser('LocationTester');
  const headers = auth(user.token);

  // PASS Cases
  const p1 = await request('/api/trips', { method: 'POST', headers, body: JSON.stringify({ name: 'Vadodara Tour', country: 'India', state: 'Gujarat', city: 'Vadodara', startDate: '2026-11-01', endDate: '2026-11-05' }) });
  assert.equal(p1.response.status, 201);

  const p2 = await request('/api/trips', { method: 'POST', headers, body: JSON.stringify({ name: 'Mumbai Trip', country: 'India', state: 'Maharashtra', city: 'Mumbai', startDate: '2026-11-01', endDate: '2026-11-05' }) });
  assert.equal(p2.response.status, 201);

  const p3 = await request('/api/trips', { method: 'POST', headers, body: JSON.stringify({ name: 'Melbourne Trip', country: 'Australia', state: 'Victoria', city: 'Melbourne', startDate: '2026-11-01', endDate: '2026-11-05' }) });
  assert.equal(p3.response.status, 201);

  const p4 = await request('/api/trips', { method: 'POST', headers, body: JSON.stringify({ name: 'Sydney Escape', country: 'Australia', state: 'New South Wales', city: 'Sydney', startDate: '2026-11-01', endDate: '2026-11-05' }) });
  assert.equal(p4.response.status, 201);

  const p5 = await request('/api/trips', { method: 'POST', headers, body: JSON.stringify({ name: 'Tokyo Visit', country: 'Japan', state: 'Tokyo', city: 'Tokyo', startDate: '2026-11-01', endDate: '2026-11-05' }) });
  assert.equal(p5.response.status, 201);

  // FAIL Cases (Must return 400 Bad Request)
  const f1 = await request('/api/trips', { method: 'POST', headers, body: JSON.stringify({ name: 'Invalid Aus Vadodara', country: 'Australia', state: 'Gujarat', city: 'Vadodara', startDate: '2026-11-01', endDate: '2026-11-05' }) });
  assert.equal(f1.response.status, 400);
  assert.equal(f1.data.error, 'Selected city does not belong to the selected country.');

  const f2 = await request('/api/trips', { method: 'POST', headers, body: JSON.stringify({ name: 'Invalid India Melbourne', country: 'India', state: 'Victoria', city: 'Melbourne', startDate: '2026-11-01', endDate: '2026-11-05' }) });
  assert.equal(f2.response.status, 400);
  assert.equal(f2.data.error, 'Selected city does not belong to the selected country.');

  const f3 = await request('/api/trips', { method: 'POST', headers, body: JSON.stringify({ name: 'Invalid Japan Vadodara', country: 'Japan', state: 'Gujarat', city: 'Vadodara', startDate: '2026-11-01', endDate: '2026-11-05' }) });
  assert.equal(f3.response.status, 400);
  assert.equal(f3.data.error, 'Selected city does not belong to the selected country.');

  const f4 = await request('/api/trips', { method: 'POST', headers, body: JSON.stringify({ name: 'Invalid Aus Mumbai', country: 'Australia', state: 'Maharashtra', city: 'Mumbai', startDate: '2026-11-01', endDate: '2026-11-05' }) });
  assert.equal(f4.response.status, 400);
  assert.equal(f4.data.error, 'Selected city does not belong to the selected country.');

  // FAIL Stop Creation Case (Adding Vadodara stop to Australian trip p3)
  const f5 = await request(`/api/trips/${p3.data.id}/stops`, { method: 'POST', headers, body: JSON.stringify({ country: 'Australia', state: 'Gujarat', city: 'Vadodara', startDate: '2026-11-01', endDate: '2026-11-03' }) });
  assert.equal(f5.response.status, 400);
  assert.equal(f5.data.error, 'Selected city does not belong to the selected country.');

  // Clean up
  await request('/api/profile', { method: 'DELETE', headers, body: JSON.stringify({ confirm: 'DELETE' }) });
});

test('Production Auth System 21-Point Comprehensive Test Suite', async () => {
  const email = `prod-auth-${Date.now()}@example.com`;
  const initialPass = 'InitialPass123!';
  const newPass = 'NewSecretPass123!';

  // 1. Register valid user
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName: 'Prod', lastName: 'Tester', email, password: initialPass, confirmPassword: initialPass })
  });
  assert.equal(regRes.response.status, 201);
  assert.ok(regRes.data.devVerifyLink);
  const verifyToken = regRes.data.rawVerifyToken;

  // 2. Reject invalid email
  const badEmail = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName: 'Bad', lastName: 'Email', email: 'invalid-email-format', password: initialPass, confirmPassword: initialPass })
  });
  assert.equal(badEmail.response.status, 422);

  // 3. Reject duplicate email
  const dupEmail = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName: 'Dup', lastName: 'User', email: email.toUpperCase(), password: initialPass, confirmPassword: initialPass })
  });
  assert.equal(dupEmail.response.status, 409);

  // 4. Reject mismatched passwords
  const mismatchPass = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName: 'Mismatch', lastName: 'User', email: `mismatch-${Date.now()}@example.com`, password: initialPass, confirmPassword: 'DifferentPass123!' })
  });
  assert.equal(mismatchPass.response.status, 422);

  // 5. Unverified login attempt rejected
  const unverifiedLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: initialPass })
  });
  assert.equal(unverifiedLogin.response.status, 403);
  assert.equal(unverifiedLogin.data.unverified, true);

  // 6. Verify email with token
  const verifyRes = await request('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token: verifyToken })
  });
  assert.equal(verifyRes.response.status, 200);

  // 7. Token cannot be reused
  const reuseVerify = await request('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token: verifyToken })
  });
  assert.equal(reuseVerify.response.status, 400);

  // 8. Login with valid credentials
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: initialPass })
  });
  assert.equal(loginRes.response.status, 200);
  assert.ok(loginRes.data.token);
  let authToken = loginRes.data.token;

  // 9. Reject invalid credentials
  const badCreds = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'WrongPassword123!' })
  });
  assert.equal(badCreds.response.status, 401);
  assert.equal(badCreds.data.error, 'Invalid email or password.');

  // 10. Protected endpoint rejects unauthenticated user
  const unauthMe = await request('/api/auth/me', { headers: {} });
  assert.equal(unauthMe.response.status, 401);

  // 11. Forgot password request
  const forgotRes = await request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
  assert.equal(forgotRes.response.status, 200);
  assert.ok(forgotRes.data.rawResetToken);
  const resetToken = forgotRes.data.rawResetToken;

  // 12. Password reset succeeds
  const resetRes = await request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: resetToken, newPassword: newPass, confirmPassword: newPass })
  });
  assert.equal(resetRes.response.status, 200);

  // 13. Reset token cannot be reused
  const reuseReset = await request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: resetToken, newPassword: newPass, confirmPassword: newPass })
  });
  assert.equal(reuseReset.response.status, 400);

  // 14. Old password no longer works
  const oldPassLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: initialPass })
  });
  assert.equal(oldPassLogin.response.status, 401);

  // 15. New password works
  const newPassLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: newPass })
  });
  assert.equal(newPassLogin.response.status, 200);
  authToken = newPassLogin.data.token;

  // 16. Change password in profile
  const changePassRes = await request('/api/profile/change-password', {
    method: 'POST',
    headers: auth(authToken),
    body: JSON.stringify({ currentPassword: newPass, newPassword: initialPass, confirmPassword: initialPass })
  });
  assert.equal(changePassRes.response.status, 200);

  // 17. Authenticate again with initial pass after change
  const finalLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: initialPass })
  });
  assert.equal(finalLogin.response.status, 200);

  // Clean up
  await request('/api/profile', { method: 'DELETE', headers: auth(finalLogin.data.token), body: JSON.stringify({ confirm: 'DELETE' }) });
});

test('Google Authenticator (TOTP) 2FA Password Recovery & Security Test Suite', async () => {
  const user = await createUser('TOTPTester');
  const userHeaders = auth(user.token);
  const pass = 'SecurePassword123!';
  const newPass = 'TOTPNewPassword123!';

  // 1. Initiate 2FA Setup
  const setupRes = await request('/api/2fa/setup', { method: 'POST', headers: userHeaders, body: '{}' });
  assert.equal(setupRes.response.status, 200);
  assert.ok(setupRes.data.secret);
  const secret = setupRes.data.secret;

  // 2. Reject invalid setup TOTP code
  const badSetup = await request('/api/2fa/verify-setup', { method: 'POST', headers: userHeaders, body: JSON.stringify({ code: '000000' }) });
  assert.equal(badSetup.response.status, 400);
  assert.equal(badSetup.data.error, 'Invalid verification code.');

  // 3. Verify valid setup TOTP code
  const validCode = generateTOTP(secret);
  const verifySetup = await request('/api/2fa/verify-setup', { method: 'POST', headers: userHeaders, body: JSON.stringify({ code: validCode }) });
  assert.equal(verifySetup.response.status, 200);
  assert.equal(verifySetup.data.message, 'Two-Factor Authentication enabled.');
  assert.ok(Array.isArray(verifySetup.data.recoveryCodes));
  const recoveryCode = verifySetup.data.recoveryCodes[0];

  // 4. Forgot Password 2FA Check
  const checkRes = await request('/api/auth/forgot-password-check', { method: 'POST', body: JSON.stringify({ email: user.user.email }) });
  assert.equal(checkRes.response.status, 200);
  assert.equal(checkRes.data.totpRequired, true);

  // 5. Reject invalid TOTP code during recovery
  const badRecovery = await request('/api/auth/verify-2fa-reset', { method: 'POST', body: JSON.stringify({ email: user.user.email, code: '999999' }) });
  assert.equal(badRecovery.response.status, 400);

  // 6. Password reset attempt without authorization token rejected
  const unauthReset = await request('/api/auth/reset-password-2fa', { method: 'POST', body: JSON.stringify({ email: user.user.email, resetAuthToken: 'invalid-token', newPassword: newPass, confirmPassword: newPass }) });
  assert.equal(unauthReset.response.status, 400);

  // 7. Verify valid TOTP code for recovery
  const totpResetCode = generateTOTP(secret);
  const verifyReset = await request('/api/auth/verify-2fa-reset', { method: 'POST', body: JSON.stringify({ email: user.user.email, code: totpResetCode }) });
  assert.equal(verifyReset.response.status, 200);
  assert.ok(verifyReset.data.resetAuthToken);
  const resetAuthToken = verifyReset.data.resetAuthToken;

  // 8. Execute password reset with valid authorization token
  const resetPassRes = await request('/api/auth/reset-password-2fa', { method: 'POST', body: JSON.stringify({ email: user.user.email, resetAuthToken, newPassword: newPass, confirmPassword: newPass }) });
  assert.equal(resetPassRes.response.status, 200);

  // 9. Authorization token cannot be reused
  const reuseAuthToken = await request('/api/auth/reset-password-2fa', { method: 'POST', body: JSON.stringify({ email: user.user.email, resetAuthToken, newPassword: newPass, confirmPassword: newPass }) });
  assert.equal(reuseAuthToken.response.status, 400);

  // 10. Old password fails, new password succeeds
  const oldPassRes = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: user.user.email, password: pass }) });
  assert.equal(oldPassRes.response.status, 401);

  const newPassRes = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: user.user.email, password: newPass }) });
  assert.equal(newPassRes.response.status, 200);
  const updatedHeaders = auth(newPassRes.data.token);

  // 11. Single-use Recovery Code verification for password reset
  const recoveryReset = await request('/api/auth/verify-2fa-reset', { method: 'POST', body: JSON.stringify({ email: user.user.email, code: recoveryCode }) });
  assert.equal(recoveryReset.response.status, 200);
  assert.ok(recoveryReset.data.resetAuthToken);

  // 12. Used recovery code cannot be reused
  const reuseRecovery = await request('/api/auth/verify-2fa-reset', { method: 'POST', body: JSON.stringify({ email: user.user.email, code: recoveryCode }) });
  assert.equal(reuseRecovery.response.status, 400);

  // 13. Reject disabling 2FA with invalid password
  const badDisable = await request('/api/2fa/disable', { method: 'POST', headers: updatedHeaders, body: JSON.stringify({ currentPassword: 'WrongPassword123!', code: generateTOTP(secret) }) });
  assert.equal(badDisable.response.status, 400);

  // 14. Disable 2FA with valid password and TOTP code
  const disableRes = await request('/api/2fa/disable', { method: 'POST', headers: updatedHeaders, body: JSON.stringify({ currentPassword: newPass, code: generateTOTP(secret) }) });
  assert.equal(disableRes.response.status, 200);

  // 15. Account without 2FA returns clear error for 2FA password recovery
  const no2FA = await request('/api/auth/forgot-password-check', { method: 'POST', body: JSON.stringify({ email: user.user.email }) });
  assert.equal(no2FA.response.status, 400);
  assert.equal(no2FA.data.error, 'Google Authenticator 2FA is not enabled for this account. Please verify your identity or contact support.');

  // Clean up
  await request('/api/profile', { method: 'DELETE', headers: updatedHeaders, body: JSON.stringify({ confirm: 'DELETE' }) });
});

test('AI Trip Planner & Recommendations Comprehensive Test Suite', async () => {
  const user = await createUser('AITester');
  const userHeaders = auth(user.token);

  // 1. GET /api/ai/recommendations
  const recsRes = await request('/api/ai/recommendations');
  assert.equal(recsRes.response.status, 200);
  assert.ok(Array.isArray(recsRes.data));
  assert.ok(recsRes.data.length >= 3);

  // 2. Reject unauthenticated AI plan request
  const unauthRes = await request('/api/ai/plan', { method: 'POST', body: JSON.stringify({ country: 'Japan' }) });
  assert.equal(unauthRes.response.status, 401);

  // 3. Reject invalid location hierarchy in AI plan request
  const badLocRes = await request('/api/ai/plan', {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({ country: 'Australia', state: 'Gujarat', city: 'Vadodara', startDate: '2026-11-01', endDate: '2026-11-05', budget: 40000 })
  });
  assert.equal(badLocRes.response.status, 400);

  // 4. Generate valid AI Plan
  const planRes = await request('/api/ai/plan', {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({ country: 'Japan', state: 'Kansai', city: 'Kyoto', startDate: '2026-11-01', endDate: '2026-11-05', budget: 35000, travellers: 2, travelStyle: 'Culture', pace: 'Balanced' })
  });
  assert.equal(planRes.response.status, 200);
  assert.equal(planRes.data.country, 'Japan');
  assert.ok(Array.isArray(planRes.data.stops));
  assert.ok(planRes.data.stops.length > 0);
  assert.equal(planRes.data.stops[0].country, 'Japan');

  // 5. Convert AI Plan to Real Active Itinerary
  const convertRes = await request('/api/ai/convert-plan', {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({ plan: planRes.data })
  });
  assert.equal(convertRes.response.status, 201);
  assert.equal(convertRes.data.success, true);
  assert.ok(convertRes.data.tripId);

  // 6. Verify converted trip is fully editable and accessible in /api/trips/:id
  const getTripRes = await request(`/api/trips/${convertRes.data.tripId}`, { headers: userHeaders });
  assert.equal(getTripRes.response.status, 200);
  assert.equal(getTripRes.data.country, 'Japan');
  assert.ok(getTripRes.data.stops.length > 0);

  // Clean up
  await request('/api/profile', { method: 'DELETE', headers: userHeaders, body: JSON.stringify({ confirm: 'DELETE' }) });
});

test('Country-Based Currency Mapping & Consistency Test Suite', async () => {
  const email = `curr-${Date.now()}@example.com`;
  const userRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName: 'Currency', lastName: 'Tester', email, password: 'Password123!', confirmPassword: 'Password123!', autoVerify: true })
  });
  const headers = auth(userRes.data.token);

  // 1. India Trip: INR (₹)
  const indiaTripRes = await request('/api/trips', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'India Tour', country: 'India', state: 'Gujarat', city: 'Vadodara', startDate: '2026-10-01', endDate: '2026-10-05', budget: 20000 })
  });
  assert.equal(indiaTripRes.response.status, 201);
  assert.equal(indiaTripRes.data.currencyCode, 'INR');
  assert.equal(indiaTripRes.data.currencySymbol, '₹');

  // 2. Japan Trip: JPY (¥)
  const japanTripRes = await request('/api/trips', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Japan Express', country: 'Japan', state: 'Kansai', city: 'Kyoto', startDate: '2026-11-01', endDate: '2026-11-06', budget: 200000 })
  });
  assert.equal(japanTripRes.response.status, 201);
  assert.equal(japanTripRes.data.currencyCode, 'JPY');
  assert.equal(japanTripRes.data.currencySymbol, '¥');

  // 3. USA Trip: USD ($)
  const usaTripRes = await request('/api/trips', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'US Trip', country: 'United States', state: 'California', city: 'Los Angeles', startDate: '2026-12-01', endDate: '2026-12-07', budget: 3000 })
  });
  assert.equal(usaTripRes.response.status, 201);
  assert.equal(usaTripRes.data.currencyCode, 'USD');
  assert.equal(usaTripRes.data.currencySymbol, '$');

  // 4. UK Trip: GBP (£)
  const ukTripRes = await request('/api/trips', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'UK Holiday', country: 'United Kingdom', state: 'England', city: 'London', startDate: '2027-01-01', endDate: '2027-01-05', budget: 2500 })
  });
  assert.equal(ukTripRes.response.status, 201);
  assert.equal(ukTripRes.data.currencyCode, 'GBP');
  assert.equal(ukTripRes.data.currencySymbol, '£');

  // 5. Australia Trip: AUD (A$)
  const audTripRes = await request('/api/trips', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Aussie Tour', country: 'Australia', state: 'Victoria', city: 'Melbourne', startDate: '2027-02-01', endDate: '2027-02-07', budget: 4000 })
  });
  assert.equal(audTripRes.response.status, 201);
  assert.equal(audTripRes.data.currencyCode, 'AUD');
  assert.equal(audTripRes.data.currencySymbol, 'A$');

  // 6. Updating trip country updates currency correctly
  const updateRes = await request(`/api/trips/${japanTripRes.data.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name: 'Updated UK Trip', country: 'United Kingdom', state: 'England', city: 'London', startDate: '2026-11-01', endDate: '2026-11-06', budget: 2500 })
  });
  assert.equal(updateRes.response.status, 200);
  assert.equal(updateRes.data.currencyCode, 'GBP');
  assert.equal(updateRes.data.currencySymbol, '£');

  // Clean up
  await request('/api/profile', { method: 'DELETE', headers, body: JSON.stringify({ confirm: 'DELETE' }) });
});

test('Currency Converter & Rates Comprehensive Test Suite', async () => {
  const email = `conv-${Date.now()}@example.com`;
  const userRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName: 'Converter', lastName: 'Tester', email, password: 'Password123!', confirmPassword: 'Password123!', autoVerify: true })
  });
  const headers = auth(userRes.data.token);

  // 1. GET /api/currency/rate (USD -> INR)
  const rateRes = await request('/api/currency/rate?from=USD&to=INR');
  assert.equal(rateRes.response.status, 200);
  assert.equal(rateRes.data.from, 'USD');
  assert.equal(rateRes.data.to, 'INR');
  assert.ok(rateRes.data.rate > 0);

  // 2. Conversions (INR->USD, USD->INR, JPY->INR, GBP->INR, EUR->INR)
  const convInrUsd = await request('/api/currency/convert', { method: 'POST', body: JSON.stringify({ amount: 8350, from: 'INR', to: 'USD' }) });
  assert.equal(convInrUsd.response.status, 200);
  assert.ok(convInrUsd.data.convertedAmount > 0);

  const convUsdInr = await request('/api/currency/convert', { method: 'POST', body: JSON.stringify({ amount: 100, from: 'USD', to: 'INR' }) });
  assert.equal(convUsdInr.response.status, 200);
  assert.ok(convUsdInr.data.convertedAmount > 0);

  const convJpyInr = await request('/api/currency/convert', { method: 'POST', body: JSON.stringify({ amount: 100000, from: 'JPY', to: 'INR' }) });
  assert.equal(convJpyInr.response.status, 200);
  assert.ok(convJpyInr.data.convertedAmount > 0);

  const convGbpInr = await request('/api/currency/convert', { method: 'POST', body: JSON.stringify({ amount: 100, from: 'GBP', to: 'INR' }) });
  assert.equal(convGbpInr.response.status, 200);
  assert.ok(convGbpInr.data.convertedAmount > 0);

  const convEurInr = await request('/api/currency/convert', { method: 'POST', body: JSON.stringify({ amount: 100, from: 'EUR', to: 'INR' }) });
  assert.equal(convEurInr.response.status, 200);
  assert.ok(convEurInr.data.convertedAmount > 0);

  // 3. Same currency conversion (USD -> USD)
  const sameRes = await request('/api/currency/convert', { method: 'POST', body: JSON.stringify({ amount: 500, from: 'USD', to: 'USD' }) });
  assert.equal(sameRes.response.status, 200);
  assert.equal(sameRes.data.rate, 1.0);
  assert.equal(sameRes.data.convertedAmount, 500);

  // 4. Invalid inputs
  const negRes = await request('/api/currency/convert', { method: 'POST', body: JSON.stringify({ amount: -50, from: 'USD', to: 'INR' }) });
  assert.equal(negRes.response.status, 422);

  const badCodeRes = await request('/api/currency/convert', { method: 'POST', body: JSON.stringify({ amount: 100, from: 'INVALID', to: 'INR' }) });
  assert.equal(badCodeRes.response.status, 400);

  // 5. Preferred Currency setting in Profile
  const prefRes = await request('/api/profile', { method: 'PATCH', headers, body: JSON.stringify({ preferredCurrency: 'USD' }) });
  assert.equal(prefRes.response.status, 200);
  assert.equal(prefRes.data.preferredCurrency, 'USD');

  // 6. Verify original trip currency & budget remain untouched in database
  const japanTripRes = await request('/api/trips', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Kyoto Journey', country: 'Japan', state: 'Kansai', city: 'Kyoto', startDate: '2026-11-01', endDate: '2026-11-05', budget: 200000 })
  });
  assert.equal(japanTripRes.response.status, 201);
  assert.equal(japanTripRes.data.budget, 200000);
  assert.equal(japanTripRes.data.currencyCode, 'JPY');

  // Fetch trip again
  const tripFetch = await request(`/api/trips/${japanTripRes.data.id}`, { headers });
  assert.equal(tripFetch.data.budget, 200000);
  assert.equal(tripFetch.data.currencyCode, 'JPY');

  // Clean up
  await request('/api/profile', { method: 'DELETE', headers, body: JSON.stringify({ confirm: 'DELETE' }) });
});







