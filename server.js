const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = process.env.DATA_FILE || path.join(DATA_DIR, 'store.json');
const PUBLIC_DIR = path.join(ROOT, 'public');
const currencyService = require('./currencyService');

const cities = [
  ['Lisbon', 'Portugal', 'Europe', 62, 94, 'Coastal capital with tiled streets, food halls, and viewpoints.', 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=800&q=80'],
  ['Kyoto', 'Japan', 'Asia', 74, 91, 'Temple gardens, traditional neighborhoods, and seasonal cuisine.', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80'],
  ['Rome', 'Italy', 'Europe', 72, 95, 'Eternal city of ancient ruins, Renaissance art, and vibrant plazas.', 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80'],
  ['Paris', 'France', 'Europe', 82, 97, 'Iconic boulevards, world-class museums, cafes, and historic landmarks.', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80'],
  ['Tokyo', 'Japan', 'Asia', 80, 96, 'Dynamic metropolis of neon avenues, historic shrines, and culinary excellence.', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80'],
  ['Reykjavik', 'Iceland', 'Europe', 88, 86, 'A compact base for geothermal landscapes and northern lights.', 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=800&q=80'],
  ['Mexico City', 'Mexico', 'North America', 48, 92, 'A creative megacity of museums, markets, and neighbourhood dining.', 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80'],
  ['Cape Town', 'South Africa', 'Africa', 57, 89, 'Mountains, vineyards, beaches, and a dynamic design scene.', 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80'],
  ['Melbourne', 'Australia', 'Oceania', 79, 85, 'Laneways, coffee culture, galleries, and coastal day trips.', 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=800&q=80'],
  ['Marrakesh', 'Morocco', 'Africa', 44, 87, 'Medina courtyards, souks, hammams, and Atlas excursions.', 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=800&q=80'],
  ['New York', 'United States', 'North America', 94, 96, 'A high-energy classic for culture, food, and neighbourhood walks.', 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80']
].map(([name, country, region, costIndex, popularity, description, image], i) => ({ id: `city_${i + 1}`, name, country, region, costIndex, popularity, description, image }));

const activities = [
  ['Pastéis & Alfama walk', 'Food & culture walk through Lisbon’s oldest quarters.', 'Food', 26, 3, 'Lisbon', 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80'],
  ['Fushimi Inari dawn hike', 'Walk the torii-lined mountain trail before the crowds.', 'Outdoor', 0, 3, 'Kyoto', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80'],
  ['Colosseum & Forum guided tour', 'Skip-the-line access to ancient Roman history.', 'Culture', 65, 3, 'Rome', 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80'],
  ['Louvre evening tour', 'Discover masterworks including the Mona Lisa.', 'Culture', 45, 2.5, 'Paris', 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80'],
  ['Shibuya & Harajuku food crawl', 'Tasting tour through Tokyo’s vibrant quarters.', 'Food', 55, 3, 'Tokyo', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80'],
  ['Blue Lagoon soak', 'Geothermal bathing with pre-booked entry.', 'Wellness', 94, 3, 'Reykjavik', 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=800&q=80'],
  ['Frida Kahlo Museum', 'Timed museum visit in Coyoacán.', 'Culture', 18, 2, 'Mexico City', 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80'],
  ['Table Mountain cableway', 'Panoramic climb above the city and coast.', 'Outdoor', 31, 3, 'Cape Town', 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80'],
  ['Laneway coffee crawl', 'Independent roasters and hidden arcades.', 'Food', 22, 2, 'Melbourne', 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=800&q=80'],
  ['Medina food tour', 'Small-group tasting tour through the old city.', 'Food', 39, 4, 'Marrakesh', 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=800&q=80'],
  ['Museum of Modern Art', 'Modern art collection in Midtown Manhattan.', 'Culture', 30, 3, 'New York', 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80']
].map(([name, description, category, cost, duration, city, image], i) => ({ id: `activity_${i + 1}`, name, description, category, cost, duration, city, image }));

function initialData() { return { users: [], trips: [], stops: [], activities: [], sessions: [], cities, catalogueActivities: activities }; }
function db() {
  if (!fs.existsSync(DATA_FILE)) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(initialData(), null, 2)); }
  try { const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); return { ...initialData(), ...data }; } catch { return initialData(); }
}
function save(data) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function hash(password, salt = crypto.randomBytes(16).toString('hex')) { return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`; }
function matches(password, encoded) { const [salt, digest] = encoded.split(':'); const result = crypto.scryptSync(password, salt, 64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(result)); }
const locationHierarchy = {
  'India': {
    'Gujarat': ['Vadodara', 'Ahmedabad', 'Surat', 'Rajkot'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur'],
    'Rajasthan': ['Jaipur', 'Udaipur', 'Jodhpur'],
    'Karnataka': ['Bengaluru', 'Mysuru']
  },
  'Australia': {
    'Victoria': ['Melbourne', 'Geelong', 'Ballarat'],
    'New South Wales': ['Sydney', 'Newcastle', 'Wollongong'],
    'Queensland': ['Brisbane', 'Cairns', 'Gold Coast'],
    'Western Australia': ['Perth'],
    'South Australia': ['Adelaide'],
    'Tasmania': ['Hobart']
  },
  'Japan': {
    'Tokyo': ['Tokyo'],
    'Kansai': ['Kyoto', 'Osaka', 'Nara'],
    'Hokkaido': ['Sapporo']
  },
  'Portugal': {
    'Lisbon District': ['Lisbon'],
    'Norte': ['Porto'],
    'Algarve': ['Faro']
  },
  'Italy': {
    'Lazio': ['Rome'],
    'Lombardy': ['Milan'],
    'Tuscany': ['Florence'],
    'Veneto': ['Venice']
  },
  'France': {
    'Île-de-France': ['Paris'],
    'Provence-Alpes-Côte d\'Azur': ['Nice', 'Marseille'],
    'Auvergne-Rhône-Alpes': ['Lyon']
  },
  'Iceland': {
    'Capital Region': ['Reykjavik']
  },
  'Mexico': {
    'Mexico City': ['Mexico City'],
    'Jalisco': ['Guadalajara'],
    'Quintana Roo': ['Cancún']
  },
  'South Africa': {
    'Western Cape': ['Cape Town'],
    'Gauteng': ['Johannesburg']
  },
  'Morocco': {
    'Marrakesh-Safi': ['Marrakesh'],
    'Casablanca-Settat': ['Casablanca']
  },
  'United States': {
    'New York': ['New York', 'Buffalo'],
    'California': ['Los Angeles', 'San Francisco', 'San Diego'],
    'Florida': ['Miami', 'Orlando']
  },
  'United Kingdom': {
    'England': ['London', 'Manchester'],
    'Scotland': ['Edinburgh', 'Glasgow']
  }
};

function isValidLocation(country, state, city) {
  if (!country || !locationHierarchy[country]) return false;
  const states = locationHierarchy[country];
  if (state && !states[state]) return false;
  if (city) {
    if (state) {
      if (!states[state] || !states[state].includes(city)) return false;
    } else {
      const allCities = Object.values(states).flat();
      if (!allCities.includes(city)) return false;
    }
  }
  return true;
}

const devEmails = [];
function sendEmail({ to, subject, text, html, link }) {
  const emailItem = { to: to.toLowerCase(), subject, text, html, link, createdAt: new Date().toISOString() };
  devEmails.push(emailItem);
  if (devEmails.length > 50) devEmails.shift();
}

const rateLimitMap = new Map();
function isRateLimited(ip, action, max = 50, windowMs = 15 * 60 * 1000) {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }
  record.count++;
  rateLimitMap.set(key, record);
  return record.count > max;
}

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

function generateBase32Secret(length = 16) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    secret += alphabet[bytes[i] % 32];
  }
  return secret;
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

function verifyTOTP(secretBase32, token, window = 1) {
  if (!secretBase32 || !token) return false;
  const cleanToken = String(token).trim();
  if (!/^\d{6}$/.test(cleanToken)) return false;
  const currentStep = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    const validCode = generateTOTP(secretBase32, currentStep + i);
    if (crypto.timingSafeEqual(Buffer.from(validCode), Buffer.from(cleanToken))) {
      return true;
    }
  }
  return false;
}

function generateOfflineQRSVG(text) {
  const size = 33;
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));
  function setModule(r, c, val) { matrix[r][c] = val; reserved[r][c] = true; }
  function addFinder(r, c) {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const y = r + dy, x = c + dx;
        if (y >= 0 && y < size && x >= 0 && x < size) {
          const isBorder = dy === -1 || dy === 7 || dx === -1 || dx === 7;
          const isOuter = dy === 0 || dy === 6 || dx === 0 || dx === 6;
          const isCenter = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
          setModule(y, x, !isBorder && (isOuter || isCenter));
        }
      }
    }
  }
  addFinder(0, 0); addFinder(0, size - 7); addFinder(size - 7, 0);
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const y = 26 + dy, x = 26 + dx;
      setModule(y, x, Math.abs(dy) === 2 || Math.abs(dx) === 2 || (dy === 0 && dx === 0));
    }
  }
  for (let i = 8; i < size - 8; i++) { setModule(6, i, i % 2 === 0); setModule(i, 6, i % 2 === 0); }
  setModule(size - 8, 8, true);
  for (let i = 0; i < 9; i++) { if (i !== 6) { reserved[8][i] = true; reserved[i][8] = true; } }
  for (let i = 0; i < 8; i++) { reserved[8][size - 1 - i] = true; reserved[size - 1 - i][8] = true; }
  const bytes = Buffer.from(text);
  const bits = [0, 1, 0, 0];
  for (let b = 7; b >= 0; b--) bits.push((bytes.length >> b) & 1);
  for (const byte of bytes) { for (let b = 7; b >= 0; b--) bits.push((byte >> b) & 1); }
  while (bits.length < 320) bits.push(0);
  let bitIdx = 0, dir = -1, x = size - 1;
  while (x > 0) {
    if (x === 6) x--;
    for (let y = dir === -1 ? size - 1 : 0; dir === -1 ? y >= 0 : y < size; y += dir) {
      for (let c = 0; c < 2; c++) {
        const col = x - c;
        if (!reserved[y][col]) {
          matrix[y][col] = Boolean(bitIdx < bits.length ? bits[bitIdx++] : 0);
        }
      }
    }
    dir = -dir; x -= 2;
  }
  let path = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) path += `M${c},${r}h1v1h-1z `;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="180" height="180" shape-rendering="crispEdges" style="background:#fff;padding:8px;border:1px solid #dcdcdc;border-radius:8px"><path fill="#123c3d" d="${path}"/></svg>`;
}

function cleanUser(user) {
  const { passwordHash, verificationTokenHash, resetTokenHash, totpSecret, totpTempSecret, recoveryCodes, totpResetAuthTokenHash, ...safe } = user;
  return safe;
}
function publicSlug() { return crypto.randomBytes(7).toString('base64url'); }
function inputString(v, max = 500) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function parseBody(req) { return new Promise((resolve, reject) => { let body = ''; req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); }); req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON body.')); } }); }); }
function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
function getAuth(req, data) { const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, ''); const session = data.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date()); return session && data.users.find(u => u.id === session.userId); }
function requireAuth(req, res, data) { const user = getAuth(req, data); if (!user) { json(res, 401, { error: 'Please sign in to continue.' }); return null; } return user; }
function getTrip(data, tripId, user, allowPublic = false) { const trip = data.trips.find(t => t.id === tripId); if (!trip || (trip.userId !== user.id && !(allowPublic && trip.isPublic))) return null; return trip; }
const countryCurrencyMap = {
  'India': { code: 'INR', symbol: '₹', locale: 'en-IN' },
  'United States': { code: 'USD', symbol: '$', locale: 'en-US' },
  'United Kingdom': { code: 'GBP', symbol: '£', locale: 'en-GB' },
  'Japan': { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
  'China': { code: 'CNY', symbol: '¥', locale: 'zh-CN' },
  'Australia': { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
  'Canada': { code: 'CAD', symbol: 'C$', locale: 'en-CA' },
  'Singapore': { code: 'SGD', symbol: 'S$', locale: 'en-SG' },
  'UAE': { code: 'AED', symbol: 'د.إ', locale: 'ar-AE' },
  'United Arab Emirates': { code: 'AED', symbol: 'د.إ', locale: 'ar-AE' },
  'Switzerland': { code: 'CHF', symbol: 'CHF', locale: 'de-CH' },
  'South Korea': { code: 'KRW', symbol: '₩', locale: 'ko-KR' },
  'Thailand': { code: 'THB', symbol: '฿', locale: 'th-TH' },
  'Indonesia': { code: 'IDR', symbol: 'Rp', locale: 'id-ID' },
  'Vietnam': { code: 'VND', symbol: '₫', locale: 'vi-VN' },
  'Turkey': { code: 'TRY', symbol: '₺', locale: 'tr-TR' },
  'Brazil': { code: 'BRL', symbol: 'R$', locale: 'pt-BR' },
  'Mexico': { code: 'MXN', symbol: 'MX$', locale: 'es-MX' },
  'South Africa': { code: 'ZAR', symbol: 'R', locale: 'en-ZA' },
  'New Zealand': { code: 'NZD', symbol: 'NZ$', locale: 'en-NZ' },
  'Malaysia': { code: 'MYR', symbol: 'RM', locale: 'ms-MY' },
  'France': { code: 'EUR', symbol: '€', locale: 'fr-FR' },
  'Germany': { code: 'EUR', symbol: '€', locale: 'de-DE' },
  'Italy': { code: 'EUR', symbol: '€', locale: 'it-IT' },
  'Spain': { code: 'EUR', symbol: '€', locale: 'es-ES' },
  'Portugal': { code: 'EUR', symbol: '€', locale: 'pt-PT' },
  'Netherlands': { code: 'EUR', symbol: '€', locale: 'nl-NL' },
  'Austria': { code: 'EUR', symbol: '€', locale: 'de-AT' },
  'Belgium': { code: 'EUR', symbol: '€', locale: 'fr-BE' },
  'Greece': { code: 'EUR', symbol: '€', locale: 'el-GR' },
  'Ireland': { code: 'EUR', symbol: '€', locale: 'en-IE' },
  'Finland': { code: 'EUR', symbol: '€', locale: 'fi-FI' },
  'Iceland': { code: 'ISK', symbol: 'kr', locale: 'is-IS' }
};

function getCurrencyForCountry(countryName) {
  if (!countryName) return { code: 'INR', symbol: '₹', locale: 'en-IN' };
  const clean = String(countryName).trim();
  if (countryCurrencyMap[clean]) return countryCurrencyMap[clean];

  for (const [c, info] of Object.entries(countryCurrencyMap)) {
    if (clean.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(clean.toLowerCase())) {
      return info;
    }
  }
  return { code: 'USD', symbol: '$', locale: 'en-US' };
}

function tripPayload(data, trip) {
  const stops = data.stops.filter(s => s.tripId === trip.id).sort((a, b) => a.position - b.position).map(stop => ({ ...stop, activities: data.activities.filter(a => a.stopId === stop.id).sort((a, b) => a.position - b.position) }));
  const actual = stops.flatMap(s => s.activities).reduce((sum, a) => sum + Number(a.cost || 0), 0);
  const start = new Date(`${trip.startDate}T00:00:00`), end = new Date(`${trip.endDate}T00:00:00`);
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const currencyInfo = getCurrencyForCountry(trip.country || trip.destination);
  const currencyCode = trip.currencyCode || currencyInfo.code;
  const currencySymbol = trip.currencySymbol || currencyInfo.symbol;

  return {
    ...trip,
    country: trip.country || (currencyInfo ? currencyInfo.country : 'India'),
    currencyCode,
    currencySymbol,
    budgetCurrency: currencyCode,
    stops,
    actualCost: Math.round(actual * 100) / 100,
    averageCostPerDay: Math.round(actual / days * 100) / 100,
    remainingBudget: trip.budget == null ? null : Math.round((trip.budget - actual) * 100) / 100,
    dayCount: days
  };
}

function validateTrip(body) {
  const name = inputString(body.name, 100);
  let country = inputString(body.country, 80);
  let state = inputString(body.state || body.province, 80);
  let city = inputString(body.city, 80);
  let destination = inputString(body.destination, 100);
  const description = inputString(body.description, 1000);
  const startDate = inputString(body.startDate, 10);
  const endDate = inputString(body.endDate, 10);
  const budget = body.budget === '' || body.budget == null ? null : Number(body.budget);

  if (!name || !startDate || !endDate) return { status: 422, error: 'Trip name and dates are required.' };

  if (!country && destination) {
    const parts = destination.split(',').map(s => s.trim());
    if (parts.length >= 3) {
      city = parts[0]; state = parts[1]; country = parts[2];
    } else if (parts.length === 2) {
      city = parts[0]; country = parts[1];
    } else if (parts.length === 1) {
      const term = parts[0];
      for (const [ctry, states] of Object.entries(locationHierarchy)) {
        if (ctry.toLowerCase() === term.toLowerCase()) {
          country = ctry;
          break;
        }
        for (const [st, citiesList] of Object.entries(states)) {
          if (citiesList.some(c => c.toLowerCase() === term.toLowerCase())) {
            city = citiesList.find(c => c.toLowerCase() === term.toLowerCase());
            state = st;
            country = ctry;
            break;
          }
        }
        if (country) break;
      }
    }
  }

  if (!country || !isValidLocation(country, state, city)) {
    return { status: 400, error: 'Selected city does not belong to the selected country.' };
  }

  if (!destination) {
    destination = city ? `${city}${state ? ', ' + state : ''}, ${country}` : `${state ? state + ', ' : ''}${country}`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
    return { status: 422, error: 'Enter a valid date range.' };
  }
  if (budget != null && (!Number.isFinite(budget) || budget < 0)) {
    return { status: 422, error: 'Budget must be a positive amount.' };
  }
  const currencyInfo = getCurrencyForCountry(country || destination);
  return {
    value: {
      name,
      country,
      state,
      city,
      destination,
      description,
      startDate,
      endDate,
      budget,
      currencyCode: currencyInfo.code,
      currencySymbol: currencyInfo.symbol,
      budgetCurrency: currencyInfo.code,
      coverImage: inputString(body.coverImage, 1000)
    }
  };
}

function isValidLocation(country, state, city) {
  if (!country) return true;
  if (!locationHierarchy[country]) return false;
  if (state && !locationHierarchy[country][state]) return false;
  if (state && city && locationHierarchy[country][state] && !locationHierarchy[country][state].some(c => c.toLowerCase() === city.toLowerCase())) return false;
  return true;
}

function generateAIPlan(params) {
  const { country = 'Japan', state = '', city = '', startDate = '2026-11-01', endDate = '2026-11-05', budget = 35000, travellers = 1, travelStyle = 'Mixed', pace = 'Balanced', cheaper = false, modifier = '' } = params;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);

  let availableCities = [];
  if (country && locationHierarchy[country]) {
    if (state && locationHierarchy[country][state]) {
      availableCities = locationHierarchy[country][state];
    } else {
      availableCities = Object.values(locationHierarchy[country]).flat();
    }
  }
  if (!availableCities.length) availableCities = [city || 'Capital'];

  const numStops = days >= 7 ? Math.min(3, availableCities.length) : days >= 4 ? Math.min(2, availableCities.length) : 1;
  const daysPerStop = Math.floor(days / numStops);

  const stops = [];
  let currentDate = new Date(start);

  for (let sIdx = 0; sIdx < numStops; sIdx++) {
    const sCity = availableCities[sIdx % availableCities.length];
    let sState = state || '';
    if (!sState && country && locationHierarchy[country]) {
      for (const [st, cList] of Object.entries(locationHierarchy[country])) {
        if (cList.includes(sCity)) { sState = st; break; }
      }
    }

    const sStartStr = currentDate.toISOString().slice(0, 10);
    const stopDays = (sIdx === numStops - 1) ? days - (daysPerStop * (numStops - 1)) : daysPerStop;
    currentDate.setDate(currentDate.getDate() + stopDays - 1);
    const sEndStr = currentDate.toISOString().slice(0, 10);
    currentDate.setDate(currentDate.getDate() + 1);

    const stopActivities = [];
    const actsPerDay = (pace === 'Packed' || modifier === 'More activities') ? 3 : (pace === 'Relaxed' || modifier === 'More relaxed') ? 1 : 2;

    const stopDateRunner = new Date(`${sStartStr}T00:00:00`);
    for (let d = 0; d < stopDays; d++) {
      const dayStr = stopDateRunner.toISOString().slice(0, 10);
      const times = ['09:30', '14:00', '18:30'];

      for (let aIdx = 0; aIdx < actsPerDay; aIdx++) {
        let category = 'Experience';
        if (modifier === 'More food' || travelStyle === 'Food' || aIdx === 1) category = 'Food';
        else if (modifier === 'More cultural' || travelStyle === 'Culture') category = 'Culture';
        else if (modifier === 'More nature' || travelStyle === 'Nature' || travelStyle === 'Outdoor' || travelStyle === 'Adventure') category = 'Outdoor';
        else if (travelStyle === 'Relaxation') category = 'Wellness';

        const catalogMatch = activities.find(a => a.city.toLowerCase() === sCity.toLowerCase() && a.category === category);
        const actName = catalogMatch ? catalogMatch.name : `${travelStyle} ${category} in ${sCity} (Day ${d + 1})`;
        let baseCost = catalogMatch ? catalogMatch.cost : (category === 'Food' ? 600 : category === 'Outdoor' ? 1200 : 800);

        if (cheaper || modifier === 'Cheaper') baseCost = Math.round(baseCost * 0.55);

        stopActivities.push({
          name: actName,
          date: dayStr,
          time: times[aIdx] || '10:00',
          cost: Math.round(baseCost * (Number(travellers) || 1)),
          duration: category === 'Food' ? 1.5 : 2.5,
          category,
          description: catalogMatch ? catalogMatch.description : `Curated ${category.toLowerCase()} experience in ${sCity}.`,
          location: sCity
        });
      }
      stopDateRunner.setDate(stopDateRunner.getDate() + 1);
    }

    stops.push({
      country,
      state: sState,
      city: sCity,
      startDate: sStartStr,
      endDate: sEndStr,
      budget: Math.round((budget || 35000) / numStops),
      activities: stopActivities
    });
  }

  const totalEstimatedCost = stops.flatMap(s => s.activities).reduce((sum, a) => sum + Number(a.cost || 0), 0);
  const estimatedDailyCost = Math.round(totalEstimatedCost / days);
  const userBudget = Number(budget) || 0;
  const remainingBudget = userBudget ? userBudget - totalEstimatedCost : null;

  const currencyInfo = getCurrencyForCountry(country);

  return {
    name: `${country} ${travelStyle} Journey`,
    country,
    currencyCode: currencyInfo.code,
    currencySymbol: currencyInfo.symbol,
    state: state || stops[0]?.state || '',
    city: city || stops[0]?.city || '',
    destination: city ? `${city}, ${country}` : `${country}`,
    startDate,
    endDate,
    dayCount: days,
    travellers: Number(travellers) || 1,
    travelStyle,
    pace,
    budget: userBudget || null,
    totalEstimatedCost,
    estimatedDailyCost,
    remainingBudget,
    exceedsBudget: userBudget > 0 && totalEstimatedCost > userBudget,
    stops
  };
}

function errorHandler(res, err) { console.error(err); json(res, 400, { error: err.message || 'We could not process that request.' }); }

async function api(req, res, url) {
  const data = db(); const method = req.method; const parts = url.pathname.split('/').filter(Boolean);
  const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? await parseBody(req) : {};
  if (method === 'GET' && url.pathname === '/api/locations') return json(res, 200, locationHierarchy);
  if (method === 'GET' && url.pathname === '/api/dev/last-email') {
    const to = url.searchParams.get('to');
    const filtered = to ? devEmails.filter(e => e.to === to.toLowerCase()) : devEmails;
    return json(res, 200, filtered[filtered.length - 1] || null);
  }

  if (method === 'POST' && url.pathname === '/api/auth/register') {
    const clientIp = req.socket.remoteAddress || '127.0.0.1';
    if (isRateLimited(clientIp, 'register')) return json(res, 429, { error: 'Too many requests. Please try again later.' });

    const firstName = inputString(body.firstName, 50), lastName = inputString(body.lastName, 50), email = inputString(body.email, 120).toLowerCase(), password = String(body.password || ''), confirmPassword = body.confirmPassword === undefined ? password : String(body.confirmPassword || '');
    if (!firstName || !lastName) return json(res, 422, { error: 'First name and last name are required.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return json(res, 422, { error: 'Enter a valid email address.' });
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return json(res, 422, { error: 'Password must be at least 8 characters long and contain uppercase, lowercase, and a number.' });
    }
    if (password !== confirmPassword) return json(res, 422, { error: 'Passwords do not match.' });
    if (data.users.some(u => u.email === email)) return json(res, 409, { error: 'An account with that email already exists.' });

    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = hash(rawVerifyToken);
    const verifyTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    const user = {
      id: id('user'), firstName, lastName, email,
      phone: inputString(body.phone, 30), city: inputString(body.city, 80), country: inputString(body.country, 80),
      photo: inputString(body.photo, 1000), language: 'English', role: data.users.length === 0 ? 'admin' : 'user',
      passwordHash: hash(password),
      isVerified: Boolean(body.autoVerify),
      verificationTokenHash: verifyTokenHash,
      verificationTokenExpiresAt: verifyTokenExpiresAt,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      createdAt: new Date().toISOString()
    };

    data.users.push(user);
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    data.sessions.push({ token: sessionToken, userId: user.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString() });
    save(data);

    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const verifyLink = `${appUrl}/#/verify-email?token=${rawVerifyToken}`;
    sendEmail({ to: email, subject: 'Verify your GlobeTrotter account', text: `Verify link: ${verifyLink}`, html: `<p>Click <a href="${verifyLink}">here</a> to verify.</p>`, link: verifyLink });

    return json(res, 201, { token: sessionToken, user: cleanUser(user), devVerifyLink: verifyLink, rawVerifyToken });
  }

  if (method === 'POST' && url.pathname === '/api/auth/verify-email') {
    const token = inputString(body.token, 100);
    if (!token) return json(res, 422, { error: 'Verification token is required.' });

    const user = data.users.find(u => u.verificationTokenHash && matches(token, u.verificationTokenHash));
    if (!user) return json(res, 400, { error: 'Invalid or expired verification token.' });

    if (new Date(user.verificationTokenExpiresAt) < new Date()) {
      return json(res, 400, { error: 'Verification token has expired. Please request a new link.' });
    }

    user.isVerified = true;
    user.verificationTokenHash = null;
    user.verificationTokenExpiresAt = null;
    save(data);

    return json(res, 200, { message: 'Email address verified successfully. You can now sign in.' });
  }

  if (method === 'POST' && url.pathname === '/api/auth/login') {
    const clientIp = req.socket.remoteAddress || '127.0.0.1';
    if (isRateLimited(clientIp, 'login')) return json(res, 429, { error: 'Too many login attempts. Please try again later.' });

    const email = inputString(body.email, 120).toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) return json(res, 401, { error: 'Invalid email or password.' });
    const user = data.users.find(u => u.email === email);

    if (!user || !matches(password, user.passwordHash)) {
      return json(res, 401, { error: 'Invalid email or password.' });
    }

    if (user.isVerified === undefined) {
      user.isVerified = true;
    }

    if (!user.isVerified) {
      return json(res, 403, { error: 'Please verify your email address before signing in.', unverified: true, email: user.email });
    }

    const token = crypto.randomBytes(32).toString('base64url');
    data.sessions.push({ token, userId: user.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString() });
    save(data);

    return json(res, 200, { token, user: cleanUser(user) });
  }

  if (method === 'POST' && url.pathname === '/api/auth/forgot-password') {
    const email = inputString(body.email, 120).toLowerCase();
    const genericMsg = 'If an account exists for this email, a password reset link has been sent.';

    if (email && /^\S+@\S+\.\S+$/.test(email)) {
      const user = data.users.find(u => u.email === email);
      if (user) {
        const rawResetToken = crypto.randomBytes(32).toString('hex');
        user.resetTokenHash = hash(rawResetToken);
        user.resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
        save(data);

        const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
        const resetLink = `${appUrl}/#/reset-password?token=${rawResetToken}`;
        sendEmail({ to: email, subject: 'Reset your GlobeTrotter password', text: `Reset link: ${resetLink}`, html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`, link: resetLink });
        return json(res, 200, { message: genericMsg, devResetLink: resetLink, rawResetToken });
      }
    }
    return json(res, 200, { message: genericMsg });
  }

  if (method === 'POST' && url.pathname === '/api/auth/reset-password') {
    const token = inputString(body.token, 100);
    const newPassword = String(body.newPassword || body.password || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!token) return json(res, 422, { error: 'Reset token is required.' });
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return json(res, 422, { error: 'Password must be at least 8 characters long and contain uppercase, lowercase, and a number.' });
    }
    if (newPassword !== confirmPassword) return json(res, 422, { error: 'Passwords do not match.' });

    const user = data.users.find(u => u.resetTokenHash && matches(token, u.resetTokenHash));
    if (!user) return json(res, 400, { error: 'Invalid or expired password reset token.' });

    if (new Date(user.resetTokenExpiresAt) < new Date()) {
      return json(res, 400, { error: 'Password reset token has expired. Please request a new link.' });
    }

    user.passwordHash = hash(newPassword);
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    user.isVerified = true;
    data.sessions = data.sessions.filter(s => s.userId !== user.id);
    save(data);

    return json(res, 200, { message: 'Password updated successfully. Please sign in with your new password.' });
  }

  if (method === 'POST' && url.pathname === '/api/auth/forgot-password-check') {
    const email = inputString(body.email, 120).toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json(res, 422, { error: 'Enter a valid email address.' });

    const targetUser = data.users.find(u => u.email === email);
    if (!targetUser || !targetUser.totpEnabled) {
      return json(res, 400, { error: 'Google Authenticator 2FA is not enabled for this account. Please verify your identity or contact support.' });
    }

    return json(res, 200, { totpRequired: true, email: targetUser.email });
  }

  if (method === 'POST' && url.pathname === '/api/auth/verify-2fa-reset') {
    const clientIp = req.socket.remoteAddress || '127.0.0.1';
    if (isRateLimited(clientIp, 'verify-2fa')) return json(res, 429, { error: 'Too many verification attempts. Please try again later.' });

    const email = inputString(body.email, 120).toLowerCase();
    const code = inputString(body.code, 30);

    if (!email || !code) return json(res, 400, { error: 'Invalid verification code.' });
    const targetUser = data.users.find(u => u.email === email);
    if (!targetUser || !targetUser.totpEnabled || !targetUser.totpSecret) {
      return json(res, 400, { error: 'Invalid verification code.' });
    }

    let valid = verifyTOTP(targetUser.totpSecret, code);
    if (!valid && targetUser.recoveryCodes) {
      const rc = targetUser.recoveryCodes.find(r => !r.used && matches(code.trim(), r.hash));
      if (rc) {
        rc.used = true;
        valid = true;
      }
    }

    if (!valid) {
      return json(res, 400, { error: 'Invalid verification code.' });
    }

    const rawAuthToken = crypto.randomBytes(32).toString('hex');
    targetUser.totpResetAuthTokenHash = hash(rawAuthToken);
    targetUser.totpResetAuthExpiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString();
    save(data);

    return json(res, 200, { message: 'Code verified successfully.', resetAuthToken: rawAuthToken });
  }

  if (method === 'POST' && url.pathname === '/api/auth/reset-password-2fa') {
    const email = inputString(body.email, 120).toLowerCase();
    const resetAuthToken = inputString(body.resetAuthToken, 100);
    const newPassword = String(body.newPassword || body.password || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!email || !resetAuthToken) return json(res, 400, { error: 'Invalid or expired password reset authorization.' });
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return json(res, 422, { error: 'Password must be at least 8 characters long and contain uppercase, lowercase, and a number.' });
    }
    if (newPassword !== confirmPassword) return json(res, 422, { error: 'Passwords do not match.' });

    const targetUser = data.users.find(u => u.email === email && u.totpResetAuthTokenHash && matches(resetAuthToken, u.totpResetAuthTokenHash));
    if (!targetUser) return json(res, 400, { error: 'Invalid or expired password reset authorization.' });

    if (new Date(targetUser.totpResetAuthExpiresAt) < new Date()) {
      return json(res, 400, { error: 'Password reset authorization has expired. Please try again.' });
    }

    targetUser.passwordHash = hash(newPassword);
    targetUser.totpResetAuthTokenHash = null;
    targetUser.totpResetAuthExpiresAt = null;

    data.sessions = data.sessions.filter(s => s.userId !== targetUser.id);
    save(data);

    return json(res, 200, { message: 'Password updated successfully. Please sign in.' });
  }

  if (method === 'POST' && url.pathname === '/api/auth/logout') { data.sessions = data.sessions.filter(s => s.token !== (req.headers.authorization || '').replace(/^Bearer\s+/i, '')); save(data); return json(res, 204, {}); }
  if (method === 'GET' && url.pathname === '/api/public' && url.searchParams.has('slug')) { const trip = data.trips.find(t => t.publicSlug === url.searchParams.get('slug') && t.isPublic); if (!trip) return json(res, 404, { error: 'This shared itinerary is unavailable.' }); const owner = data.users.find(u => u.id === trip.userId); return json(res, 200, { trip: tripPayload(data, trip), owner: owner ? { name: `${owner.firstName} ${owner.lastName}`, photo: owner.photo } : { name: 'GlobeTrotter traveller' } }); }
  if (method === 'GET' && url.pathname === '/api/cities') { const q = inputString(url.searchParams.get('q') || '', 100).toLowerCase(); return json(res, 200, cities.filter(c => !q || `${c.name} ${c.country} ${c.region}`.toLowerCase().includes(q))); }
  if (method === 'GET' && url.pathname === '/api/catalogue/activities') { const q = inputString(url.searchParams.get('q') || '', 100).toLowerCase(), type = inputString(url.searchParams.get('type') || '', 50); let result = activities.filter(a => (!q || `${a.name} ${a.city} ${a.description}`.toLowerCase().includes(q)) && (!type || a.category === type)); return json(res, 200, result); }

  if (method === 'GET' && url.pathname === '/api/currency/rate') {
    const from = url.searchParams.get('from') || 'USD';
    const to = url.searchParams.get('to') || 'INR';
    try {
      const result = await currencyService.getExchangeRate(from, to);
      return json(res, 200, result);
    } catch (err) {
      return json(res, err.status || 400, { error: err.message });
    }
  }

  if (method === 'POST' && url.pathname === '/api/currency/convert') {
    const amount = body.amount;
    const from = body.from || 'USD';
    const to = body.to || 'INR';
    try {
      const result = await currencyService.convertCurrency(amount, from, to);
      return json(res, 200, result);
    } catch (err) {
      return json(res, err.status || 400, { error: err.message });
    }
  }

  if (method === 'GET' && url.pathname === '/api/ai/recommendations') {
    const recs = [
      { id: 'rec-kyoto', name: 'Kyoto', country: 'Japan', state: 'Kansai', city: 'Kyoto', matchPct: 95, estimatedCost: 35000, durationDays: 5, travelStyle: 'Culture + Food', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', description: 'Ancient temples, bamboo groves, and traditional tea houses.' },
      { id: 'rec-melbourne', name: 'Melbourne', country: 'Australia', state: 'Victoria', city: 'Melbourne', matchPct: 92, estimatedCost: 45000, durationDays: 6, travelStyle: 'Outdoor + Nature', image: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=800&q=80', description: 'Laneway coffee culture, coastal drives, and vibrant street art.' },
      { id: 'rec-vadodara', name: 'Vadodara', country: 'India', state: 'Gujarat', city: 'Vadodara', matchPct: 89, estimatedCost: 15000, durationDays: 4, travelStyle: 'Culture + History', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', description: 'Grand Laxmi Vilas Palace, heritage gardens, and authentic Gujarati cuisine.' },
      { id: 'rec-lisbon', name: 'Lisbon', country: 'Portugal', state: 'Lisbon District', city: 'Lisbon', matchPct: 88, estimatedCost: 40000, durationDays: 5, travelStyle: 'Food + Experience', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', description: 'Sunlit hills, vintage trams, and famous Pastel de Nata.' }
    ];
    return json(res, 200, recs);
  }

  const user = requireAuth(req, res, data); if (!user) return;
  if (method === 'GET' && url.pathname === '/api/auth/me') return json(res, 200, cleanUser(user));

  if (method === 'GET' && url.pathname === '/api/analytics') {
    const userTrips = data.trips.filter(t => t.userId === user.id);
    const userTripIds = new Set(userTrips.map(t => t.id));
    const totalTrips = userTrips.length;

    const destinations = [...new Set(userTrips.map(t => t.destination || t.country).filter(Boolean))];
    const totalDestinations = destinations.length;

    const allStops = (data.stops || []).filter(s => userTripIds.has(s.tripId));
    const totalStops = allStops.length;

    const allStopIds = new Set(allStops.map(s => s.id));
    const allActivities = (data.activities || []).filter(a => allStopIds.has(a.stopId));
    const totalActivities = allActivities.length;

    const rates = currencyService.rates || {};
    const toINR = (amount, currencyCode) => {
      const code = (currencyCode || 'INR').toUpperCase();
      if (code === 'INR') return Number(amount) || 0;
      const rateToINR = rates[code] ? (1 / rates[code]) * (rates['INR'] || 1) : 1;
      return Math.round((Number(amount) || 0) * rateToINR);
    };

    let totalBudgetINR = 0;
    let totalActivitySpending = 0;
    allActivities.forEach(a => {
      totalActivitySpending += toINR(a.cost || 0, 'INR');
    });

    let totalPlannedSpendingINR = 0;
    let underBudgetCount = 0;
    let overBudgetCount = 0;

    userTrips.forEach(t => {
      const curr = t.currencyCode || t.country;
      const budgetVal = Number(t.budget) || 0;
      const costVal = Number(t.actualCost) || budgetVal || 0;
      totalBudgetINR += toINR(budgetVal, curr);
      totalPlannedSpendingINR += toINR(costVal, curr);
      if (t.budget != null) {
        if (costVal <= t.budget) underBudgetCount++;
        else overBudgetCount++;
      }
    });

    const totalSpending = totalActivities > 0 ? totalActivitySpending : totalPlannedSpendingINR;

    const avgTripCostINR = totalTrips > 0 ? Math.round(totalPlannedSpendingINR / totalTrips) : 0;

    let totalDurationDays = 0;
    userTrips.forEach(t => {
      if (t.startDate && t.endDate) {
        const d1 = new Date(t.startDate);
        const d2 = new Date(t.endDate);
        const diff = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
        totalDurationDays += diff;
      } else {
        totalDurationDays += 1;
      }
    });

    const avgTripDurationDays = totalTrips > 0 ? Number((totalDurationDays / totalTrips).toFixed(1)) : 0;
    const avgDailyCostINR = totalDurationDays > 0 ? Math.round(totalPlannedSpendingINR / totalDurationDays) : 0;

    const nowStr = new Date().toISOString().slice(0, 10);
    let upcomingCount = 0, ongoingCount = 0, completedCount = 0;
    userTrips.forEach(t => {
      if (t.endDate < nowStr) completedCount++;
      else if (t.startDate > nowStr) upcomingCount++;
      else ongoingCount++;
    });

    const categoryTotalsINR = {
      Accommodation: 0, Food: 0, Transport: 0, Activities: 0,
      Culture: 0, Outdoor: 0, Wellness: 0, Other: 0
    };

    allActivities.forEach(a => {
      const cat = a.category || 'Other';
      const key = categoryTotalsINR.hasOwnProperty(cat) ? cat : 'Other';
      categoryTotalsINR[key] += toINR(a.cost || 0, 'INR');
    });

    const totalCategorySpend = Object.values(categoryTotalsINR).reduce((sum, v) => sum + v, 0) || totalPlannedSpendingINR || 1;
    const expenseBreakdown = Object.entries(categoryTotalsINR).map(([category, amount]) => ({
      category,
      amount,
      percentage: Math.round((amount / totalCategorySpend) * 100)
    })).filter(x => x.amount > 0 || totalTrips > 0);

    const destinationStatsMap = {};
    userTrips.forEach(t => {
      const name = t.destination || t.city || t.country || 'Unknown';
      if (!destinationStatsMap[name]) destinationStatsMap[name] = { name, count: 0, totalSpendINR: 0 };
      destinationStatsMap[name].count++;
      destinationStatsMap[name].totalSpendINR += toINR(t.actualCost || t.budget || 0, t.currencyCode || t.country);
    });
    const destinationBreakdown = Object.values(destinationStatsMap);
    const topDestinations = [...destinationBreakdown].sort((a, b) => b.count - a.count);

    const currencyDistributionMap = {};
    userTrips.forEach(t => {
      const curr = (t.currencyCode || t.country || 'INR').toUpperCase();
      currencyDistributionMap[curr] = (currencyDistributionMap[curr] || 0) + 1;
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyActivity = months.map((month, idx) => {
      const count = userTrips.filter(t => t.startDate && new Date(t.startDate).getMonth() === idx).length;
      return { month, count };
    });

    const insights = [];
    if (totalTrips === 0) {
      insights.push("Create your first trip to generate personalized travel insights.");
    } else {
      const topDest = topDestinations[0];
      if (topDest) insights.push(`${topDest.name} is your most visited destination with ${topDest.count} trip${topDest.count > 1 ? 's' : ''}.`);
      insights.push(`Your average trip duration is ${avgTripDurationDays} days.`);
      if (underBudgetCount > 0) insights.push(`You stayed under budget on ${underBudgetCount} of ${totalTrips} trip${totalTrips > 1 ? 's' : ''}.`);
      insights.push(`Your average daily expenditure is approx. ₹${avgDailyCostINR.toLocaleString('en-IN')}.`);
    }

    const budgetUtilization = totalBudgetINR > 0 ? Math.min(100, Math.round((totalPlannedSpendingINR / totalBudgetINR) * 100)) : (totalPlannedSpendingINR > 0 ? 100 : 0);
    const remainingBudget = totalBudgetINR - totalPlannedSpendingINR;

    return json(res, 200, {
      totalTrips,
      totalDestinations,
      totalStops,
      totalActivities,
      citiesPlanned: totalDestinations,
      totalBudget: totalBudgetINR,
      totalSpending,
      totalPlannedSpendingINR,
      budgetUtilization,
      remainingBudget,
      averageTripCost: avgTripCostINR,
      avgTripCostINR,
      averageTripDuration: avgTripDurationDays,
      avgTripDurationDays,
      avgDailyCostINR,
      mostPlannedDestination: topDestinations[0]?.name || 'None',
      upcomingTrips: upcomingCount,
      ongoingTrips: ongoingCount,
      completedTrips: completedCount,
      statusBreakdown: { upcoming: upcomingCount, ongoing: ongoingCount, completed: completedCount },
      categoryBreakdown: categoryTotalsINR,
      expenseBreakdown,
      destinationBreakdown,
      topDestinations,
      currencyDistribution: currencyDistributionMap,
      monthlyActivity,
      budgetPerformance: {
        utilizationPct: budgetUtilization,
        underBudgetCount,
        overBudgetCount
      },
      insights
    });
  }

  if (method === 'POST' && url.pathname === '/api/ai/plan') {
    const country = inputString(body.country, 80);
    const state = inputString(body.state, 80);
    const city = inputString(body.city, 80);
    const startDate = inputString(body.startDate, 10);
    const endDate = inputString(body.endDate, 10);
    const budget = Number(body.budget || 0);

    if (!country) return json(res, 422, { error: 'Please select a destination country.' });
    if (!startDate || !endDate || startDate > endDate) return json(res, 422, { error: 'Please enter a valid date range.' });
    if (!isValidLocation(country, state, city)) return json(res, 400, { error: 'Selected city does not belong to the selected country.' });

    const plan = generateAIPlan(body);
    return json(res, 200, plan);
  }

  if (method === 'POST' && url.pathname === '/api/ai/convert-plan') {
    const plan = body.plan;
    if (!plan || !plan.country || !Array.isArray(plan.stops)) return json(res, 422, { error: 'Invalid AI plan data.' });

    const currencyInfo = getCurrencyForCountry(plan.country);
    const trip = {
      id: id('trip'),
      userId: user.id,
      name: inputString(plan.name, 100) || `${plan.country} AI Itinerary`,
      country: inputString(plan.country, 80),
      currencyCode: plan.currencyCode || currencyInfo.code,
      currencySymbol: plan.currencySymbol || currencyInfo.symbol,
      state: inputString(plan.state, 80),
      city: inputString(plan.city, 80),
      destination: inputString(plan.destination, 100) || `${plan.country}`,
      description: `AI-generated itinerary for ${plan.travellers || 1} traveller(s) (${plan.travelStyle || 'Mixed'} style, ${plan.pace || 'Balanced'} pace).`,
      startDate: inputString(plan.startDate, 10),
      endDate: inputString(plan.endDate, 10),
      budget: plan.budget == null || plan.budget === '' ? null : Number(plan.budget),
      coverImage: plan.coverImage || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
      isPublic: false,
      publicSlug: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.trips.push(trip);

    for (let sIdx = 0; sIdx < plan.stops.length; sIdx++) {
      const sData = plan.stops[sIdx];
      const stop = {
        id: id('stop'),
        tripId: trip.id,
        country: sData.country || trip.country,
        state: sData.state || trip.state,
        city: sData.city || trip.city,
        startDate: sData.startDate,
        endDate: sData.endDate,
        budget: sData.budget ?? null,
        position: sIdx
      };
      data.stops.push(stop);

      const acts = sData.activities || [];
      for (let aIdx = 0; aIdx < acts.length; aIdx++) {
        const aData = acts[aIdx];
        data.activities.push({
          id: id('activity'),
          stopId: stop.id,
          name: inputString(aData.name, 100),
          date: inputString(aData.date, 10),
          time: inputString(aData.time, 10) || '10:00',
          cost: Number(aData.cost || 0),
          duration: Number(aData.duration || 1),
          category: inputString(aData.category, 50) || 'Experience',
          description: inputString(aData.description, 500),
          location: inputString(aData.location, 100) || stop.city,
          position: aIdx
        });
      }
    }

    save(data);
    return json(res, 201, { success: true, tripId: trip.id, message: 'AI Trip Plan converted to your active itinerary.' });
  }

  if (method === 'POST' && url.pathname === '/api/2fa/setup') {
    const tempSecret = generateBase32Secret(16);
    user.totpTempSecret = tempSecret;
    save(data);
    const otpauthUrl = `otpauth://totp/GlobeTrotter:${encodeURIComponent(user.email)}?secret=${tempSecret}&issuer=GlobeTrotter`;
    const qrSvg = generateOfflineQRSVG(otpauthUrl);
    return json(res, 200, { secret: tempSecret, otpauthUrl, qrSvg });
  }

  if (method === 'POST' && url.pathname === '/api/2fa/verify-setup') {
    const code = inputString(body.code, 20);
    if (!user.totpTempSecret) return json(res, 400, { error: 'Please initiate 2FA setup first.' });
    if (!verifyTOTP(user.totpTempSecret, code)) {
      return json(res, 400, { error: 'Invalid verification code.' });
    }

    const rawRecoveryCodes = Array.from({ length: 8 }, () => `${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(2).toString('hex')}`);
    const hashedRecoveryCodes = rawRecoveryCodes.map(rc => ({ hash: hash(rc), used: false }));

    user.totpSecret = user.totpTempSecret;
    user.totpEnabled = true;
    user.totpTempSecret = null;
    user.recoveryCodes = hashedRecoveryCodes;
    save(data);

    return json(res, 200, { message: 'Two-Factor Authentication enabled.', recoveryCodes: rawRecoveryCodes });
  }

  if (method === 'POST' && url.pathname === '/api/2fa/disable') {
    const currentPassword = String(body.currentPassword || '');
    const code = inputString(body.code, 20);

    if (!matches(currentPassword, user.passwordHash)) {
      return json(res, 400, { error: 'Invalid password or verification code.' });
    }

    let codeValid = verifyTOTP(user.totpSecret, code);
    if (!codeValid && user.recoveryCodes) {
      const rc = user.recoveryCodes.find(r => !r.used && matches(code.trim(), r.hash));
      if (rc) {
        rc.used = true;
        codeValid = true;
      }
    }

    if (!codeValid) {
      return json(res, 400, { error: 'Invalid password or verification code.' });
    }

    user.totpEnabled = false;
    user.totpSecret = null;
    user.totpTempSecret = null;
    user.recoveryCodes = null;
    save(data);

    return json(res, 200, { message: 'Two-Factor Authentication disabled.' });
  }
  if (url.pathname === '/api/profile' && method === 'PATCH') { for (const key of ['firstName', 'lastName', 'phone', 'city', 'country', 'photo', 'language', 'preferredCurrency']) if (body[key] !== undefined) user[key] = inputString(body[key], key === 'photo' ? 1000 : 100); save(data); return json(res, 200, cleanUser(user)); }
  if (method === 'POST' && url.pathname === '/api/profile/change-password') {
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!currentPassword) return json(res, 422, { error: 'Current password is required.' });
    if (!matches(currentPassword, user.passwordHash)) return json(res, 400, { error: 'Current password is incorrect.' });
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return json(res, 422, { error: 'New password must be at least 8 characters long and contain uppercase, lowercase, and a number.' });
    }
    if (newPassword !== confirmPassword) return json(res, 422, { error: 'Passwords do not match.' });

    user.passwordHash = hash(newPassword);
    data.sessions = data.sessions.filter(s => s.userId !== user.id);
    save(data);

    return json(res, 200, { message: 'Password changed successfully. Please sign in again.' });
  }
  if (url.pathname === '/api/profile' && method === 'DELETE') { if (body.confirm !== 'DELETE') return json(res, 422, { error: 'Type DELETE to confirm account deletion.' }); const owned = data.trips.filter(t => t.userId === user.id).map(t => t.id), stopIds = data.stops.filter(s => owned.includes(s.tripId)).map(s => s.id); data.activities = data.activities.filter(a => !stopIds.includes(a.stopId)); data.stops = data.stops.filter(s => !owned.includes(s.tripId)); data.trips = data.trips.filter(t => t.userId !== user.id); data.sessions = data.sessions.filter(s => s.userId !== user.id); data.users = data.users.filter(u => u.id !== user.id); save(data); return json(res, 204, {}); }
  if (method === 'GET' && url.pathname === '/api/trips') return json(res, 200, data.trips.filter(t => t.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(t => tripPayload(data, t)));
  if (method === 'POST' && url.pathname === '/api/trips') { const checked = validateTrip(body); if (checked.error) return json(res, checked.status || 422, { error: checked.error }); const trip = { id: id('trip'), userId: user.id, ...checked.value, isPublic: false, publicSlug: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; data.trips.push(trip); save(data); return json(res, 201, tripPayload(data, trip)); }
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'trips' && parts.length === 3) { const trip = getTrip(data, parts[2], user); return trip ? json(res, 200, tripPayload(data, trip)) : json(res, 404, { error: 'Trip not found.' }); }
  if (method === 'PUT' && parts[0] === 'api' && parts[1] === 'trips' && parts.length === 3) { const trip = getTrip(data, parts[2], user); if (!trip) return json(res, 404, { error: 'Trip not found.' }); const checked = validateTrip(body); if (checked.error) return json(res, checked.status || 422, { error: checked.error }); Object.assign(trip, checked.value, { updatedAt: new Date().toISOString() }); save(data); return json(res, 200, tripPayload(data, trip)); }
  if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'trips' && parts.length === 3) {
    const trip = getTrip(data, parts[2], user);
    if (!trip) return json(res, 404, { error: 'Trip not found.' });
    const stopIds = data.stops.filter(s => s.tripId === trip.id).map(s => s.id);
    data.activities = data.activities.filter(a => !stopIds.includes(a.stopId));
    data.stops = data.stops.filter(s => s.tripId !== trip.id);
    data.trips = data.trips.filter(t => t.id !== trip.id);
    save(data);
    return json(res, 200, { success: true, message: 'Trip deleted successfully.' });
  }
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'trips' && parts[3] === 'share') { const trip = getTrip(data, parts[2], user); if (!trip) return json(res, 404, { error: 'Trip not found.' }); trip.isPublic = Boolean(body.isPublic); trip.publicSlug = trip.isPublic ? (trip.publicSlug || publicSlug()) : null; save(data); return json(res, 200, { isPublic: trip.isPublic, publicSlug: trip.publicSlug }); }
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'trips' && parts[3] === 'copy') { const source = data.trips.find(t => t.id === parts[2] && t.isPublic); if (!source) return json(res, 404, { error: 'Shared itinerary not found.' }); const trip = { ...source, id: id('trip'), userId: user.id, name: `${source.name} (Copy)`, isPublic: false, publicSlug: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; data.trips.push(trip); for (const oldStop of data.stops.filter(s => s.tripId === source.id)) { const newStop = { ...oldStop, id: id('stop'), tripId: trip.id }; data.stops.push(newStop); data.activities.filter(a => a.stopId === oldStop.id).forEach(a => data.activities.push({ ...a, id: id('activity'), stopId: newStop.id })); } save(data); return json(res, 201, tripPayload(data, trip)); }
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'trips' && parts[3] === 'stops') {
    const trip = getTrip(data, parts[2], user);
    let city = inputString(body.city, 100), state = inputString(body.state || body.province, 80), country = inputString(body.country || (trip ? trip.country : ''), 80);
    const startDate = inputString(body.startDate, 10), endDate = inputString(body.endDate, 10), budget = body.budget == null || body.budget === '' ? null : Number(body.budget);

    if (!trip) return json(res, 404, { error: 'Trip not found.' });
    if (!country && trip.country) country = trip.country;

    if (country && !state && city && locationHierarchy[country]) {
      for (const [st, citiesList] of Object.entries(locationHierarchy[country])) {
        if (citiesList.some(c => c.toLowerCase() === city.toLowerCase())) {
          state = st;
          city = citiesList.find(c => c.toLowerCase() === city.toLowerCase());
          break;
        }
      }
    }

    if (trip.country && country !== trip.country) return json(res, 400, { error: 'Selected city does not belong to the selected country.' });
    if (!isValidLocation(country, state, city)) return json(res, 400, { error: 'Selected city does not belong to the selected country.' });
    if (!city || !startDate || !endDate || startDate > endDate || (budget != null && (!Number.isFinite(budget) || budget < 0))) return json(res, 422, { error: 'Enter a city, a valid date range, and a positive budget.' });

    const stop = { id: id('stop'), tripId: trip.id, country, state, city, startDate, endDate, budget, position: data.stops.filter(s => s.tripId === trip.id).length };
    data.stops.push(stop); save(data); return json(res, 201, stop);
  }
  if (method === 'PATCH' && parts[0] === 'api' && parts[1] === 'stops' && parts.length === 3) {
    const stop = data.stops.find(s => s.id === parts[2]); const trip = stop && getTrip(data, stop.tripId, user);
    if (!trip) return json(res, 404, { error: 'Stop not found.' });
    let city = inputString(body.city, 100), state = inputString(body.state || body.province, 80), country = inputString(body.country || trip.country, 80);
    const startDate = inputString(body.startDate, 10), endDate = inputString(body.endDate, 10);

    if (country && !state && city && locationHierarchy[country]) {
      for (const [st, citiesList] of Object.entries(locationHierarchy[country])) {
        if (citiesList.some(c => c.toLowerCase() === city.toLowerCase())) {
          state = st;
          city = citiesList.find(c => c.toLowerCase() === city.toLowerCase());
          break;
        }
      }
    }

    if (trip.country && country !== trip.country) return json(res, 400, { error: 'Selected city does not belong to the selected country.' });
    if (!isValidLocation(country, state, city)) return json(res, 400, { error: 'Selected city does not belong to the selected country.' });
    if (!city || !startDate || !endDate || startDate > endDate) return json(res, 422, { error: 'Enter a city and valid date range.' });
    Object.assign(stop, { country, state, city, startDate, endDate, budget: body.budget === '' || body.budget == null ? null : Number(body.budget) });
    save(data); return json(res, 200, stop);
  }
  if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'stops' && parts.length === 3) { const stop = data.stops.find(s => s.id === parts[2]); if (!stop || !getTrip(data, stop.tripId, user)) return json(res, 404, { error: 'Stop not found.' }); data.activities = data.activities.filter(a => a.stopId !== stop.id); data.stops = data.stops.filter(s => s.id !== stop.id); save(data); return json(res, 204, {}); }
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'stops' && parts[3] === 'activities') { const stop = data.stops.find(s => s.id === parts[2]); if (!stop || !getTrip(data, stop.tripId, user)) return json(res, 404, { error: 'Stop not found.' }); const name = inputString(body.name, 120), cost = Number(body.cost || 0), date = inputString(body.date, 10); if (!name || !date || !Number.isFinite(cost) || cost < 0) return json(res, 422, { error: 'Activity name, date, and a positive cost are required.' }); const activity = { id: id('activity'), stopId: stop.id, name, description: inputString(body.description, 500), date, time: inputString(body.time, 5), duration: Number(body.duration || 1), cost, category: inputString(body.category, 50) || 'Experience', location: inputString(body.location, 100), position: data.activities.filter(a => a.stopId === stop.id).length }; data.activities.push(activity); save(data); return json(res, 201, activity); }
  if ((method === 'PATCH' || method === 'DELETE') && parts[0] === 'api' && parts[1] === 'activities' && parts.length === 3) { const activity = data.activities.find(a => a.id === parts[2]); const stop = activity && data.stops.find(s => s.id === activity.stopId); if (!activity || !stop || !getTrip(data, stop.tripId, user)) return json(res, 404, { error: 'Activity not found.' }); if (method === 'DELETE') { data.activities = data.activities.filter(a => a.id !== activity.id); save(data); return json(res, 204, {}); } const name = inputString(body.name, 120), date = inputString(body.date, 10), cost = Number(body.cost || 0); if (!name || !date || !Number.isFinite(cost) || cost < 0) return json(res, 422, { error: 'Activity name, date, and a positive cost are required.' }); Object.assign(activity, { name, date, cost, description: inputString(body.description, 500), time: inputString(body.time, 5), duration: Number(body.duration || 1), category: inputString(body.category, 50) || 'Experience', location: inputString(body.location, 100) }); save(data); return json(res, 200, activity); }
  if (method === 'POST' && url.pathname === '/api/reorder') { const kind = body.kind === 'stop' ? 'stop' : body.kind === 'activity' ? 'activity' : null, ids = Array.isArray(body.ids) ? body.ids : []; const list = kind === 'stop' ? data.stops : data.activities; const entries = ids.map(x => list.find(i => i.id === x)).filter(Boolean); if (!kind || entries.length !== ids.length) return json(res, 422, { error: 'Invalid reorder request.' }); const tripId = kind === 'stop' ? entries[0].tripId : data.stops.find(s => s.id === entries[0].stopId)?.tripId; const sameParent = kind === 'stop' ? entries.every(e => e.tripId === tripId) : entries.every(e => e.stopId === entries[0].stopId); if (!tripId || !sameParent || !getTrip(data, tripId, user)) return json(res, 403, { error: 'You cannot reorder these items.' }); entries.forEach((entry, index) => entry.position = index); save(data); return json(res, 204, {}); }
  if (method === 'GET' && url.pathname === '/api/analytics') {
    const userTrips = data.trips.filter(t => t.userId === user.id);
    const tripIds = userTrips.map(t => t.id);
    const userStops = data.stops.filter(s => tripIds.includes(s.tripId));
    const stopIds = userStops.map(s => s.id);
    const userActivities = data.activities.filter(a => stopIds.includes(a.stopId));

    const totalTrips = userTrips.length;
    const totalStops = userStops.length;
    const totalActivities = userActivities.length;

    const citiesSet = new Set(userStops.map(s => s.city).filter(Boolean));
    const citiesPlanned = citiesSet.size;

    const totalBudget = userTrips.reduce((sum, t) => sum + Number(t.budget || 0), 0);
    const totalSpending = userActivities.reduce((sum, a) => sum + Number(a.cost || 0), 0);

    const now = new Date().toISOString().slice(0, 10);
    let upcomingTrips = 0, ongoingTrips = 0, completedTrips = 0;
    let totalDays = 0;

    userTrips.forEach(t => {
      if (t.endDate < now) completedTrips++;
      else if (t.startDate > now) upcomingTrips++;
      else ongoingTrips++;

      const start = new Date(`${t.startDate}T00:00:00`), end = new Date(`${t.endDate}T00:00:00`);
      const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
      totalDays += days;
    });

    const averageTripCost = totalTrips ? Math.round((totalSpending / totalTrips) * 100) / 100 : 0;
    const averageTripDuration = totalTrips ? Math.round((totalDays / totalTrips) * 10) / 10 : 0;

    const destCounts = {};
    userStops.forEach(s => { if (s.city) destCounts[s.city] = (destCounts[s.city] || 0) + 1; });
    userTrips.forEach(t => { if (t.destination) destCounts[t.destination] = (destCounts[t.destination] || 0) + 1; });
    const sortedDestinations = Object.entries(destCounts).sort((a, b) => b[1] - a[1]);
    const mostPlannedDestination = sortedDestinations.length ? sortedDestinations[0][0] : 'None';

    const categoryTotals = {};
    userActivities.forEach(a => {
      const cat = a.category || 'Experience';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(a.cost || 0);
    });

    const expenseBreakdown = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpending ? Math.round((amount / totalSpending) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const monthlyCounts = {};
    userTrips.forEach(t => {
      if (t.startDate) {
        const monthKey = t.startDate.slice(0, 7);
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
      }
    });

    const monthlyActivity = Object.entries(monthlyCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => {
        const date = new Date(`${month}-01T12:00:00`);
        const label = isNaN(date.getTime()) ? month : new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date);
        return { month, label, count };
      });

    const topDestinations = sortedDestinations.slice(0, 5).map(([name, count]) => ({ name, count }));

    return json(res, 200, {
      totalTrips,
      totalStops,
      totalActivities,
      citiesPlanned,
      totalBudget,
      totalSpending,
      remainingBudget: totalBudget ? totalBudget - totalSpending : 0,
      budgetUtilization: totalBudget ? Math.min(100, Math.round((totalSpending / totalBudget) * 100)) : 0,
      averageTripCost,
      averageTripDuration,
      mostPlannedDestination,
      upcomingTrips,
      ongoingTrips,
      completedTrips,
      expenseBreakdown,
      monthlyActivity,
      topDestinations
    });
  }
  if (method === 'GET' && url.pathname === '/api/admin/analytics') { if (user.role !== 'admin') return json(res, 403, { error: 'Administrator access required.' }); const cityCounts = {}; data.stops.forEach(s => cityCounts[s.city] = (cityCounts[s.city] || 0) + 1); const actCounts = {}; data.activities.forEach(a => actCounts[a.category] = (actCounts[a.category] || 0) + 1); return json(res, 200, { users: data.users.length, trips: data.trips.length, publicTrips: data.trips.filter(t => t.isPublic).length, cities: Object.entries(cityCounts).map(([name, count]) => ({ name, count })).sort((a,b)=>b.count-a.count), activities: Object.entries(actCounts).map(([name, count]) => ({ name, count })).sort((a,b)=>b.count-a.count), signups: data.users.map(u => ({ date: u.createdAt.slice(0,10), count: 1 })) }); }
  return json(res, 404, { error: 'Endpoint not found.' });
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    const file = url.pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.normalize(path.join(PUBLIC_DIR, url.pathname));
    if (!file.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'Forbidden' });
    const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(PUBLIC_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); fs.createReadStream(target).pipe(res);
  } catch (err) { errorHandler(res, err); }
});
server.listen(PORT, () => console.log(`GlobeTrotter is running at http://localhost:${PORT}`));
