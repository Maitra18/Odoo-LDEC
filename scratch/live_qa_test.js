const assert = require('node:assert/strict');

const base = 'http://127.0.0.1:3000';

async function request(path, options = {}) {
  const res = await fetch(base + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = res.status === 204 ? null : await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function testTwoCurrencySystemLiveQA() {
  console.log('--- TESTING TWO-CURRENCY SYSTEM LIVE QA (HTTP://LOCALHOST:3000) ---');

  const email = `twocurr-live-${Date.now()}@example.com`;
  const password = 'SecurePassword123!';

  // 1. Register
  console.log('1. Registering user...');
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName: 'Dual', lastName: 'Currency', email, password, confirmPassword: password, autoVerify: true })
  });
  assert.equal(regRes.status, 201);
  const token = regRes.data.token;
  const headers = auth(token);

  // 2. India Trip (₹50,000)
  console.log('2. Creating India Trip (₹50,000 INR)...');
  const indiaRes = await request('/api/trips', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Vadodara Trip', country: 'India', state: 'Gujarat', city: 'Vadodara', startDate: '2026-10-01', endDate: '2026-10-05', budget: 50000 })
  });
  assert.equal(indiaRes.status, 201);
  assert.equal(indiaRes.data.currencyCode, 'INR');
  assert.equal(indiaRes.data.currencySymbol, '₹');
  console.log(`✓ India Trip: ${indiaRes.data.budget} ${indiaRes.data.currencyCode} (${indiaRes.data.currencySymbol})`);

  // 3. Japan Trip (¥200,000 JPY)
  console.log('3. Creating Japan Trip (¥200,000 JPY)...');
  const japanRes = await request('/api/trips', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Kyoto Journey', country: 'Japan', state: 'Kansai', city: 'Kyoto', startDate: '2026-11-01', endDate: '2026-11-05', budget: 200000 })
  });
  assert.equal(japanRes.status, 201);
  assert.equal(japanRes.data.currencyCode, 'JPY');
  assert.equal(japanRes.data.currencySymbol, '¥');
  console.log(`✓ Japan Trip: ${japanRes.data.budget} ${japanRes.data.currencyCode} (${japanRes.data.currencySymbol})`);

  // 4. USA Trip ($3,000 USD)
  console.log('4. Creating USA Trip ($3,000 USD)...');
  const usaRes = await request('/api/trips', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'LA Vacation', country: 'United States', state: 'California', city: 'Los Angeles', startDate: '2026-12-01', endDate: '2026-12-07', budget: 3000 })
  });
  assert.equal(usaRes.status, 201);
  assert.equal(usaRes.data.currencyCode, 'USD');
  assert.equal(usaRes.data.currencySymbol, '$');
  console.log(`✓ USA Trip: ${usaRes.data.budget} ${usaRes.data.currencyCode} (${usaRes.data.currencySymbol})`);

  // 5. UK Trip (£2,500 GBP)
  console.log('5. Creating UK Trip (£2,500 GBP)...');
  const ukRes = await request('/api/trips', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'London Tour', country: 'United Kingdom', state: 'England', city: 'London', startDate: '2027-01-01', endDate: '2027-01-05', budget: 2500 })
  });
  assert.equal(ukRes.status, 201);
  assert.equal(ukRes.data.currencyCode, 'GBP');
  assert.equal(ukRes.data.currencySymbol, '£');
  console.log(`✓ UK Trip: ${ukRes.data.budget} ${ukRes.data.currencyCode} (${ukRes.data.currencySymbol})`);

  // 6. Australia Trip (A$4,000 AUD)
  console.log('6. Creating Australia Trip (A$4,000 AUD)...');
  const audRes = await request('/api/trips', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Melbourne Summer', country: 'Australia', state: 'Victoria', city: 'Melbourne', startDate: '2027-02-01', endDate: '2027-02-07', budget: 4000 })
  });
  assert.equal(audRes.status, 201);
  assert.equal(audRes.data.currencyCode, 'AUD');
  assert.equal(audRes.data.currencySymbol, 'A$');
  console.log(`✓ Australia Trip: ${audRes.data.budget} ${audRes.data.currencyCode} (${audRes.data.currencySymbol})`);

  // 7. Live Conversion Check
  console.log('7. Testing Live JPY -> INR conversion rate...');
  const convRes = await request('/api/currency/convert', {
    method: 'POST',
    body: JSON.stringify({ amount: 200000, from: 'JPY', to: 'INR' })
  });
  assert.equal(convRes.status, 200);
  assert.ok(convRes.data.convertedAmount > 0);
  console.log(`✓ ¥200,000 JPY = ≈ ₹${convRes.data.convertedAmount} INR (Rate: 1 JPY = ₹${convRes.data.rate} INR)`);

  // Clean up
  await request('/api/profile', { method: 'DELETE', headers, body: JSON.stringify({ confirm: 'DELETE' }) });
  console.log('--- TWO-CURRENCY SYSTEM LIVE QA PASSED 100% CLEANLY ---');
}

testTwoCurrencySystemLiveQA().catch(err => {
  console.error('LIVE QA FAILED:', err);
  process.exit(1);
});
