const app = document.querySelector('#app');
const state = {
  token: localStorage.getItem('gt_token'),
  user: null,
  trips: [],
  route: location.hash.slice(1) || '/',
  busy: false,
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  calInitialized: false,
  locations: null,
  exchangeRates: {},
  convertedRatesCache: {}
};

let currentAIPlan = null;

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

const supportedCurrencies = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' }
];

function getCurrencyInfo(key) {
  if (!key) return { code: 'INR', symbol: '₹', locale: 'en-IN' };
  const clean = String(key).trim();
  if (countryCurrencyMap[clean]) return countryCurrencyMap[clean];

  const byCode = Object.values(countryCurrencyMap).find(x => x.code === clean.toUpperCase());
  if (byCode) return byCode;

  for (const [c, info] of Object.entries(countryCurrencyMap)) {
    if (clean.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(clean.toLowerCase())) {
      return info;
    }
  }

  return { code: 'USD', symbol: '$', locale: 'en-US' };
}

function money(n, key = 'INR') {
  const num = Number(n || 0);
  const info = getCurrencyInfo(key);
  try {
    return new Intl.NumberFormat(info.locale || 'en-US', {
      style: 'currency',
      currency: info.code,
      maximumFractionDigits: ['JPY', 'KRW', 'VND', 'IDR'].includes(info.code) ? 0 : 0
    }).format(num);
  } catch {
    return `${info.symbol}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num)}`;
  }
}

// Client-side Exchange Rate Cache & Helper
async function getRate(fromCode, toCode) {
  const from = String(fromCode || 'USD').toUpperCase();
  const to = String(toCode || 'USD').toUpperCase();
  const key = `${from}_${to}`;

  if (from === to) {
    return { from, to, rate: 1.0, isLive: true, source: 'Home Currency', lastUpdated: new Date().toISOString() };
  }

  if (state.convertedRatesCache[key]) {
    return state.convertedRatesCache[key];
  }

  try {
    const data = await api(`/api/currency/rate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    state.convertedRatesCache[key] = data;
    return data;
  } catch {
    const fallbackRates = { USD: 1.0, INR: 83.5, EUR: 0.92, GBP: 0.79, JPY: 155.0, CNY: 7.23, AUD: 1.51, CAD: 1.36, SGD: 1.35, AED: 3.67, CHF: 0.90, KRW: 1370.0, THB: 36.5, IDR: 16000.0, VND: 25400.0, TRY: 32.2, BRL: 5.15, MXN: 16.7, ZAR: 18.4, NZD: 1.64, MYR: 4.72 };
    const fRate = (1 / (fallbackRates[from] || 1.0)) * (fallbackRates[to] || 1.0);
    const fallbackData = { from, to, rate: fRate, isLive: false, source: 'Cached Exchange Rate', lastUpdated: new Date().toISOString() };
    state.convertedRatesCache[key] = fallbackData;
    return fallbackData;
  }
}

async function convertAmount(amount, fromCode, toCode) {
  const num = Number(amount || 0);
  const rateInfo = await getRate(fromCode, toCode);
  return {
    ...rateInfo,
    amount: num,
    convertedAmount: Math.round(num * rateInfo.rate * 100) / 100
  };
}

// Dual-Currency Formatter Component (Destination Currency + Live INR Reference)
function renderDualMoney(amount, destCurrencyKey, inline = false) {
  const num = Number(amount || 0);
  const info = getCurrencyInfo(destCurrencyKey);
  const destStr = money(num, info.code);

  if (info.code === 'INR') {
    return `<b>${destStr}</b>`;
  }

  const uid = 'dual_' + Math.random().toString(36).slice(2, 9);

  setTimeout(async () => {
    const el = document.getElementById(uid);
    if (!el) return;
    try {
      const res = await convertAmount(num, info.code, 'INR');
      el.innerHTML = `≈ ${money(res.convertedAmount, 'INR')}`;
    } catch {
      el.innerHTML = '';
    }
  }, 10);

  if (inline) {
    return `<b>${destStr}</b> <span id="${uid}" style="font-size:0.88em;color:var(--teal);font-weight:normal">(≈ … INR)</span>`;
  }

  return `
    <div>
      <b>${destStr}</b>
      <div id="${uid}" style="font-size:12px;color:var(--teal);font-weight:normal">≈ … INR</div>
    </div>
  `;
}

const $ = (s, root = document) => root.querySelector(s);
const escape = v => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

const fmtDate = d => d ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${d}T12:00:00`)) : '';
const initials = u => `${u?.firstName?.[0] || ''}${u?.lastName?.[0] || ''}`.toUpperCase() || 'GT';
const cover = trip => trip && trip.coverImage ? `style="background-image:linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.45)), url('${escape(trip.coverImage)}')"` : '';

async function loadLocations() {
  if (!state.locations) {
    try {
      state.locations = await api('/api/locations');
    } catch {
      state.locations = {
        'India': { 'Gujarat': ['Vadodara', 'Ahmedabad', 'Surat'], 'Maharashtra': ['Mumbai', 'Pune'] },
        'Australia': { 'Victoria': ['Melbourne', 'Geelong'], 'New South Wales': ['Sydney'] },
        'Japan': { 'Tokyo': ['Tokyo'], 'Kansai': ['Kyoto', 'Osaka'] }
      };
    }
  }
  return state.locations;
}

function avatarHtml(u) {
  if (u?.photo) {
    return `<span class="avatar" style="background-image:url('${escape(u.photo)}');background-size:cover;background-position:center"></span>`;
  }
  return `<span class="avatar">${initials(u)}</span>`;
}

function profilePhotoHtml(u) {
  if (u?.photo) {
    return `<div class="profile-photo" style="background-image:url('${escape(u.photo)}');background-size:cover;background-position:center"></div>`;
  }
  return `<div class="profile-photo">${initials(u)}</div>`;
}

function toast(message) {
  const region = $('#toast-region') || document.body;
  const item = document.createElement('div');
  item.className = 'toast';
  item.textContent = message;
  region.append(item);
  setTimeout(() => item.remove(), 3200);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong.');
    err.status = res.status;
    err.unverified = data.unverified;
    err.email = data.email;
    err.totpRequired = data.totpRequired;
    throw err;
  }
  return data;
}

function nav(path) {
  const targetHash = path.startsWith('#') ? path : '#' + path;
  if (location.hash === targetHash) {
    render();
  } else {
    location.hash = targetHash;
  }
}

function formatUserName(u) {
  if (!u) return 'GlobeTrotter User';
  const f = (u.firstName || '').trim();
  const l = (u.lastName || '').trim();
  if (f && l) return `${f} ${l}`;
  if (f) return f;
  if (l) return l;
  return 'GlobeTrotter User';
}

function shell(content, active = '') {
  return `
    <header class="topbar">
      <div class="shell navbar-inner">
        <a class="brand" href="#/"><img class="brand-logo" src="/logo.png" alt="GlobeTrotter Logo">Globe<span>Trotter</span></a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Toggle Navigation">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <nav class="nav" id="main-nav">
          <a class="${active === 'dashboard' ? 'active' : ''}" href="#/">Dashboard</a>
          <a class="${active === 'trips' ? 'active' : ''}" href="#/trips">My Trips</a>
          <a class="${active === 'discover' ? 'active' : ''}" href="#/discover">Discover</a>
          <a class="${active === 'ai-planner' ? 'active' : ''}" href="#/ai-planner">AI Planner</a>
          <a class="${active === 'converter' ? 'active' : ''}" href="#/converter">Converter</a>
          <a class="${active === 'analytics' ? 'active' : ''}" href="#/analytics">Analytics</a>
          <a class="${active === 'calendar' ? 'active' : ''}" href="#/calendar">Calendar</a>
          ${state.user?.role === 'admin' ? `<a class="${active === 'admin' ? 'active' : ''}" href="#/admin">Admin</a>` : ''}
        </nav>
        <div class="nav-right">
          <a class="user-pill" href="#/profile" title="View Profile">
            ${avatarHtml(state.user)}
            <span class="user-name">${escape(formatUserName(state.user))}</span>
          </a>
          <button class="icon-btn" data-logout title="Sign out" aria-label="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>
    <main class="shell">${content}</main>
    <footer class="shell footer">© 2026 GlobeTrotter</footer>
  `;
}

function tripStatus(t) {
  const now = new Date().toISOString().slice(0, 10);
  return t.endDate < now ? 'Completed' : t.startDate > now ? 'Upcoming' : 'Ongoing';
}

function tripCard(t) {
  const stopCount = t.stops ? t.stops.length : 0;
  const curr = t.currencyCode || t.country;

  return `
    <article class="card trip-card">
      <div class="trip-image" ${cover(t)}></div>
      <div class="content">
        <span class="tag">${tripStatus(t)}</span>
        <h3>${escape(t.name)}</h3>
        <p class="trip-meta">${escape(t.destination)} · ${fmtDate(t.startDate)} — ${fmtDate(t.endDate)}</p>
        <p class="trip-meta">
          ${stopCount} ${stopCount === 1 ? 'stop' : 'stops'} · ${renderDualMoney(t.actualCost, curr, true)} planned${t.budget != null ? ` / ${renderDualMoney(t.budget, curr, true)} budget` : ''}
        </p>
        <div class="card-actions">
          <a class="btn small" href="#/trip/${t.id}">View</a>
          <a class="btn small secondary" href="#/builder/${t.id}">Edit itinerary</a>
          <a class="btn small secondary" href="#/edit-trip/${t.id}">Details</a>
          <button class="btn small ghost danger-text" data-delete="${t.id}">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function empty(title, body, link = '#/new-trip', cta = 'Plan a trip') {
  return `
    <div class="empty">
      <h3>${title}</h3>
      <p>${body}</p>
      ${link ? `<a class="btn" href="${link}">${cta}</a>` : ''}
    </div>
  `;
}

function mount(html) {
  if (app) {
    app.innerHTML = html;
  }
  bindCommon();
}

async function signOut() {
  try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch {}
  localStorage.removeItem('gt_token');
  state.token = null;
  state.user = null;
  state.trips = [];
  nav('/login');
}

function bindCommon() {
  document.querySelectorAll('[data-delete]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('Delete this trip and all of its stops and activities? This cannot be undone.')) return;
      try {
        await api(`/api/trips/${b.dataset.delete}`, { method: 'DELETE', body: '{}' });
        toast('Trip deleted.');
        await loadTrips();
        render();
      } catch (e) {
        toast(e.message);
      }
    };
  });
  document.querySelectorAll('[data-logout]').forEach(b => b.onclick = signOut);

  const toggle = $('#nav-toggle');
  const mainNav = $('#main-nav');
  if (toggle && mainNav) {
    toggle.onclick = () => {
      mainNav.classList.toggle('open');
    };
  }
}

async function loadTrips() {
  if (!state.token) {
    state.trips = [];
    return;
  }
  try {
    state.trips = await api('/api/trips');
  } catch {
    state.trips = [];
  }
}

function showWelcomeScreen() {
  mount(`
    <div class="welcome-overlay">
      <div class="welcome-card">
        <a class="brand welcome-brand" href="#/"><img class="brand-logo" src="/logo.png" alt="GlobeTrotter Logo" style="height:42px;width:42px">Globe<span>Trotter</span></a>
        <h1 class="welcome-title">Welcome, GlobeTrotter</h1>
        <p class="welcome-sub">Your trips and travel plans</p>
        <div class="welcome-loader">
          <div class="welcome-bar"></div>
        </div>
      </div>
    </div>
  `);

  setTimeout(() => {
    dashboardImpl();
  }, 1250);
}

function dashboard() {
  if (state.justLoggedIn) {
    state.justLoggedIn = false;
    showWelcomeScreen();
    return;
  }
  dashboardImpl();
}

function dashboardImpl() {
  const featuredTrip = state.trips[0] || null;
  const otherTrips = state.trips.slice(1, 4);
  const recent = state.trips.length > 1 ? otherTrips : state.trips.slice(0, 3);
  const cities = [...new Set(state.trips.flatMap(t => (t.stops || []).map(s => s.city)))].slice(0, 8);
  const totalStops = state.trips.reduce((n, t) => n + (t.stops ? t.stops.length : 0), 0);
  const totalPlannedSpend = state.trips.reduce((sum, t) => sum + (Number(t.actualCost) || Number(t.budget) || 0), 0);

  mount(shell(`
    <section class="page-head">
      <div>
        <div class="eyebrow">Overview</div>
        <h2>Welcome, GlobeTrotter</h2>
        <p>Your trips and travel plans</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn secondary" href="#/ai-planner">✨ AI Trip Planner</a>
        <a class="btn" href="#/new-trip">+ Plan a trip</a>
      </div>
    </section>

    <section class="stats-bar card">
      <div class="stat-item">
        <span class="stat-num">${state.trips.length}</span>
        <span class="stat-label">TRIPS</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-num">${cities.length || 0}</span>
        <span class="stat-label">DESTINATIONS</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-num">${totalStops}</span>
        <span class="stat-label">STOPS</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-num">${renderDualMoney(totalPlannedSpend, 'INR', true)}</span>
        <span class="stat-label">PLANNED SPEND</span>
      </div>
    </section>

    ${featuredTrip ? `
      <section class="section">
        <div class="section-title">
          <div>
            <h2>Featured Trip</h2>
            <p>Your primary upcoming itinerary</p>
          </div>
          <span class="tag gold">Featured</span>
        </div>
        <article class="card featured-trip-card">
          <div class="featured-trip-image" ${cover(featuredTrip)}></div>
          <div class="featured-trip-details">
            <span class="tag">${tripStatus(featuredTrip)}</span>
            <h2 class="featured-title">${escape(featuredTrip.name || featuredTrip.destination)}</h2>
            <p class="featured-sub">${escape(featuredTrip.destination)} · ${fmtDate(featuredTrip.startDate)} — ${fmtDate(featuredTrip.endDate)}</p>
            <div class="featured-stats-row">
              <div>
                <span class="lbl">Planned Spend</span>
                <span class="val">${renderDualMoney(featuredTrip.actualCost || featuredTrip.budget || 0, featuredTrip.currencyCode || featuredTrip.country, true)}</span>
              </div>
              <div>
                <span class="lbl">Stops Planned</span>
                <span class="val">${(featuredTrip.stops || []).length} stops</span>
              </div>
            </div>
            <div class="featured-actions">
              <a class="btn" href="#/trip/${featuredTrip.id}">View trip →</a>
              <a class="btn secondary" href="#/builder/${featuredTrip.id}">Edit itinerary</a>
            </div>
          </div>
        </article>
      </section>
    ` : ''}

    <section class="section">
      <div class="section-title">
        <div>
          <h2>Your trips</h2>
          <p>Upcoming, ongoing, and completed itineraries.</p>
        </div>
        <a class="btn ghost" href="#/trips">View all trips →</a>
      </div>
      ${recent.length ? `<div class="grid three" style="gap:16px">${recent.map(tripCard).join('')}</div>` : empty('No trips created yet.', 'Create your first trip to start building an itinerary.', '#/new-trip', 'Plan a trip')}
    </section>

    <section class="section">
      <div class="section-title">
        <div>
          <h2>Explore Destinations</h2>
          <p>Explore popular destinations and plan your next adventure.</p>
        </div>
        <a class="btn ghost" href="#/discover">Explore all →</a>
      </div>
      <div class="grid three">
        <article class="card trip-card">
          <div class="trip-image" style="background-image:url('https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80')"></div>
          <div class="content">
            <span class="tag">Japan</span>
            <h3 style="margin-top:8px">Tokyo</h3>
            <p class="trip-meta">Shibuya crossing, historic shrines, and world-class ramen.</p>
            <a class="btn ghost small" href="#/new-trip">Plan a trip here →</a>
          </div>
        </article>
        <article class="card trip-card">
          <div class="trip-image" style="background-image:url('https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80')"></div>
          <div class="content">
            <span class="tag">France</span>
            <h3 style="margin-top:8px">Paris</h3>
            <p class="trip-meta">Eiffel Tower views, Louvre museum, and Seine river cruises.</p>
            <a class="btn ghost small" href="#/new-trip">Plan a trip here →</a>
          </div>
        </article>
        <article class="card trip-card">
          <div class="trip-image" style="background-image:url('https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80')"></div>
          <div class="content">
            <span class="tag">UAE</span>
            <h3 style="margin-top:8px">Dubai</h3>
            <p class="trip-meta">Burj Khalifa heights, desert safaris, and luxury marina walks.</p>
            <a class="btn ghost small" href="#/new-trip">Plan a trip here →</a>
          </div>
        </article>
      </div>
    </section>
  `, 'dashboard'));
}

function authError(message) {
  const container = $('#form-error');
  if (container) {
    container.innerHTML = `<div class="alert" role="alert">${escape(message)}</div>`;
  }
}

let forgotState = { step: 1, email: '', resetAuthToken: '' };

function authPage(mode) {
  const register = mode === 'register';
  const forgot = mode === 'forgot-password';
  const reset = mode === 'reset-password';
  const verify = mode === 'verify-email';

  const hashParts = location.hash.split('?');
  const urlParams = new URLSearchParams(hashParts[1] || '');
  const queryToken = urlParams.get('token') || '';

  if (verify) {
    mount(`
      <div class="auth">
        <aside class="auth-art">
          <a class="brand" href="#/">Globe<span>Trotter</span></a>
          <div><h1>GlobeTrotter</h1><p>Trip planning and itinerary management.</p></div>
        </aside>
        <main class="auth-panel">
          <a class="brand" href="#/">Globe<span>Trotter</span></a>
          <div style="height:38px"></div>
          <h2>Email Verification</h2>
          <div id="verify-status" style="margin-top:16px"><div class="alert">Verifying token…</div></div>
          <div style="margin-top:20px"><a class="btn" href="#/login">Go to Login</a></div>
        </main>
      </div>
    `);

    if (queryToken) {
      api('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: queryToken }) })
        .then(res => {
          const el = $('#verify-status');
          if (el) el.innerHTML = `<div class="alert" style="background:#e7f4e8;color:#1e5e27;border-color:#bce3c1">${escape(res.message)}</div>`;
        })
        .catch(err => {
          const el = $('#verify-status');
          if (el) el.innerHTML = `<div class="alert" role="alert">${escape(err.message)}</div>`;
        });
    } else {
      const el = $('#verify-status');
      if (el) el.innerHTML = `<div class="alert" role="alert">No verification token provided.</div>`;
    }
    return;
  }

  if (forgot) {
    const renderForgotStep = () => {
      mount(`
        <div class="auth">
          <aside class="auth-art">
            <div></div>
            <div class="auth-hero-body">
              <div class="auth-eyebrow">TRAVEL, WITH INTENTION</div>
              <h1 class="auth-headline">Every memorable<br>trip starts with a<br>good plan.</h1>
              <p class="auth-subtext">Keep destinations, days, and budgets moving in the same direction.</p>
            </div>
            <div class="auth-footer-note">Designed for the trips you’ll talk about for years.</div>
          </aside>
          <main class="auth-panel">
            <h2>Forgot Password</h2>

            ${forgotState.step === 1 ? `
              <p style="color:var(--muted)">Enter your registered email address.</p>
              <form id="forgot-step1-form" class="form" novalidate>
                <div class="field">
                  <label for="forgot-email">Email address</label>
                  <input id="forgot-email" name="email" type="email" autocomplete="email" required value="${escape(forgotState.email)}">
                </div>
                <div id="form-error"></div>
                <button class="btn" type="submit">Continue</button>
              </form>
            ` : forgotState.step === 2 ? `
              <p style="color:var(--muted)">Enter the 6-digit code from Google Authenticator (or single-use recovery code) for <b>${escape(forgotState.email)}</b>.</p>
              <form id="forgot-step2-form" class="form" novalidate>
                <div class="field">
                  <label for="totp-code">Verification Code</label>
                  <input id="totp-code" name="code" required placeholder="e.g. 123456 or a1b2-c3d4" autocomplete="one-time-code" autofocus>
                </div>
                <div id="form-error"></div>
                <button class="btn" type="submit">Verify Code</button>
              </form>
            ` : `
              <p style="color:var(--muted)">Enter your new password below.</p>
              <form id="forgot-step3-form" class="form" novalidate>
                <div class="field">
                  <label for="new-password">New Password</label>
                  <input id="new-password" name="newPassword" type="password" autocomplete="new-password" required>
                </div>
                <div class="field">
                  <label for="confirm-password">Confirm Password</label>
                  <input id="confirm-password" name="confirmPassword" type="password" autocomplete="new-password" required>
                </div>
                <div id="form-error"></div>
                <button class="btn" type="submit">Reset Password</button>
              </form>
            `}

            <p class="form-note">Remembered your password? <a href="#/login" id="reset-forgot-link">Sign in</a></p>
          </main>
        </div>
      `);

      const resetLink = $('#reset-forgot-link');
      if (resetLink) resetLink.onclick = () => { forgotState = { step: 1, email: '', resetAuthToken: '' }; };

      if (forgotState.step === 1) {
        const form = $('#forgot-step1-form');
        if (form) {
          form.onsubmit = async e => {
            e.preventDefault();
            const email = String(new FormData(e.target).get('email') || '').trim().toLowerCase();
            if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
              authError('Enter a valid email address.');
              return;
            }
            try {
              const res = await api('/api/auth/forgot-password-check', { method: 'POST', body: JSON.stringify({ email }) });
              if (res.totpRequired) {
                forgotState.email = email;
                forgotState.step = 2;
                renderForgotStep();
              } else {
                toast('If an account exists for this email, password reset instructions have been sent.');
                nav('/login');
              }
            } catch (err) {
              authError(err.message);
            }
          };
        }
      } else if (forgotState.step === 2) {
        const form = $('#forgot-step2-form');
        if (form) {
          form.onsubmit = async e => {
            e.preventDefault();
            const code = String(new FormData(e.target).get('code') || '').trim();
            if (!code) {
              authError('Invalid verification code.');
              return;
            }
            try {
              const res = await api('/api/auth/verify-2fa-reset', { method: 'POST', body: JSON.stringify({ email: forgotState.email, code }) });
              forgotState.resetAuthToken = res.resetAuthToken;
              forgotState.step = 3;
              renderForgotStep();
            } catch (err) {
              authError(err.message);
            }
          };
        }
      } else if (forgotState.step === 3) {
        const form = $('#forgot-step3-form');
        if (form) {
          form.onsubmit = async e => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            const newPassword = String(data.newPassword || '');
            if (!newPassword || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
              authError('Password must be at least 8 characters long and contain uppercase, lowercase, and a number.');
              return;
            }
            if (newPassword !== data.confirmPassword) {
              authError('Passwords do not match.');
              return;
            }
            try {
              const res = await api('/api/auth/reset-password-2fa', {
                method: 'POST',
                body: JSON.stringify({ email: forgotState.email, resetAuthToken: forgotState.resetAuthToken, newPassword, confirmPassword: data.confirmPassword })
              });
              toast(res.message);
              forgotState = { step: 1, email: '', resetAuthToken: '' };
              nav('/login');
            } catch (err) {
              authError(err.message);
            }
          };
        }
      }
    };

    renderForgotStep();
    return;
  }

  if (reset) {
    mount(`
      <div class="auth">
        <aside class="auth-art">
          <div></div>
          <div class="auth-hero-body">
            <div class="auth-eyebrow">TRAVEL, WITH INTENTION</div>
            <h1 class="auth-headline">Every memorable<br>trip starts with a<br>good plan.</h1>
            <p class="auth-subtext">Keep destinations, days, and budgets moving in the same direction.</p>
          </div>
          <div class="auth-footer-note">Designed for the trips you’ll talk about for years.</div>
        </aside>
        <main class="auth-panel">
          <h2>Reset Password</h2>
          <p style="color:var(--muted)">Enter your new password below.</p>

          <form id="reset-form" class="form" novalidate>
            <input type="hidden" name="token" value="${escape(queryToken)}">
            ${!queryToken ? `
              <div class="field">
                <label>Reset Token</label>
                <input name="token" required placeholder="Paste reset token">
              </div>
            ` : ''}
            <div class="field">
              <label for="reset-password">New password</label>
              <input id="reset-password" name="newPassword" type="password" autocomplete="new-password" required>
            </div>
            <div class="field">
              <label for="reset-confirm">Confirm new password</label>
              <input id="reset-confirm" name="confirmPassword" type="password" autocomplete="new-password" required>
            </div>
            <div id="form-error"></div>
            <button class="btn" type="submit">Reset password</button>
          </form>

          <p class="form-note">Return to <a href="#/login">Sign in</a></p>
        </main>
      </div>
    `);

    const form = $('#reset-form');
    if (form) {
      form.onsubmit = async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const newPassword = String(data.newPassword || '');
        if (!newPassword || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
          authError('Password must be at least 8 characters long and contain uppercase, lowercase, and a number.');
          return;
        }
        if (newPassword !== data.confirmPassword) {
          authError('Passwords do not match.');
          return;
        }
        try {
          const res = await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(data) });
          toast(res.message);
          nav('/login');
        } catch (err) {
          authError(err.message);
        }
      };
    }
    return;
  }

  mount(`
    <div class="auth">
      <aside class="auth-art">
        <div></div>
        <div class="auth-hero-body">
          <div class="auth-eyebrow">TRAVEL, WITH INTENTION</div>
          <h1 class="auth-headline">Every memorable<br>trip starts with a<br>good plan.</h1>
          <p class="auth-subtext">Keep destinations, days, and budgets moving in the same direction.</p>
        </div>
        <div class="auth-footer-note">Designed for the trips you’ll talk about for years.</div>
      </aside>
      <main class="auth-panel">
        <h2>${register ? 'Create account' : 'Login'}</h2>
        <p style="color:var(--muted)">${register ? 'Enter your details to create an account.' : 'Enter your email address and password to continue.'}</p>

        <form id="auth-form" class="form" novalidate>
          ${register ? `
            <div class="form-row">
              <div class="field">
                <label for="first-name">First name</label>
                <input id="first-name" name="firstName" autocomplete="given-name">
              </div>
              <div class="field">
                <label for="last-name">Last name</label>
                <input id="last-name" name="lastName" autocomplete="family-name">
              </div>
            </div>
          ` : ''}

          <div class="field">
            <label for="auth-email">Email address</label>
            <input id="auth-email" name="email" type="email" autocomplete="email" aria-describedby="form-error">
          </div>

          <div class="field">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <label for="password">Password</label>
              ${!register ? '<a href="#/forgot-password" style="font-size:12px;color:var(--teal)">Forgot password?</a>' : ''}
            </div>
            <div style="display:flex;gap:6px">
              <input name="password" id="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" aria-describedby="form-error">
              <button type="button" class="btn secondary small" id="show-password" aria-controls="password" aria-pressed="false">Show</button>
            </div>
          </div>

          ${register ? `
            <div class="field">
              <label for="confirm-password">Confirm password</label>
              <input name="confirmPassword" id="confirm-password" type="password" autocomplete="new-password" aria-describedby="form-error">
            </div>
          ` : ''}

          <div id="form-error" aria-live="polite"></div>

          <button class="btn" type="submit">${register ? 'Create account' : 'Sign in'}</button>
        </form>

        <p class="form-note">
          ${register ? 'Already have an account? <a href="#/login">Sign in</a>' : 'Don’t have an account? <a href="#/register">Create an account</a>'}
        </p>
      </main>
    </div>
  `);

  const showPasswordBtn = $('#show-password');
  if (showPasswordBtn) {
    showPasswordBtn.onclick = () => {
      const show = $('#password')?.type === 'password';
      ['#password', '#confirm-password'].forEach(selector => {
        const field = $(selector);
        if (field) field.type = show ? 'text' : 'password';
      });
      showPasswordBtn.textContent = show ? 'Hide' : 'Show';
      showPasswordBtn.setAttribute('aria-pressed', String(show));
    };
  }

  const authForm = $('#auth-form');
  if (authForm) {
    authForm.onsubmit = async e => {
      e.preventDefault();
      const button = $('#auth-form button[type=submit]');
      const form = Object.fromEntries(new FormData(e.target));
      const email = String(form.email || '').trim().toLowerCase();
      const password = String(form.password || '');
      const validation = [];

      if (register && !String(form.firstName || '').trim()) validation.push('Enter your first name.');
      if (register && !String(form.lastName || '').trim()) validation.push('Enter your last name.');
      if (!email) validation.push('Enter your email address.');
      else if (!/^\S+@\S+\.\S+$/.test(email)) validation.push('Enter a valid email address.');
      if (!password) validation.push('Enter your password.');
      else if (register && (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password))) {
        validation.push('Password must be at least 8 characters long and contain uppercase, lowercase, and a number.');
      }
      else if (register && password !== form.confirmPassword) validation.push('Passwords do not match.');

      if (validation.length) {
        authError(validation[0]);
        return;
      }

      if (button) {
        button.disabled = true;
        button.textContent = register ? 'Creating account…' : 'Signing in…';
      }

      try {
        const data = await api(`/api/auth/${register ? 'register' : 'login'}`, {
          method: 'POST',
          body: JSON.stringify({ ...form, email })
        });

        if (data.totpRequired) {
          if (button) {
            button.disabled = false;
            button.textContent = 'Sign in';
          }
          showModal('Google Authenticator 2FA Required', `
            <p style="color:var(--muted);font-size:13.5px">Enter the 6-digit code from Google Authenticator (or a single-use recovery code) to complete sign-in.</p>
            <div class="field" style="margin-top:12px">
              <label for="login-totp-code">Verification Code</label>
              <input id="login-totp-code" name="totpCode" placeholder="e.g. 123456 or a1b2-c3d4" autocomplete="one-time-code" autofocus required>
            </div>
          `, async d => {
            const totpCode = String(d.totpCode || '').trim();
            if (!totpCode) throw new Error('Verification code is required.');

            const res = await api('/api/auth/login', {
              method: 'POST',
              body: JSON.stringify({ email, password, totpCode })
            });

            if (!res.token || !res.user) throw new Error('AUTH_RESPONSE');
            state.token = res.token;
            state.user = res.user;
            localStorage.setItem('gt_token', res.token);
            await loadTrips();
            state.justLoggedIn = true;
            nav('/');
            toast('Signed in.');
          }, 'Verify & Sign In');
          return;
        }

        if (register && data.devVerifyLink) {
          const errBox = $('#form-error');
          if (errBox) {
            errBox.innerHTML = `<div class="alert" style="background:#e7f4e8;color:#1e5e27;border-color:#bce3c1">Account created! Verification link sent.</div><div style="margin-top:8px;font-size:12px"><a href="${data.devVerifyLink}">Click to verify account (Dev Mode)</a></div>`;
          }
          if (button) {
            button.disabled = false;
            button.textContent = 'Create account';
          }
          return;
        }

        if (!data.token || !data.user) throw new Error('AUTH_RESPONSE');
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('gt_token', data.token);
        await loadTrips();
        if (!register) {
          state.justLoggedIn = true;
        }
        nav('/');
        toast(register ? 'Account created.' : 'Signed in.');
      } catch (err) {
        authError(err.message);
        if (err.unverified && err.email) {
          const errBox = $('#form-error');
          if (errBox) {
            errBox.innerHTML += `<div style="margin-top:8px;font-size:12px"><a href="#/verify-email" id="dev-quick-verify">Click to verify account (Dev Mode)</a></div>`;
            const devLink = $('#dev-quick-verify');
            if (devLink) {
              devLink.onclick = async (ev) => {
                ev.preventDefault();
                const lastMail = await api(`/api/dev/last-email?to=${encodeURIComponent(err.email)}`);
                if (lastMail && lastMail.link) {
                  const token = new URLSearchParams(lastMail.link.split('?')[1]).get('token');
                  await api('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) });
                  toast('Email verified! You can now sign in.');
                  render();
                } else {
                  toast('No verification token found.');
                }
              };
            }
          }
        }
        if (button) {
          button.disabled = false;
          button.textContent = register ? 'Create account' : 'Sign in';
        }
      }
    };
  }
}

async function newTrip(existing = null) {
  const t = existing || {};
  const locs = await loadLocations();
  const countries = Object.keys(locs);
  const initialCurrency = getCurrencyInfo(t.country || 'India');

  mount(shell(`
    <section class="page-head">
      <div>
        <div class="eyebrow">${existing ? 'Trip details' : 'New Trip'}</div>
        <h2>${existing ? 'Edit trip details' : 'Plan a trip'}</h2>
        <p>Select Country, State, and City to set up your trip itinerary.</p>
      </div>
    </section>

    <section class="card" style="max-width:760px">
      <form id="trip-form" class="form">
        <div class="field">
          <label>Trip Name</label>
          <input name="name" required value="${escape(t.name)}" placeholder="e.g. Australian Summer Escape">
        </div>

        <div class="form-row">
          <div class="field">
            <label>Country</label>
            <select name="country" id="trip-country-select" required>
              <option value="">Select Country</option>
              ${countries.map(c => `<option value="${escape(c)}" ${t.country === c ? 'selected' : ''}>${escape(c)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>State / Province</label>
            <select name="state" id="trip-state-select" required ${t.country ? '' : 'disabled'}>
              <option value="">Select State</option>
            </select>
          </div>
          <div class="field">
            <label>City / Destination</label>
            <select name="city" id="trip-city-select" required ${t.state ? '' : 'disabled'}>
              <option value="">Select City</option>
            </select>
          </div>
        </div>

        <input type="hidden" name="destination" id="trip-destination-hidden" value="${escape(t.destination)}">

        <div class="form-row">
          <div class="field">
            <label>Start Date</label>
            <input name="startDate" type="date" required value="${escape(t.startDate)}">
          </div>
          <div class="field">
            <label>End Date</label>
            <input name="endDate" type="date" required value="${escape(t.endDate)}">
          </div>
        </div>

        <div class="card" style="background:#f8faf8;border:1px solid #e2ebe4;margin:12px 0;padding:14px">
          <span class="eyebrow">Budget & Currency Reference</span>
          <div class="form-row" style="margin-top:8px">
            <div class="field">
              <label id="trip-budget-dest-label">Destination Budget <small>(${initialCurrency.symbol} ${initialCurrency.code})</small></label>
              <input name="budget" id="trip-budget-dest" type="number" min="0" step="1" value="${t.budget ?? ''}" placeholder="e.g. 200000">
            </div>
            <div class="field">
              <label>INR Equivalent Reference <small>(₹ INR)</small></label>
              <input id="trip-budget-inr" type="number" min="0" step="1" placeholder="Live INR calc">
            </div>
          </div>
          <div id="trip-budget-rate-notice" class="trip-meta" style="margin-top:4px;color:var(--teal)">Calculating exchange rate…</div>
        </div>

        <div class="field">
          <label>Cover Image URL <small>(optional)</small></label>
          <input name="coverImage" type="url" value="${escape(t.coverImage)}">
        </div>

        <div class="field">
          <label>Description <small>(optional)</small></label>
          <textarea name="description">${escape(t.description)}</textarea>
        </div>

        <div id="form-error"></div>

        <div class="card-actions">
          <button class="btn" type="submit">${existing ? 'Save details' : 'Create Trip'}</button>
          <a class="btn secondary" href="#/trips">Cancel</a>
        </div>
      </form>
    </section>
  `, 'trips'));

  const countrySel = $('#trip-country-select');
  const stateSel = $('#trip-state-select');
  const citySel = $('#trip-city-select');
  const destInput = $('#trip-destination-hidden');
  const destBudgetInp = $('#trip-budget-dest');
  const inrBudgetInp = $('#trip-budget-inr');
  const destBudgetLabel = $('#trip-budget-dest-label');
  const rateNotice = $('#trip-budget-rate-notice');

  let currentRate = 1.0;

  const updateTwoWayBudgetLinking = async () => {
    const country = countrySel.value || 'India';
    const info = getCurrencyInfo(country);
    if (destBudgetLabel) destBudgetLabel.innerHTML = `Destination Budget <small>(${info.symbol} ${info.code})</small>`;

    if (info.code === 'INR') {
      currentRate = 1.0;
      if (rateNotice) rateNotice.textContent = 'Destination currency is INR.';
      if (destBudgetInp.value) inrBudgetInp.value = destBudgetInp.value;
      return;
    }

    try {
      const res = await convertAmount(1, info.code, 'INR');
      currentRate = res.rate;
      if (rateNotice) rateNotice.textContent = `1 ${info.code} = ₹${currentRate < 1 ? currentRate.toFixed(4) : currentRate.toFixed(2)} INR`;

      if (destBudgetInp.value) {
        inrBudgetInp.value = Math.round(Number(destBudgetInp.value) * currentRate);
      }
    } catch {
      if (rateNotice) rateNotice.textContent = 'Exchange rate unavailable.';
    }
  };

  destBudgetInp.oninput = () => {
    if (!destBudgetInp.value) { inrBudgetInp.value = ''; return; }
    inrBudgetInp.value = Math.round(Number(destBudgetInp.value) * currentRate);
  };

  inrBudgetInp.oninput = () => {
    if (!inrBudgetInp.value || !currentRate) { destBudgetInp.value = ''; return; }
    destBudgetInp.value = Math.round(Number(inrBudgetInp.value) / currentRate);
  };

  const populateStates = (selectedCountry, targetState = '') => {
    if (!selectedCountry || !locs[selectedCountry]) {
      stateSel.innerHTML = '<option value="">Select State</option>';
      stateSel.disabled = true;
      citySel.innerHTML = '<option value="">Select City</option>';
      citySel.disabled = true;
      return;
    }
    const states = Object.keys(locs[selectedCountry]);
    stateSel.innerHTML = '<option value="">Select State</option>' + states.map(s => `<option value="${escape(s)}" ${targetState === s ? 'selected' : ''}>${escape(s)}</option>`).join('');
    stateSel.disabled = false;
  };

  const populateCities = (selectedCountry, selectedState, targetCity = '') => {
    if (!selectedCountry || !selectedState || !locs[selectedCountry]?.[selectedState]) {
      citySel.innerHTML = '<option value="">Select City</option>';
      citySel.disabled = true;
      return;
    }
    const cities = locs[selectedCountry][selectedState];
    citySel.innerHTML = '<option value="">Select City</option>' + cities.map(c => `<option value="${escape(c)}" ${targetCity === c ? 'selected' : ''}>${escape(c)}</option>`).join('');
    citySel.disabled = false;
  };

  const updateDestination = () => {
    const c = countrySel.value;
    const s = stateSel.value;
    const ct = citySel.value;
    destInput.value = ct ? `${ct}, ${s}, ${c}` : s ? `${s}, ${c}` : c;
  };

  countrySel.onchange = () => {
    if (existing && existing.country && existing.country !== countrySel.value) {
      if (!confirm(`Changing destination country from ${existing.country} to ${countrySel.value} will update trip currency. Recalculate currency?`)) {
        countrySel.value = existing.country;
        return;
      }
    }
    updateTwoWayBudgetLinking();
    populateStates(countrySel.value);
    populateCities('', '');
    updateDestination();
  };

  stateSel.onchange = () => {
    populateCities(countrySel.value, stateSel.value);
    updateDestination();
  };

  citySel.onchange = updateDestination;

  if (t.country) {
    populateStates(t.country, t.state);
    if (t.state) {
      populateCities(t.country, t.state, t.city);
    }
  }

  updateTwoWayBudgetLinking();

  const form = $('#trip-form');
  if (form) {
    form.onsubmit = async e => {
      e.preventDefault();
      const button = $('button[type=submit]', e.target);
      if (button) button.disabled = true;
      try {
        const result = await api(existing ? `/api/trips/${t.id}` : '/api/trips', {
          method: existing ? 'PUT' : 'POST',
          body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
        });
        toast(existing ? 'Trip details saved.' : 'Trip created.');
        await loadTrips();
        nav(existing ? `/trip/${result.id}` : `/builder/${result.id}`);
      } catch (err) {
        const errContainer = $('#form-error');
        if (errContainer) errContainer.innerHTML = `<div class="alert">${escape(err.message)}</div>`;
        if (button) button.disabled = false;
      }
    };
  }
}

async function aiPlanner() {
  const locs = await loadLocations();
  const countries = Object.keys(locs);
  const recs = await api('/api/ai/recommendations').catch(() => []);

  const defaultStart = new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10);
  const defaultEnd = new Date(Date.now() + 86400000 * 19).toISOString().slice(0, 10);

  mount(shell(`
    <section class="page-head">
      <div>
        <div class="eyebrow">Personalized Itinerary Engine</div>
        <h2>AI Trip Planner</h2>
        <p>Generate curated itineraries matching your travel style, schedule, and budget.</p>
      </div>
    </section>

    <div class="grid two">
      <section class="card">
        <h3>Trip Parameters</h3>
        <form id="ai-planner-form" class="form" style="margin-top:14px">
          <div class="form-row">
            <div class="field">
              <label>Country / Destination</label>
              <select name="country" id="ai-country-select" required>
                <option value="">Select Country</option>
                ${countries.map(c => `<option value="${escape(c)}">${escape(c)}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>State / Province</label>
              <select name="state" id="ai-state-select" disabled>
                <option value="">Select State</option>
              </select>
            </div>
            <div class="field">
              <label>City / Destination</label>
              <select name="city" id="ai-city-select" disabled>
                <option value="">Select City</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Start Date</label>
              <input name="startDate" type="date" required value="${defaultStart}">
            </div>
            <div class="field">
              <label>End Date</label>
              <input name="endDate" type="date" required value="${defaultEnd}">
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label id="ai-budget-label">Total Budget <small>(₹ INR)</small></label>
              <input name="budget" type="number" min="1000" step="500" placeholder="e.g. 35000" value="35000" required>
            </div>
            <div class="field">
              <label>Number of Travellers</label>
              <input name="travellers" type="number" min="1" max="20" value="1" required>
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Travel Style</label>
              <select name="travelStyle">
                <option>Culture</option>
                <option>Food</option>
                <option>Nature</option>
                <option>Adventure</option>
                <option>Relaxation</option>
                <option selected>Mixed</option>
              </select>
            </div>
            <div class="field">
              <label>Travel Pace</label>
              <select name="pace">
                <option>Relaxed</option>
                <option selected>Balanced</option>
                <option>Packed</option>
              </select>
            </div>
          </div>

          <div id="ai-form-error"></div>

          <button class="btn" type="submit" id="generate-ai-btn">Generate AI Plan</button>
        </form>
      </section>

      <section>
        <div class="card">
          <h3>Recommended for You</h3>
          <p class="trip-meta" style="margin-bottom:12px">Destinations matched to popular travel preferences</p>
          <div class="grid" style="gap:12px">
            ${recs.map(r => `
              <div class="card" style="display:flex;gap:12px;padding:12px;align-items:center">
                <div style="width:70px;height:70px;border-radius:6px;background-image:url('${escape(r.image)}');background-size:cover;background-position:center;flex-shrink:0"></div>
                <div style="flex:1">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <b>${escape(r.name)}, ${escape(r.country)}</b>
                    <span class="tag" style="background:#e7f4e8;color:#1e5e27;border-color:#bce3c1">${r.matchPct}% match</span>
                  </div>
                  <div class="trip-meta" style="margin:4px 0">
                    ${renderDualMoney(r.estimatedCost, r.country, true)} · ${r.durationDays} days · ${escape(r.travelStyle)}
                  </div>
                  <button class="btn secondary small" data-plan-rec="${r.id}" style="margin-top:4px">Plan with AI</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    </div>

    <div id="ai-plan-result" style="margin-top:24px"></div>
  `, 'ai-planner'));

  const countrySel = $('#ai-country-select');
  const stateSel = $('#ai-state-select');
  const citySel = $('#ai-city-select');
  const budgetLabel = $('#ai-budget-label');

  const updateAIBudgetLabel = c => {
    const info = getCurrencyInfo(c);
    if (budgetLabel) budgetLabel.innerHTML = `Total Budget <small>(${info.symbol} ${info.code})</small>`;
  };

  const populateStates = (selectedCountry, targetState = '') => {
    if (!selectedCountry || !locs[selectedCountry]) {
      stateSel.innerHTML = '<option value="">Select State</option>';
      stateSel.disabled = true;
      citySel.innerHTML = '<option value="">Select City</option>';
      citySel.disabled = true;
      return;
    }
    const states = Object.keys(locs[selectedCountry]);
    stateSel.innerHTML = '<option value="">Select State</option>' + states.map(s => `<option value="${escape(s)}" ${targetState === s ? 'selected' : ''}>${escape(s)}</option>`).join('');
    stateSel.disabled = false;
  };

  const populateCities = (selectedCountry, selectedState, targetCity = '') => {
    if (!selectedCountry || !selectedState || !locs[selectedCountry]?.[selectedState]) {
      citySel.innerHTML = '<option value="">Select City</option>';
      citySel.disabled = true;
      return;
    }
    const cities = locs[selectedCountry][selectedState];
    citySel.innerHTML = '<option value="">Select City</option>' + cities.map(c => `<option value="${escape(c)}" ${targetCity === c ? 'selected' : ''}>${escape(c)}</option>`).join('');
    citySel.disabled = false;
  };

  countrySel.onchange = () => {
    updateAIBudgetLabel(countrySel.value);
    populateStates(countrySel.value);
    populateCities('', '');
  };

  stateSel.onchange = () => {
    populateCities(countrySel.value, stateSel.value);
  };

  document.querySelectorAll('[data-plan-rec]').forEach(btn => {
    btn.onclick = () => {
      const rec = recs.find(r => r.id === btn.dataset.planRec);
      if (!rec) return;
      countrySel.value = rec.country;
      updateAIBudgetLabel(rec.country);
      populateStates(rec.country, rec.state);
      if (rec.state) populateCities(rec.country, rec.state, rec.city);
      $('[name=budget]').value = rec.estimatedCost;
      $('[name=travelStyle]').value = rec.travelStyle.split('+')[0].trim() || 'Culture';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });

  const form = $('#ai-planner-form');
  if (form) {
    form.onsubmit = async e => {
      e.preventDefault();
      const btn = $('#generate-ai-btn');
      const errBox = $('#ai-form-error');
      if (btn) { btn.disabled = true; btn.textContent = 'Generating AI Plan…'; }
      if (errBox) errBox.innerHTML = '';

      try {
        const formData = Object.fromEntries(new FormData(e.target));
        currentAIPlan = await api('/api/ai/plan', { method: 'POST', body: JSON.stringify(formData) });
        renderAIPlanPreview(currentAIPlan, formData);
      } catch (err) {
        if (errBox) errBox.innerHTML = `<div class="alert">${escape(err.message)}</div>`;
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Generate AI Plan'; }
      }
    };
  }
}

async function renderAIPlanPreview(plan, originalFormData) {
  const resultContainer = $('#ai-plan-result');
  if (!resultContainer) return;

  const isOver = plan.exceedsBudget;
  const stops = plan.stops || [];
  const curr = plan.currencyCode || plan.country;

  resultContainer.innerHTML = `
    <section class="card" style="border:2px solid var(--teal)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <span class="eyebrow">Generated Preview · ${escape(plan.country)}</span>
          <h2 style="margin:4px 0">${escape(plan.name)}</h2>
          <p class="trip-meta">${escape(plan.destination)} · ${fmtDate(plan.startDate)} — ${fmtDate(plan.endDate)} (${plan.dayCount} days, ${plan.travellers} traveller${plan.travellers > 1 ? 's' : ''})</p>
        </div>
        <button class="btn" id="convert-ai-plan-btn">Add to My Trip →</button>
      </div>

      <div class="grid three" style="margin:20px 0;background:#f4f7f5;padding:16px;border-radius:8px">
        <div>
          <span class="trip-meta">Estimated Cost:</span>
          ${renderDualMoney(plan.totalEstimatedCost, curr)}
        </div>
        <div>
          <span class="trip-meta">Total Budget:</span>
          ${renderDualMoney(plan.budget, curr)}
        </div>
        <div>
          <span class="trip-meta">Remaining Budget:</span>
          <div class="${isOver ? 'danger-text' : ''}">
            ${renderDualMoney(plan.remainingBudget, curr)}
          </div>
        </div>
      </div>

      ${isOver ? `
        <div class="warning" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <span>Estimated cost exceeds your total budget by ${money(Math.abs(plan.remainingBudget), curr)}.</span>
          <button class="btn small secondary" id="optimize-budget-btn">Optimize Budget (Make it cheaper)</button>
        </div>
      ` : ''}

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap">
        <b style="font-size:13px">Regenerate Options:</b>
        <button class="btn ghost small" data-regen="Cheaper">Cheaper</button>
        <button class="btn ghost small" data-regen="More activities">More activities</button>
        <button class="btn ghost small" data-regen="More relaxed">More relaxed</button>
        <button class="btn ghost small" data-regen="More cultural">More cultural</button>
        <button class="btn ghost small" data-regen="More food">More food</button>
        <button class="btn ghost small" data-regen="More nature">More nature</button>
      </div>

      <h3>Itinerary Breakdown</h3>
      <div class="grid" style="margin-top:14px">
        ${stops.map(s => renderStop(s, plan, false)).join('')}
      </div>

      <div class="card-actions" style="margin-top:20px">
        <button class="btn" id="convert-ai-plan-btn-bottom">Add to My Trip →</button>
      </div>
    </section>
  `;

  resultContainer.scrollIntoView({ behavior: 'smooth' });

  const executeRegen = async modifier => {
    try {
      const updated = await api('/api/ai/plan', {
        method: 'POST',
        body: JSON.stringify({ ...originalFormData, modifier, cheaper: modifier === 'Cheaper' })
      });
      currentAIPlan = updated;
      renderAIPlanPreview(currentAIPlan, originalFormData);
      toast(`Itinerary regenerated: ${modifier}.`);
    } catch (err) {
      toast(err.message);
    }
  };

  document.querySelectorAll('[data-regen]').forEach(btn => {
    btn.onclick = () => executeRegen(btn.dataset.regen);
  });

  const optBtn = $('#optimize-budget-btn');
  if (optBtn) optBtn.onclick = () => executeRegen('Cheaper');

  const convertHandler = async () => {
    if (!currentAIPlan) return;
    try {
      const res = await api('/api/ai/convert-plan', {
        method: 'POST',
        body: JSON.stringify({ plan: currentAIPlan })
      });
      toast(res.message);
      await loadTrips();
      nav(`/builder/${res.tripId}`);
    } catch (err) {
      toast(err.message);
    }
  };

  const convertBtnTop = $('#convert-ai-plan-btn');
  if (convertBtnTop) convertBtnTop.onclick = convertHandler;

  const convertBtnBottom = $('#convert-ai-plan-btn-bottom');
  if (convertBtnBottom) convertBtnBottom.onclick = convertHandler;
}

async function converterPage() {
  const pref = state.user?.preferredCurrency || 'INR';

  mount(shell(`
    <section class="page-head">
      <div>
        <div class="eyebrow">Financial Utilities</div>
        <h2>Currency Converter</h2>
        <p>Convert trip budgets and expenses across global currencies using live exchange rates.</p>
      </div>
    </section>

    <div class="grid two">
      <section class="card">
        <h3>Currency Exchange Calculator</h3>
        <form id="full-converter-form" class="form" style="margin-top:14px">
          <div class="form-row" style="align-items:flex-end">
            <div class="field">
              <label id="lbl-from-curr">From Currency</label>
              <select name="fromCode" id="converter-from">
                ${supportedCurrencies.map(c => `<option value="${c.code}" ${c.code === 'JPY' ? 'selected' : ''}>${c.code} — ${c.name}</option>`).join('')}
              </select>
            </div>
            <button type="button" class="btn secondary small" id="swap-currencies-btn" style="margin-bottom:8px;padding:8px 12px" title="Swap currencies">⇄</button>
            <div class="field">
              <label id="lbl-to-curr">To Currency</label>
              <select name="toCode" id="converter-to">
                ${supportedCurrencies.map(c => `<option value="${c.code}" ${c.code === 'INR' ? 'selected' : ''}>${c.code} — ${c.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-row" style="margin-top:12px">
            <div class="field">
              <label id="lbl-from-amount">Amount (<span id="span-from-code">JPY</span>)</label>
              <input name="amountFrom" id="inp-amount-from" type="number" min="0" step="any" value="200000" placeholder="Enter amount">
            </div>
            <div class="field">
              <label id="lbl-to-amount">Converted (<span id="span-to-code">INR</span>)</label>
              <input name="amountTo" id="inp-amount-to" type="number" min="0" step="any" placeholder="Calculated amount">
            </div>
          </div>

          <div id="full-converter-error"></div>
        </form>
      </section>

      <section>
        <div id="full-converter-result"></div>
      </section>
    </div>
  `, 'converter'));

  const swapBtn = $('#swap-currencies-btn');
  const fromSel = $('#converter-from');
  const toSel = $('#converter-to');
  const inpFrom = $('#inp-amount-from');
  const inpTo = $('#inp-amount-to');
  const spanFromCode = $('#span-from-code');
  const spanToCode = $('#span-to-code');

  let currentRate = 1.0;

  const updateRateAndConvert = async (triggerSource = 'from') => {
    const fromCode = fromSel.value;
    const toCode = toSel.value;

    if (spanFromCode) spanFromCode.textContent = fromCode;
    if (spanToCode) spanToCode.textContent = toCode;

    const resBox = $('#full-converter-result');
    const errBox = $('#full-converter-error');
    if (errBox) errBox.innerHTML = '';

    try {
      const res = await convertAmount(1, fromCode, toCode);
      currentRate = res.rate;

      if (triggerSource === 'from') {
        const valFrom = Number(inpFrom.value || 0);
        const converted = Math.round(valFrom * currentRate * 100) / 100;
        inpTo.value = converted || '';
      } else {
        const valTo = Number(inpTo.value || 0);
        const converted = currentRate ? Math.round((valTo / currentRate) * 100) / 100 : 0;
        inpFrom.value = converted || '';
      }

      if (resBox) {
        resBox.innerHTML = `
          <div class="card" style="border:2px solid var(--teal)">
            <span class="eyebrow">Exchange Rate Reference</span>
            <div style="font-size:28px;font-weight:bold;color:var(--teal);margin:8px 0">
              1 ${fromCode} = ${currentRate < 1 ? currentRate.toFixed(4) : currentRate.toFixed(4)} ${toCode}
            </div>
            <p class="trip-meta" style="font-size:15px;margin-bottom:12px">
              ${money(Number(inpFrom.value || 0), fromCode)} = <b>${money(Number(inpTo.value || 0), toCode)}</b>
            </p>
            <div class="summary-line"><span>Exchange Rate Status</span><b>${escape(res.source)}</b></div>
            ${!res.isLive ? '<div class="warning" style="margin-top:12px">Using cached exchange rate.</div>' : ''}
          </div>
        `;
      }
    } catch (err) {
      if (errBox) errBox.innerHTML = `<div class="alert">${escape(err.message)}</div>`;
    }
  };

  fromSel.onchange = () => updateRateAndConvert('from');
  toSel.onchange = () => updateRateAndConvert('from');

  inpFrom.oninput = () => updateRateAndConvert('from');
  inpTo.oninput = () => updateRateAndConvert('to');

  if (swapBtn) {
    swapBtn.onclick = () => {
      const temp = fromSel.value;
      fromSel.value = toSel.value;
      toSel.value = temp;
      updateRateAndConvert('from');
    };
  }

  updateRateAndConvert('from');
}

function budgetCard(t) {
  const percent = t.budget ? Math.min(100, Math.round((t.actualCost / t.budget) * 100)) : 0;
  const stops = t.stops || [];
  const allActivities = stops.flatMap(s => s.activities || []);
  const curr = t.currencyCode || t.country;
  const originalCode = getCurrencyInfo(curr).code;

  const categoryTotals = {};
  allActivities.forEach(a => {
    const cat = a.category || 'Experience';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(a.cost || 0);
  });

  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const cardHtml = `
    <aside class="card summary">
      <span class="eyebrow">Trip budget (${t.currencySymbol || ''} ${t.currencyCode || ''})</span>
      ${renderDualMoney(t.actualCost, curr)}
      <div class="trip-meta" style="margin-top:2px">Total Planned Spend</div>

      ${t.budget != null ? `
        <div style="height:7px;background:#e7eee8;border-radius:999px;margin:14px 0;overflow:hidden">
          <div style="height:100%;width:${percent}%;background:${t.remainingBudget < 0 ? '#b84242' : '#dc8b36'}"></div>
        </div>
        <div class="summary-line"><span>Total Budget</span>${renderDualMoney(t.budget, curr, true)}</div>
        <div class="summary-line"><span>Average / Day</span>${renderDualMoney(t.averageCostPerDay, curr, true)}</div>
        <div class="summary-line">
          <span>${t.remainingBudget < 0 ? 'Over by' : 'Remaining'}</span>
          <div class="${t.remainingBudget < 0 ? 'danger-text' : ''}">${renderDualMoney(Math.abs(t.remainingBudget), curr, true)}</div>
        </div>
        ${t.remainingBudget < 0 ? '<div class="warning">You’re over your planned budget.</div>' : t.remainingBudget < t.budget * 0.15 ? '<div class="warning">You’re close to your total budget limit.</div>' : ''}
      ` : '<p class="warning" style="margin-top:14px">Set a total budget in trip details to track remaining funds.</p>'}

      ${originalCode !== 'INR' ? `
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">
          <span class="eyebrow">Trip Budget Reference</span>
          <div style="background:#f4f7f5;padding:10px 12px;border-radius:6px;margin-top:6px;border-left:3px solid var(--teal)">
            <div style="font-size:15px;font-weight:bold">${money(t.budget || 0, curr)}</div>
            <div id="budget-card-inr-equiv" style="font-size:13px;color:var(--teal);margin-top:2px">Calculating ≈ INR…</div>
            <div id="budget-card-rate-line" style="font-size:11px;color:var(--muted);margin-top:4px">1 ${originalCode} = … INR</div>
          </div>
        </div>
      ` : ''}

      ${categories.length ? `
        <div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--line)">
          <span class="eyebrow">Expense Breakdown</span>
          ${categories.map(([cat, amount]) => {
            const catPct = t.actualCost ? Math.round((amount / t.actualCost) * 100) : 0;
            return `
              <div style="margin-top:8px">
                <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)">
                  <span>${escape(cat)} (${catPct}%)</span>
                  <div>${renderDualMoney(amount, curr, true)}</div>
                </div>
                <div style="height:4px;background:#e7eee8;border-radius:999px;margin-top:3px;overflow:hidden">
                  <div style="height:100%;width:${catPct}%;background:var(--teal)"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </aside>
  `;

  if (originalCode !== 'INR') {
    setTimeout(async () => {
      const eqEl = $('#budget-card-inr-equiv');
      const rateEl = $('#budget-card-rate-line');
      if (!eqEl) return;
      try {
        const res = await convertAmount(t.budget || 0, originalCode, 'INR');
        eqEl.textContent = `≈ ${money(res.convertedAmount, 'INR')}`;
        if (rateEl) rateEl.textContent = `1 ${originalCode} = ₹${res.rate < 1 ? res.rate.toFixed(4) : res.rate.toFixed(2)} INR`;
      } catch {
        eqEl.textContent = '';
      }
    }, 20);
  }

  return cardHtml;
}

function renderStop(stop, t, editable) {
  const activities = stop.activities || [];
  const curr = t?.currencyCode || t?.country || stop?.country;
  return `
    <article class="stop" data-stop="${stop.id}">
      <div class="stop-header">
        <div>
          <h3>Stop: ${escape(stop.city)} ${stop.state ? `, ${escape(stop.state)}` : ''} (${escape(stop.country || t.country || '')})</h3>
          <p>${fmtDate(stop.startDate)} — ${fmtDate(stop.endDate)} ${stop.budget != null ? `· ${renderDualMoney(stop.budget, curr, true)} stop budget` : ''}</p>
        </div>
        ${editable ? `
          <div>
            <button class="btn ghost small" data-move-stop="${stop.id}" data-dir="-1" title="Move Up">↑</button>
            <button class="btn ghost small" data-move-stop="${stop.id}" data-dir="1" title="Move Down">↓</button>
            <button class="btn ghost small" data-edit-stop="${stop.id}">Edit</button>
            <button class="btn ghost small danger-text" data-remove-stop="${stop.id}">×</button>
          </div>
        ` : ''}
      </div>

      ${activities.length ? activities.map(a => `
        <div class="activity">
          <span class="drag">⠿</span>
          <span class="activity-time">${escape(a.time || 'Any')}</span>
          <div class="activity-info">
            <b>${escape(a.name)}</b> <span class="tag">${escape(a.category)}</span>
            <p>${escape(a.description || a.location || 'Planned experience')}</p>
          </div>
          <div class="cost" style="text-align:right">${renderDualMoney(a.cost, curr)}</div>
          ${editable ? `
            <button class="btn ghost small" data-move-activity="${a.id}" data-stopid="${stop.id}" data-dir="-1" title="Move Up">↑</button>
            <button class="btn ghost small" data-move-activity="${a.id}" data-stopid="${stop.id}" data-dir="1" title="Move Down">↓</button>
            <button class="btn ghost small" data-edit-activity="${a.id}" data-stopid="${stop.id}">Edit</button>
            <button class="btn ghost small danger-text" data-remove-activity="${a.id}">×</button>
          ` : ''}
        </div>
      `).join('') : '<div class="activity"><div class="activity-info"><p class="trip-meta">No activities added to this stop yet.</p></div></div>'}

      ${editable ? `
        <div class="add-row">
          <button class="btn ghost small" data-add-activity="${stop.id}">＋ Add activity</button>
        </div>
      ` : ''}
    </article>
  `;
}

async function builder(id) {
  try {
    const t = await api(`/api/trips/${id}`);
    const stops = t.stops || [];
    mount(shell(`
      <section class="page-head">
        <div>
          <div class="eyebrow">Itinerary Builder · ${escape(t.country)}</div>
          <h2>${escape(t.name)}</h2>
          <p>${escape(t.destination)} · ${fmtDate(t.startDate)} — ${fmtDate(t.endDate)}</p>
        </div>
        <div class="card-actions">
          <a class="btn secondary" href="#/trip/${t.id}">Preview itinerary</a>
          <button class="btn" id="share-trip">${t.isPublic ? 'Sharing on (Copy link)' : 'Share trip'}</button>
        </div>
      </section>

      <section class="itinerary">
        <div>
          <div class="section-title">
            <div>
              <h3>Stops & Activities</h3>
              <p>Stops restricted to ${escape(t.country)}.</p>
            </div>
            <button class="btn secondary small" id="add-stop">＋ Add Stop</button>
          </div>
          <div class="grid">
            ${stops.map(s => renderStop(s, t, true)).join('') || empty('No stops created.', `Add your first stop in ${escape(t.country)} to build your itinerary.`, '#', 'Add Stop')}
          </div>
        </div>
        ${budgetCard(t)}
      </section>
    `, 'trips'));

    bindBuilder(t);
  } catch (e) {
    mount(shell(empty('Trip unavailable.', e.message, '#/trips', 'Back to My Trips'), 'trips'));
  }
}

function showModal(title, inner, onSubmit, submit = 'Save', onRendered = null) {
  const el = document.createElement('div');
  el.className = 'modal-wrap';
  el.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h2>${title}</h2>
        <button class="close">×</button>
      </div>
      <form class="form">
        ${inner}
        <div id="modal-error"></div>
        <div class="card-actions">
          <button class="btn" type="submit">${submit}</button>
          <button class="btn secondary" type="button" id="modal-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.append(el);

  if (onRendered) onRendered(el);

  const close = () => el.remove();
  $('.close', el).onclick = close;
  $('#modal-cancel', el).onclick = close;
  $('form', el).onsubmit = async e => {
    e.preventDefault();
    const btn = $('button[type=submit]', el);
    if (btn) btn.disabled = true;
    try {
      await onSubmit(Object.fromEntries(new FormData(e.target)));
      close();
    } catch (err) {
      const errBox = $('#modal-error', el);
      if (errBox) errBox.innerHTML = `<div class="alert">${escape(err.message)}</div>`;
      if (btn) btn.disabled = false;
    }
  };
}

function stopFieldsHtml(t, s = {}) {
  const currInfo = getCurrencyInfo(t?.currencyCode || t?.country || s?.country);
  return `
    <div class="field">
      <label>Country</label>
      <input name="country" readonly value="${escape(s.country || t.country)}" style="background:#f4f7f5;cursor:not-allowed">
    </div>
    <div class="form-row">
      <div class="field">
        <label>State / Province</label>
        <select name="state" id="modal-stop-state" required>
          <option value="">Select State</option>
        </select>
      </div>
      <div class="field">
        <label>City</label>
        <select name="city" id="modal-stop-city" required disabled>
          <option value="">Select City</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="field">
        <label>Arrival Date</label>
        <input name="startDate" type="date" required value="${s.startDate || t.startDate || ''}">
      </div>
      <div class="field">
        <label>Departure Date</label>
        <input name="endDate" type="date" required value="${s.endDate || t.endDate || ''}">
      </div>
    </div>
    <div class="field">
      <label>Stop Budget <small>(${currInfo.symbol} ${currInfo.code}, optional)</small></label>
      <input name="budget" type="number" min="0" value="${s.budget ?? ''}">
    </div>
  `;
}

function initStopLocationCascade(modalEl, t, s = {}) {
  loadLocations().then(locs => {
    const country = s.country || t.country;
    const stateSel = $('#modal-stop-state', modalEl);
    const citySel = $('#modal-stop-city', modalEl);

    if (!country || !locs[country]) return;

    const states = Object.keys(locs[country]);
    stateSel.innerHTML = '<option value="">Select State</option>' + states.map(st => `<option value="${escape(st)}" ${s.state === st ? 'selected' : ''}>${escape(st)}</option>`).join('');

    const populateCities = targetState => {
      if (!targetState || !locs[country][targetState]) {
        citySel.innerHTML = '<option value="">Select City</option>';
        citySel.disabled = true;
        return;
      }
      const cities = locs[country][targetState];
      citySel.innerHTML = '<option value="">Select City</option>' + cities.map(c => `<option value="${escape(c)}" ${s.city === c ? 'selected' : ''}>${escape(c)}</option>`).join('');
      citySel.disabled = false;
    };

    stateSel.onchange = () => populateCities(stateSel.value);

    if (s.state) {
      populateCities(s.state);
    }
  });
}

const activityFields = (a = {}, stop = {}, t = {}) => {
  const currInfo = getCurrencyInfo(t?.currencyCode || t?.country || stop?.country);
  return `
    <div class="field">
      <label>Activity Name</label>
      <input name="name" required value="${escape(a.name)}">
    </div>
    <div class="form-row">
      <div class="field">
        <label>Date</label>
        <input name="date" type="date" required value="${a.date || stop.startDate || ''}">
      </div>
      <div class="field">
        <label>Time <small>(optional)</small></label>
        <input name="time" type="time" value="${a.time || ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="field">
        <label>Cost (${currInfo.symbol} ${currInfo.code})</label>
        <input name="cost" type="number" min="0" required value="${a.cost ?? 0}">
      </div>
      <div class="field">
        <label>Duration (hours)</label>
        <input name="duration" type="number" min="0" step="0.5" value="${a.duration ?? 1}">
      </div>
    </div>
    <div class="form-row">
      <div class="field">
        <label>Category</label>
        <select name="category">
          ${['Experience', 'Food', 'Culture', 'Outdoor', 'Wellness', 'Transport'].map(x => `<option ${a.category === x ? 'selected' : ''}>${x}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Location <small>(optional)</small></label>
        <input name="location" value="${escape(a.location || stop.city || '')}">
      </div>
    </div>
    <div class="field">
      <label>Details <small>(optional)</small></label>
      <textarea name="description">${escape(a.description)}</textarea>
    </div>
  `;
};

function bindBuilder(t) {
  const addStopBtn = $('#add-stop');
  if (addStopBtn) {
    addStopBtn.onclick = () => showModal(`Add Stop in ${escape(t.country)}`, stopFieldsHtml(t), async data => {
      await api(`/api/trips/${t.id}/stops`, { method: 'POST', body: JSON.stringify(data) });
      toast('Stop added.');
      builder(t.id);
    }, 'Add Stop', modalEl => initStopLocationCascade(modalEl, t));
  }

  document.querySelectorAll('[data-edit-stop]').forEach(b => {
    b.onclick = () => {
      const s = (t.stops || []).find(x => x.id === b.dataset.editStop);
      showModal('Edit Stop', stopFieldsHtml(t, s), async data => {
        await api(`/api/stops/${s.id}`, { method: 'PATCH', body: JSON.stringify(data) });
        toast('Stop updated.');
        builder(t.id);
      }, 'Save Changes', modalEl => initStopLocationCascade(modalEl, t, s));
    };
  });

  document.querySelectorAll('[data-remove-stop]').forEach(b => {
    b.onclick = async () => {
      if (confirm('Remove this stop and its activities?')) {
        await api(`/api/stops/${b.dataset.removeStop}`, { method: 'DELETE', body: '{}' });
        toast('Stop removed.');
        builder(t.id);
      }
    };
  });

  document.querySelectorAll('[data-add-activity]').forEach(b => {
    b.onclick = () => {
      const s = (t.stops || []).find(x => x.id === b.dataset.addActivity);
      showModal('Add Activity', activityFields({}, s, t), async data => {
        await api(`/api/stops/${s.id}/activities`, { method: 'POST', body: JSON.stringify(data) });
        toast('Activity added.');
        builder(t.id);
      }, 'Add Activity');
    };
  });

  document.querySelectorAll('[data-edit-activity]').forEach(b => {
    b.onclick = () => {
      const s = (t.stops || []).find(x => x.id === b.dataset.stopid);
      const a = (s?.activities || []).find(x => x.id === b.dataset.editActivity);
      showModal('Edit Activity', activityFields(a, s, t), async data => {
        await api(`/api/activities/${a.id}`, { method: 'PATCH', body: JSON.stringify(data) });
        toast('Activity updated.');
        builder(t.id);
      });
    };
  });

  document.querySelectorAll('[data-remove-activity]').forEach(b => {
    b.onclick = async () => {
      if (confirm('Remove this activity?')) {
        await api(`/api/activities/${b.dataset.removeActivity}`, { method: 'DELETE', body: '{}' });
        toast('Activity removed.');
        builder(t.id);
      }
    };
  });

  document.querySelectorAll('[data-move-stop]').forEach(b => {
    b.onclick = async () => {
      const stops = t.stops || [];
      const idx = stops.findIndex(s => s.id === b.dataset.moveStop);
      const to = idx + Number(b.dataset.dir);
      if (to < 0 || to >= stops.length) return;
      const ids = stops.map(s => s.id);
      [ids[idx], ids[to]] = [ids[to], ids[idx]];
      await api('/api/reorder', { method: 'POST', body: JSON.stringify({ kind: 'stop', ids }) });
      builder(t.id);
    };
  });

  document.querySelectorAll('[data-move-activity]').forEach(b => {
    b.onclick = async () => {
      const stop = (t.stops || []).find(s => s.id === b.dataset.stopid);
      if (!stop) return;
      const activities = stop.activities || [];
      const idx = activities.findIndex(a => a.id === b.dataset.moveActivity);
      const to = idx + Number(b.dataset.dir);
      if (to < 0 || to >= activities.length) return;
      const ids = activities.map(a => a.id);
      [ids[idx], ids[to]] = [ids[to], ids[idx]];
      await api('/api/reorder', { method: 'POST', body: JSON.stringify({ kind: 'activity', ids }) });
      builder(t.id);
    };
  });

  const shareBtn = $('#share-trip');
  if (shareBtn) {
    shareBtn.onclick = async () => {
      const result = await api(`/api/trips/${t.id}/share`, { method: 'POST', body: JSON.stringify({ isPublic: !t.isPublic }) });
      if (result.isPublic) {
        const link = `${location.origin}${location.pathname}#/public/${result.publicSlug}`;
        if (navigator.clipboard) await navigator.clipboard.writeText(link);
        toast('Public link copied to clipboard.');
      } else {
        toast('Sharing disabled.');
      }
      builder(t.id);
    };
  }
}

function tripsPage() {
  const groups = ['Ongoing', 'Upcoming', 'Completed'];
  mount(shell(`
    <section class="page-head">
      <div>
        <div class="eyebrow">Your travel library</div>
        <h2>My Trips</h2>
        <p>All your saved travel itineraries.</p>
      </div>
      <a class="btn" href="#/new-trip">＋ Plan a trip</a>
    </section>

    <div class="toolbar">
      <div class="searchbox">
        <input id="trip-search" placeholder="Search trips or destinations">
      </div>
      <select id="trip-sort" class="field" style="max-width:180px">
        <option value="created-desc">Newest created</option>
        <option value="start-asc">Start date (Soonest)</option>
        <option value="name-asc">Name (A-Z)</option>
        <option value="budget-desc">Budget (High to Low)</option>
      </select>
      <div class="tabs">
        ${groups.map((g, i) => `<button class="${i === 0 ? 'active' : ''}" data-tab="${g}">${g}</button>`).join('')}
      </div>
    </div>

    <div id="trip-grid"></div>
  `, 'trips'));

  let selectedStatus = 'Ongoing';

  const show = () => {
    const query = ($('#trip-search')?.value || '').toLowerCase();
    const sortBy = $('#trip-sort')?.value || 'created-desc';

    let matches = state.trips.filter(t => tripStatus(t) === selectedStatus && `${t.name} ${t.destination} ${t.country || ''}`.toLowerCase().includes(query));

    matches.sort((a, b) => {
      if (sortBy === 'start-asc') return a.startDate.localeCompare(b.startDate);
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'budget-desc') return (b.budget || 0) - (a.budget || 0);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    const grid = $('#trip-grid');
    if (grid) {
      grid.innerHTML = matches.length
        ? `<div class="grid three">${matches.map(tripCard).join('')}</div>`
        : empty(`No ${selectedStatus.toLowerCase()} trips.`, selectedStatus === 'Upcoming' ? 'Future trips will appear here.' : 'No matching trips found.');
      bindCommon();
    }
  };

  const tripSearch = $('#trip-search');
  if (tripSearch) tripSearch.oninput = show;
  const tripSort = $('#trip-sort');
  if (tripSort) tripSort.onchange = show;

  document.querySelectorAll('[data-tab]').forEach(b => {
    b.onclick = () => {
      selectedStatus = b.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('active', x === b));
      show();
    };
  });

  show();
}

async function detail(id) {
  try {
    const t = await api(`/api/trips/${id}`);
    const stops = t.stops || [];
    const byDate = {};
    const curr = t.currencyCode || t.country;

    stops.forEach(s => (s.activities || []).forEach(a => {
      (byDate[a.date] ??= []).push({ ...a, city: s.city });
    }));

    const dates = Object.keys(byDate).sort();

    mount(shell(`
      <section class="page-head">
        <div>
          <div class="eyebrow">Itinerary View · ${escape(t.country)}</div>
          <h2>${escape(t.name)}</h2>
          <p>${escape(t.destination)} · ${fmtDate(t.startDate)} — ${fmtDate(t.endDate)} · ${t.dayCount} days</p>
        </div>
        <div class="card-actions">
          <a class="btn secondary" href="#/edit-trip/${t.id}">Edit details</a>
          <a class="btn" href="#/builder/${t.id}">Edit itinerary</a>
        </div>
      </section>

      <section class="itinerary">
        <div>
          ${dates.map((date, i) => `
            <div class="day">
              <div class="day-label">Day ${i + 1} · ${fmtDate(date)}</div>
              ${byDate[date].map(a => `
                <div class="activity card" style="margin-bottom:8px">
                  <span class="activity-time">${escape(a.time || 'Any')}</span>
                  <div class="activity-info">
                    <b>${escape(a.name)}</b> <span class="tag">${escape(a.category)}</span>
                    <p>${escape(a.city)} · ${escape(a.description || a.location || 'Planned experience')}</p>
                  </div>
                  <div class="cost" style="text-align:right">${renderDualMoney(a.cost, curr)}</div>
                </div>
              `).join('')}
            </div>
          `).join('') || empty('No activities added yet.', 'Use the itinerary builder to add stops and activities.', `#/builder/${t.id}`, 'Build itinerary')}

          <div class="section">
            <h3>Route & Stops</h3>
            <div class="grid">
              ${stops.map(s => renderStop(s, t, false)).join('') || '<p class="trip-meta">No stops created yet.</p>'}
            </div>
          </div>
        </div>
        ${budgetCard(t)}
      </section>
    `, 'trips'));
  } catch (e) {
    toast(e.message);
    nav('/trips');
  }
}

async function discover() {
  const locs = await loadLocations();
  const countries = Object.keys(locs);

  mount(shell(`
    <section class="page-head">
      <div>
        <div class="eyebrow">Places & Experiences</div>
        <h2>Discover Destinations</h2>
        <p>Explore cities and activities by country and category.</p>
      </div>
    </section>

    <div class="toolbar">
      <div class="searchbox">
        <input id="discover-search" placeholder="Search cities or activities">
      </div>
      <select id="discover-country" class="field" style="max-width:160px">
        <option value="">All Countries</option>
        ${countries.map(c => `<option value="${escape(c)}">${escape(c)}</option>`).join('')}
      </select>
      <select id="activity-type" class="field" style="max-width:160px">
        <option value="">All Categories</option>
        <option>Food</option>
        <option>Culture</option>
        <option>Outdoor</option>
        <option>Wellness</option>
        <option>Experience</option>
      </select>
      <select id="activity-cost" class="field" style="max-width:140px">
        <option value="">All Prices</option>
        <option value="under30">Under 2,500</option>
        <option value="30to70">2,500 - 6,000</option>
        <option value="over70">Over 6,000</option>
      </select>
    </div>

    <section class="section" style="margin-top:0">
      <div class="section-title">
        <div>
          <h3>Destinations</h3>
          <p>Cities with cost index and popularity ratings.</p>
        </div>
      </div>
      <div class="grid three" id="cities"></div>
    </section>

    <section class="section">
      <div class="section-title">
        <div>
          <h3>Experiences</h3>
          <p>Activities you can add to your trips.</p>
        </div>
      </div>
      <div class="grid three" id="catalogue"></div>
    </section>
  `, 'discover'));

  async function search() {
    const q = $('#discover-search')?.value || '';
    const selectedCountry = $('#discover-country')?.value || '';
    const type = $('#activity-type')?.value || '';
    const costRange = $('#activity-cost')?.value || '';

    const [cityList, acts] = await Promise.all([
      api(`/api/cities?q=${encodeURIComponent(q)}`),
      api(`/api/catalogue/activities?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`)
    ]);

    let filteredCities = cityList;
    if (selectedCountry) {
      filteredCities = filteredCities.filter(c => c.country === selectedCountry);
    }

    let filteredActs = acts.filter(a => {
      const c = Number(a.cost || 0);
      if (costRange === 'under30') return c < 30;
      if (costRange === '30to70') return c >= 30 && c <= 70;
      if (costRange === 'over70') return c > 70;
      return true;
    });

    const defaultImg = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';

    const cityFallbackImages = {
      'Lisbon': 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=800&q=80',
      'Kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
      'Rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
      'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
      'Tokyo': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
      'Reykjavik': 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=800&q=80',
      'Mexico City': 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80',
      'Cape Town': 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80',
      'Melbourne': 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=800&q=80',
      'Marrakesh': 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=800&q=80',
      'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80'
    };

    const activityFallbackImages = {
      'Pastéis & Alfama walk': 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80',
      'Fushimi Inari dawn hike': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
      'Colosseum & Forum guided tour': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
      'Louvre evening tour': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80',
      'Shibuya & Harajuku food crawl': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
      'Blue Lagoon soak': 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=800&q=80',
      'Frida Kahlo Museum': 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80',
      'Table Mountain cableway': 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80',
      'Laneway coffee crawl': 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=800&q=80',
      'Medina food tour': 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=800&q=80',
      'Museum of Modern Art': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80'
    };

    const citiesEl = $('#cities');
    if (citiesEl) {
      citiesEl.innerHTML = filteredCities.length ? filteredCities.map(c => {
        const cityImgSrc = c.image || cityFallbackImages[c.name] || defaultImg;
        return `
          <article class="card trip-card">
            <div class="trip-image" style="background-image:url('${escape(cityImgSrc)}')"></div>
            <div class="content">
              <span class="tag">${escape(c.country)}</span>
              <h3 style="margin-top:10px">${escape(c.name)}</h3>
              <p class="trip-meta">${escape(c.country)} · Cost index ${c.costIndex}/100 · Popularity ${c.popularity}%</p>
              <p>${escape(c.description)}</p>
              <a class="btn ghost small" href="#/new-trip">Plan a trip here →</a>
            </div>
          </article>
        `;
      }).join('') : '<p class="trip-meta">No matching cities found for this country filter.</p>';
    }

    const catalogueEl = $('#catalogue');
    if (catalogueEl) {
      catalogueEl.innerHTML = filteredActs.length ? filteredActs.map(a => {
        const imgSrc = a.image || activityFallbackImages[a.name] || defaultImg;
        return `
          <article class="card experience-card">
            <div class="experience-image-wrap">
              <div class="experience-image" style="background-image:url('${escape(imgSrc)}')" aria-label="${escape(a.name)}">
                <span class="tag experience-tag">${escape(a.category)}</span>
              </div>
            </div>
            <div class="content">
              <div>
                <h3 style="margin-top:0;margin-bottom:6px">${escape(a.name)}</h3>
                <div class="trip-meta" style="margin-bottom:8px">${escape(a.city)} · ${a.duration} hours · ${renderDualMoney(a.cost, a.country || a.city, true)}</div>
                <p style="margin-bottom:14px">${escape(a.description)}</p>
              </div>
              <button class="btn secondary small" data-catalogue="${a.id}" style="width:100%">Add to trip</button>
            </div>
          </article>
        `;
      }).join('') : '<p class="trip-meta">No matching activities found.</p>';

      document.querySelectorAll('[data-catalogue]').forEach(b => {
        b.onclick = () => addCatalogue(filteredActs.find(a => a.id === b.dataset.catalogue));
      });
    }
  }

  const searchInp = $('#discover-search');
  if (searchInp) searchInp.oninput = search;
  const countrySel = $('#discover-country');
  if (countrySel) countrySel.onchange = search;
  const typeSel = $('#activity-type');
  if (typeSel) typeSel.onchange = search;
  const costSel = $('#activity-cost');
  if (costSel) costSel.onchange = search;

  await search();
}

async function addCatalogue(a) {
  if (!a) return;
  if (!state.trips.length) {
    toast('Create a trip first before adding an activity.');
    nav('/new-trip');
    return;
  }

  const choices = state.trips.map(t => `<option value="${t.id}">${escape(t.name)} — ${escape(t.destination)} (${t.currencySymbol || '₹'})</option>`).join('');

  showModal(`Add “${escape(a.name)}” to Trip`, `
    <div class="field">
      <label>Target Trip</label>
      <select name="trip">${choices}</select>
    </div>
    <div class="field">
      <label>Target Stop</label>
      <select name="stop" id="choose-stop"></select>
    </div>
    <div class="field">
      <label>Date</label>
      <input type="date" name="date" required>
    </div>
  `, async d => {
    let trip = state.trips.find(t => t.id === d.trip);
    let stopId = d.stop;

    if (stopId === '__CREATE_STOP__') {
      const newStop = await api(`/api/trips/${trip.id}/stops`, {
        method: 'POST',
        body: JSON.stringify({
          city: a.city || trip.city || trip.destination,
          country: trip.country,
          state: trip.state,
          startDate: trip.startDate,
          endDate: trip.endDate,
          budget: null
        })
      });
      stopId = newStop.id;
    }

    if (!stopId) throw new Error('Please select a valid stop.');

    await api(`/api/stops/${stopId}/activities`, {
      method: 'POST',
      body: JSON.stringify({
        name: a.name,
        description: a.description,
        cost: a.cost,
        duration: a.duration,
        category: a.category,
        date: d.date,
        location: a.city
      })
    });

    await loadTrips();
    toast('Activity added to your itinerary.');
  }, 'Add to Itinerary');

  const populate = () => {
    const tripId = $('[name=trip]')?.value;
    const trip = state.trips.find(t => t.id === tripId);
    if (!trip) return;

    const stopSelect = $('#choose-stop');
    const stops = trip.stops || [];

    if (stops.length) {
      stopSelect.innerHTML = stops.map(s => `<option value="${s.id}">Stop: ${escape(s.city)} (${fmtDate(s.startDate)})</option>`).join('');
    } else {
      stopSelect.innerHTML = `<option value="__CREATE_STOP__">Auto-create Stop for ${escape(a.city || trip.destination)}</option>`;
    }

    const dateInput = $('[name=date]');
    if (dateInput) dateInput.value = trip.startDate;
  };

  const tripSelect = $('[name=trip]');
  if (tripSelect) {
    tripSelect.onchange = populate;
    populate();
  }
}

async function analyticsPage() {
  try {
    const a = await api('/api/analytics');

    if (!a.totalTrips) {
      mount(shell(`
        <section class="page-head">
          <div>
            <div class="eyebrow">Real-Time Data</div>
            <h2>Analytics</h2>
            <p>Calculated directly from your actual trips, stops, and activities.</p>
          </div>
        </section>
        ${empty('No analytics data available yet.', 'Create your first trip to start generating travel analytics.', '#/new-trip', 'Plan a trip')}
      `, 'analytics'));
      return;
    }

    const primaryCurrency = state.trips[0]?.currencyCode || 'INR';
    const isOverBudget = a.totalBudget > 0 && a.totalSpending > a.totalBudget;

    mount(shell(`
      <section class="page-head">
        <div>
          <div class="eyebrow">Real-Time Product Analytics</div>
          <h2>Analytics Dashboard</h2>
          <p>Calculated directly from your actual trips, stops, activities, and budgets.</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <select id="analytics-timeframe" class="input small" style="width:160px">
            <option value="all">Date Range: All Time</option>
            <option value="2026">This Year (2026)</option>
            <option value="6m">Last 6 Months</option>
            <option value="3m">Last 3 Months</option>
          </select>
          <a class="btn" href="#/new-trip">＋ Plan a trip</a>
        </div>
      </section>

      <!-- 1. KPI OVERVIEW (8 Metric Cards) -->
      <section class="section grid four">
        <div class="card stat">
          <b>${a.totalTrips}</b>
          <span>Total Trips</span>
        </div>
        <div class="card stat">
          <b>${a.totalDestinations}</b>
          <span>Total Destinations</span>
        </div>
        <div class="card stat">
          <b>${a.totalStops}</b>
          <span>Total STOPs</span>
        </div>
        <div class="card stat">
          <b>${a.totalActivities}</b>
          <span>Total Activities</span>
        </div>
        <div class="card stat">
          <b style="font-size:22px">${renderDualMoney(a.totalPlannedSpendingINR, 'INR', true)}</b>
          <span>Total Planned Spending</span>
        </div>
        <div class="card stat">
          <b style="font-size:22px">${renderDualMoney(a.avgTripCostINR, 'INR', true)}</b>
          <span>Avg Trip Cost</span>
        </div>
        <div class="card stat">
          <b>${a.avgTripDurationDays} days</b>
          <span>Avg Trip Duration</span>
        </div>
        <div class="card stat">
          <b style="font-size:22px">${renderDualMoney(a.avgDailyCostINR, 'INR', true)}</b>
          <span>Avg Daily Cost</span>
        </div>
      </section>

      <!-- 2. SPENDING OVERVIEW & STATUS BREAKDOWN -->
      <section class="section grid two">
        <article class="card">
          <div class="section-title">
            <div>
              <h3>Monthly Travel Activity & Frequency</h3>
              <p>Trip distribution across months</p>
            </div>
          </div>
          <div style="display:flex;align-items:flex-end;gap:8px;height:140px;margin-top:20px;padding-bottom:10px;border-bottom:1px solid var(--line)">
            ${(a.monthlyActivity || []).map(m => {
              const maxCount = Math.max(1, ...a.monthlyActivity.map(x => x.count));
              const heightPct = Math.round((m.count / maxCount) * 100);
              return `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end">
                  <div style="font-size:10px;color:var(--muted);margin-bottom:4px;font-weight:700">${m.count || ''}</div>
                  <div style="width:100%;max-width:24px;height:${Math.max(4, heightPct)}%;background:${m.count ? 'var(--teal)' : 'var(--line)'};border-radius:4px 4px 0 0;transition:all 0.3s ease"></div>
                  <span style="font-size:11px;color:var(--muted);margin-top:6px;font-weight:600">${m.month}</span>
                </div>
              `;
            }).join('')}
          </div>
        </article>

        <article class="card">
          <div class="section-title">
            <div>
              <h3>Trip Status Analytics</h3>
              <p>Upcoming, ongoing, and completed trips</p>
            </div>
            <span class="tag gold">${a.totalTrips} Total</span>
          </div>
          <div class="summary-line" style="margin-top:16px"><span>Upcoming Trips</span><b class="primary-text">${a.statusBreakdown.upcoming}</b></div>
          <div class="summary-line"><span>Ongoing Trips</span><b style="color:var(--teal)">${a.statusBreakdown.ongoing}</b></div>
          <div class="summary-line"><span>Completed Trips</span><b>${a.statusBreakdown.completed}</b></div>
          <div style="height:10px;background:var(--line);border-radius:99px;margin-top:20px;overflow:hidden;display:flex">
            <div style="width:${a.totalTrips ? (a.statusBreakdown.upcoming / a.totalTrips) * 100 : 0}%;background:#3b82f6" title="Upcoming"></div>
            <div style="width:${a.totalTrips ? (a.statusBreakdown.ongoing / a.totalTrips) * 100 : 0}%;background:#10b981" title="Ongoing"></div>
            <div style="width:${a.totalTrips ? (a.statusBreakdown.completed / a.totalTrips) * 100 : 0}%;background:#64748b" title="Completed"></div>
          </div>
        </article>
      </section>

      <!-- 3. SPENDING BY CATEGORY & BUDGET PERFORMANCE -->
      <section class="section grid two">
        <article class="card">
          <div class="section-title">
            <div>
              <h3>Spending by Category</h3>
              <p>Expense breakdown across activities and services</p>
            </div>
          </div>
          ${(a.expenseBreakdown || []).length ? a.expenseBreakdown.map(item => `
            <div style="margin-top:14px">
              <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:4px">
                <span><b>${escape(item.category)}</b> (${item.percentage}%)</span>
                <span>${renderDualMoney(item.amount, 'INR', true)}</span>
              </div>
              <div style="height:6px;background:var(--line-subtle);border-radius:99px;overflow:hidden">
                <div style="height:100%;width:${item.percentage}%;background:var(--teal)"></div>
              </div>
            </div>
          `).join('') : '<p class="trip-meta" style="margin-top:16px">No activity category expenses recorded yet.</p>'}
        </article>

        <article class="card">
          <div class="section-title">
            <div>
              <h3>Budget Performance & Utilization</h3>
              <p>Financial adherence across all itineraries</p>
            </div>
            <b>${a.budgetPerformance.utilizationPct}% Utilized</b>
          </div>
          <div style="height:10px;background:var(--line);border-radius:99px;margin:16px 0;overflow:hidden">
            <div style="height:100%;width:${Math.min(100, a.budgetPerformance.utilizationPct)}%;background:${isOverBudget ? '#dc2626' : 'var(--teal)'}"></div>
          </div>
          <div class="summary-line"><span>Under-Budget Trips</span><b style="color:#16a34a">${a.budgetPerformance.underBudgetCount} trips</b></div>
          <div class="summary-line"><span>Over-Budget Trips</span><b style="color:#dc2626">${a.budgetPerformance.overBudgetCount} trips</b></div>
          <div class="summary-line"><span>Total Budget Allocated</span><span>${renderDualMoney(a.totalBudget, primaryCurrency, true)}</span></div>
          <div class="summary-line"><span>Total Planned Spend</span><span>${renderDualMoney(a.totalSpending, primaryCurrency, true)}</span></div>
          ${isOverBudget ? '<div class="warning" style="margin-top:14px">Notice: Planned spending exceeds total allocated budgets.</div>' : ''}
        </article>
      </section>

      <!-- 4. TRAVEL DESTINATIONS & CURRENCY DISTRIBUTION -->
      <section class="section grid two">
        <article class="card">
          <div class="section-title">
            <div>
              <h3>Top Travel Destinations</h3>
              <p>Most frequently planned destinations & countries</p>
            </div>
          </div>
          ${(a.destinationBreakdown || []).length ? a.destinationBreakdown.map(d => `
            <div class="summary-line" style="padding:10px 0">
              <div>
                <b>${escape(d.name)}</b>
                <div class="trip-meta" style="font-size:12px">${d.count} ${d.count === 1 ? 'trip' : 'trips'}</div>
              </div>
              <span style="font-weight:700;color:var(--primary)">${renderDualMoney(d.totalSpendINR, 'INR', true)}</span>
            </div>
          `).join('') : '<p class="trip-meta" style="margin-top:16px">No destination stats available.</p>'}
        </article>

        <article class="card">
          <div class="section-title">
            <div>
              <h3>Currency Distribution</h3>
              <p>Primary destination currencies used across trips</p>
            </div>
          </div>
          ${Object.keys(a.currencyDistribution || {}).length ? Object.entries(a.currencyDistribution).map(([code, count]) => `
            <div class="summary-line" style="padding:10px 0">
              <div>
                <b>${escape(code)}</b>
                <span class="trip-meta" style="font-size:12px"> · Authoritative currency</span>
              </div>
              <b>${count} ${count === 1 ? 'trip' : 'trips'}</b>
            </div>
          `).join('') : '<p class="trip-meta" style="margin-top:16px">No currency distribution data.</p>'}
        </article>
      </section>

      <!-- 5. REAL DATA-DRIVEN TRAVEL INSIGHTS -->
      <section class="section card">
        <div class="section-title">
          <div>
            <h3>Real Travel Insights</h3>
            <p>Calculated dynamically from your actual travel history</p>
          </div>
          <span class="tag gold">Automated Insights</span>
        </div>
        <div class="grid two" style="gap:16px;margin-top:16px">
          ${(a.insights || []).map(ins => `
            <div class="card" style="background:var(--bg);border:1px solid var(--line-subtle);padding:18px">
              <div style="display:flex;gap:12px;align-items:flex-start">
                <span style="font-size:20px">💡</span>
                <p style="margin:0;font-weight:600;color:var(--primary);font-size:14px;line-height:1.5">${escape(ins)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `, 'analytics'));
  } catch (e) {
    mount(shell(empty('Analytics unavailable.', e.message, '#/', 'Return to Dashboard'), 'analytics'));
  }
}

function calendarPage() {
  if (!state.calInitialized && state.trips.length) {
    const upcoming = state.trips.find(t => tripStatus(t) === 'Upcoming' || tripStatus(t) === 'Ongoing') || state.trips[0];
    if (upcoming && upcoming.startDate) {
      const d = new Date(`${upcoming.startDate}T12:00:00`);
      if (!isNaN(d.getTime())) {
        state.calYear = d.getFullYear();
        state.calMonth = d.getMonth();
        state.calInitialized = true;
      }
    }
  }

  const renderCal = () => {
    const year = state.calYear;
    const month = state.calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));

    let cells = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(x => `<div class="dow">${x}</div>`);

    for (let i = 0; i < firstDay; i++) cells.push('<div></div>');

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const activeTrips = state.trips.filter(t => t.startDate <= dateStr && t.endDate >= dateStr);
      cells.push(`
        <div>
          <span class="date-num">${d}</span>
          ${activeTrips.map(t => `<a class="cal-trip" href="#/trip/${t.id}" title="${escape(t.name)} (${escape(t.destination)})">${escape(t.name)}</a>`).join('')}
        </div>
      `);
    }

    mount(shell(`
      <section class="page-head">
        <div>
          <div class="eyebrow">Travel Calendar</div>
          <h2>${monthName}</h2>
          <p>Calendar view of your trip itineraries.</p>
        </div>
        <div class="card-actions">
          <button class="btn secondary small" id="cal-prev">← Prev</button>
          <button class="btn secondary small" id="cal-today">Today</button>
          <button class="btn secondary small" id="cal-next">Next →</button>
          <a class="btn small" href="#/new-trip">＋ Plan trip</a>
        </div>
      </section>

      ${state.trips.length ? `<section class="calendar">${cells.join('')}</section>` : empty('No trips on calendar.', 'Your trip dates will appear on the calendar after planning a trip.', '#/new-trip', 'Plan a trip')}
    `, 'calendar'));

    const prevBtn = $('#cal-prev');
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (state.calMonth === 0) {
          state.calMonth = 11;
          state.calYear--;
        } else {
          state.calMonth--;
        }
        renderCal();
      };
    }

    const nextBtn = $('#cal-next');
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (state.calMonth === 11) {
          state.calMonth = 0;
          state.calYear++;
        } else {
          state.calMonth++;
        }
        renderCal();
      };
    }

    const todayBtn = $('#cal-today');
    if (todayBtn) {
      todayBtn.onclick = () => {
        state.calMonth = new Date().getMonth();
        state.calYear = new Date().getFullYear();
        renderCal();
      };
    }
  };

  renderCal();
}

async function profile() {
  const user = state.user || {};
  const userPref = user.preferredCurrency || 'INR';

  mount(shell(`
    <section class="page-head">
      <div>
        <div class="eyebrow">Account Settings</div>
        <h2>Profile</h2>
        <p>Manage your account details, preferences, security, and password.</p>
      </div>
      <button class="btn ghost" id="logout">Sign out</button>
    </section>

    <section class="profile">
      <aside class="card profile-card">
        ${profilePhotoHtml(user)}
        <h3>${escape(user.firstName)} ${escape(user.lastName)}</h3>
        <p class="trip-meta">${escape(user.email)}</p>
        <p class="trip-meta">${escape(user.city || 'Location unspecified')}${user.country ? ' · ' + escape(user.country) : ''}</p>
        <span class="tag">${escape(user.role || 'user')}</span>
      </aside>

      <div>
        <div class="card">
          <h3>Personal Details & Preferences</h3>
          <form id="profile-form" class="form" style="margin-top:14px">
            <div class="form-row">
              <div class="field">
                <label>First Name</label>
                <input name="firstName" required value="${escape(user.firstName)}">
              </div>
              <div class="field">
                <label>Last Name</label>
                <input name="lastName" required value="${escape(user.lastName)}">
              </div>
            </div>

            <div class="form-row">
              <div class="field">
                <label>Phone Number</label>
                <input name="phone" value="${escape(user.phone)}">
              </div>
              <div class="field">
                <label>City</label>
                <input name="city" value="${escape(user.city)}">
              </div>
            </div>

            <div class="form-row">
              <div class="field">
                <label>Country</label>
                <input name="country" value="${escape(user.country)}">
              </div>
              <div class="field">
                <label>Language</label>
                <select name="language">
                  ${['English', 'Spanish', 'French', 'Japanese', 'German'].map(x => `<option ${user.language === x ? 'selected' : ''}>${x}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="field">
              <label>Preferred Reference Currency <small>(Used for converter defaults and home references)</small></label>
              <select name="preferredCurrency">
                ${supportedCurrencies.map(c => `<option value="${c.code}" ${userPref === c.code ? 'selected' : ''}>${c.code} — ${c.name} (${c.symbol})</option>`).join('')}
              </select>
            </div>

            <div class="field">
              <label>Profile Photo URL <small>(optional)</small></label>
              <input name="photo" type="url" value="${escape(user.photo)}" placeholder="https://images.unsplash.com/...">
            </div>

            <div class="card-actions">
              <button class="btn" type="submit">Save Profile</button>
            </div>
          </form>
        </div>

        <div class="card" style="margin-top:20px">
          <h3>Security & Two-Factor Authentication</h3>
          <p style="color:var(--muted);font-size:13px;margin-bottom:14px">Protect your account and password recovery using Google Authenticator (TOTP).</p>

          ${user.totpEnabled ? `
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div>
                <span class="tag" style="background:#e7f4e8;color:#1e5e27;border-color:#bce3c1">Google Authenticator Enabled</span>
              </div>
              <button class="btn secondary danger-text" id="disable-2fa-btn">Disable 2FA</button>
            </div>
          ` : `
            <div>
              <button class="btn secondary" id="enable-2fa-btn">Enable Google Authenticator</button>
            </div>
          `}
        </div>

        <div class="card" style="margin-top:20px">
          <h3>Change Password</h3>
          <form id="change-password-form" class="form" style="margin-top:14px">
            <div class="field">
              <label>Current Password</label>
              <input name="currentPassword" type="password" required autocomplete="current-password">
            </div>
            <div class="form-row">
              <div class="field">
                <label>New Password</label>
                <input name="newPassword" type="password" required autocomplete="new-password">
              </div>
              <div class="field">
                <label>Confirm New Password</label>
                <input name="confirmPassword" type="password" required autocomplete="new-password">
              </div>
            </div>
            <div id="change-pass-error"></div>
            <div class="card-actions">
              <button class="btn secondary" type="submit">Update Password</button>
            </div>
          </form>
        </div>

        <div class="card" style="margin-top:20px">
          <h3>Danger Zone</h3>
          <p style="color:var(--muted);font-size:13px;margin-bottom:14px">Permanently delete your account and all associated trip data.</p>
          <button class="btn danger" type="button" id="delete-account">Delete Account</button>
        </div>
      </div>
    </section>
  `, 'profile'));

  const enable2faBtn = $('#enable-2fa-btn');
  if (enable2faBtn) {
    enable2faBtn.onclick = async () => {
      try {
        const setup = await api('/api/2fa/setup', { method: 'POST', body: '{}' });
        showModal('Enable Google Authenticator 2FA', `
          <p style="font-size:13px;color:var(--muted)">1. Scan this QR code using the Google Authenticator app on your mobile device:</p>
          <div style="margin:14px 0;text-align:center">${setup.qrSvg}</div>
          <p style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:14px">Manual Base32 Key: <code style="background:#f4f7f5;padding:2px 6px;border-radius:4px">${escape(setup.secret)}</code></p>
          <div class="field">
            <label>2. Enter the current 6-digit code from Google Authenticator</label>
            <input name="code" required placeholder="123456" autocomplete="one-time-code" maxlength="6" autofocus>
          </div>
        `, async data => {
          const res = await api('/api/2fa/verify-setup', { method: 'POST', body: JSON.stringify(data) });
          state.user = await api('/api/auth/me');
          if (res.recoveryCodes) {
            showModal('Recovery Codes', `
              <p class="warning" style="margin-bottom:14px">Save these recovery codes securely. Each code can be used ONCE for password recovery if you lose access to Google Authenticator.</p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f4f7f5;padding:12px;border-radius:6px;font-family:monospace;font-weight:bold;margin-bottom:14px">
                ${res.recoveryCodes.map(c => `<div>${escape(c)}</div>`).join('')}
              </div>
            `, () => profile(), 'I have saved my recovery codes');
          } else {
            toast('2FA Enabled.');
            profile();
          }
        }, 'Verify & Enable 2FA');
      } catch (err) {
        toast(err.message);
      }
    };
  }

  const disable2faBtn = $('#disable-2fa-btn');
  if (disable2faBtn) {
    disable2faBtn.onclick = () => {
      showModal('Disable Two-Factor Authentication', `
        <div class="field">
          <label>Current Password</label>
          <input name="currentPassword" type="password" required autocomplete="current-password">
        </div>
        <div class="field">
          <label>Google Authenticator Code (or Recovery Code)</label>
          <input name="code" required placeholder="123456" autocomplete="one-time-code">
        </div>
      `, async data => {
        const res = await api('/api/2fa/disable', { method: 'POST', body: JSON.stringify(data) });
        toast(res.message);
        state.user = await api('/api/auth/me');
        profile();
      }, 'Disable 2FA');
    };
  }

  const profileForm = $('#profile-form');
  if (profileForm) {
    profileForm.onsubmit = async e => {
      e.preventDefault();
      try {
        state.user = await api('/api/profile', {
          method: 'PATCH',
          body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
        });
        toast('Profile updated.');
        profile();
      } catch (err) {
        toast(err.message);
      }
    };
  }

  const changePassForm = $('#change-password-form');
  if (changePassForm) {
    changePassForm.onsubmit = async e => {
      e.preventDefault();
      const form = Object.fromEntries(new FormData(e.target));
      const errBox = $('#change-pass-error');
      if (form.newPassword.length < 8 || !/[A-Z]/.test(form.newPassword) || !/[a-z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword)) {
        if (errBox) errBox.innerHTML = `<div class="alert">Password must be at least 8 characters long and contain uppercase, lowercase, and a number.</div>`;
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        if (errBox) errBox.innerHTML = `<div class="alert">Passwords do not match.</div>`;
        return;
      }
      try {
        const res = await api('/api/profile/change-password', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        toast(res.message);
        signOut();
      } catch (err) {
        if (errBox) errBox.innerHTML = `<div class="alert">${escape(err.message)}</div>`;
      }
    };
  }

  const logoutBtn = $('#logout');
  if (logoutBtn) logoutBtn.onclick = signOut;

  const deleteBtn = $('#delete-account');
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      showModal('Delete Account', `
        <p>This will permanently remove your account and all associated trip data. Type <b>DELETE</b> to confirm.</p>
        <div class="field">
          <label>Confirmation</label>
          <input name="confirm" required placeholder="DELETE">
        </div>
      `, async data => {
        await api('/api/profile', { method: 'DELETE', body: JSON.stringify(data) });
        localStorage.removeItem('gt_token');
        state.token = null;
        state.user = null;
        state.trips = [];
        toast('Account deleted.');
        nav('/register');
      }, 'Permanently Delete');
    };
  }
}

async function publicTrip(slug) {
  try {
    const { trip: t, owner } = await api(`/api/public?slug=${encodeURIComponent(slug)}`, { headers: {} });
    const stops = t.stops || [];
    const curr = t.currencyCode || t.country;

    mount(`
      <header class="topbar">
        <div class="shell navbar-inner">
          <a class="brand" href="#/">Globe<span>Trotter</span></a>
          <div class="nav-right">
            ${state.user ? '<a class="btn secondary small" href="#/">My Dashboard</a>' : '<a class="btn secondary small" href="#/login">Sign in</a>'}
          </div>
        </div>
      </header>

      <main class="shell">
        <section class="public-hero" ${cover(t)}>
          <div class="eyebrow">Shared Itinerary · ${escape(t.country)}</div>
          <h1>${escape(t.name)}</h1>
          <p>${escape(t.destination)} · ${fmtDate(t.startDate)} — ${fmtDate(t.endDate)}</p>
          <p>Created by ${escape(owner.name)}</p>
          <div style="margin-top:8px">
            <span style="font-size:18px;font-weight:bold;color:#fff">${renderDualMoney(t.budget, curr, true)}</span>
          </div>
          <div class="card-actions">
            ${state.user ? '<button class="btn" id="copy-trip">Copy Trip to My Trips</button>' : '<a class="btn" href="#/login">Sign in to copy trip</a>'}
            <button class="btn secondary" id="native-share">Share Link</button>
          </div>
        </section>

        <section class="itinerary section">
          <div>
            <div class="section-title">
              <div>
                <h2>Itinerary Overview</h2>
                <p>Read-only shared trip details.</p>
              </div>
            </div>
            ${stops.map(s => renderStop(s, t, false)).join('') || '<p class="trip-meta">No stops created for this itinerary.</p>'}
          </div>
          ${budgetCard(t)}
        </section>
      </main>
    `);

    const copyBtn = $('#copy-trip');
    if (copyBtn) {
      copyBtn.onclick = async () => {
        try {
          const copied = await api(`/api/trips/${t.id}/copy`, { method: 'POST', body: '{}' });
          await loadTrips();
          toast('Trip copied to your account.');
          nav(`/builder/${copied.id}`);
        } catch (e) {
          toast(e.message);
        }
      };
    }

    const shareBtn = $('#native-share');
    if (shareBtn) {
      shareBtn.onclick = async () => {
        const link = location.href;
        if (navigator.share) {
          await navigator.share({ title: t.name, url: link }).catch(() => {});
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(link);
          toast('Public link copied to clipboard.');
        }
      };
    }
  } catch (e) {
    mount(`<main class="shell">${empty('Shared Itinerary Unavailable', e.message, '#/', 'Go Home')}</main>`);
  }
}

async function admin() {
  try {
    const a = await api('/api/admin/analytics');
    const bar = items => items.length
      ? items.map(x => `<div class="summary-line"><span>${escape(x.name)}</span><b>${x.count}</b></div>`).join('')
      : '<p class="trip-meta">No data recorded.</p>';

    mount(shell(`
      <section class="page-head">
        <div>
          <div class="eyebrow">Administration</div>
          <h2>Admin Analytics</h2>
          <p>System metrics and usage overview.</p>
        </div>
      </section>

      <section class="grid three">
        <div class="card stat"><b>${a.users}</b><span>Registered users</span></div>
        <div class="card stat"><b>${a.trips}</b><span>Trips created</span></div>
        <div class="card stat"><b>${a.publicTrips}</b><span>Shared itineraries</span></div>
      </section>

      <section class="section grid two">
        <article class="card">
          <h3>Popular Destinations</h3>
          <p class="trip-meta">Ranked by stops created</p>
          ${bar(a.cities)}
        </article>
        <article class="card">
          <h3>Popular Activity Categories</h3>
          <p class="trip-meta">Ranked by planned activities</p>
          ${bar(a.activities)}
        </article>
      </section>
    `, 'admin'));
  } catch (e) {
    mount(shell(empty('Access Denied', e.message, '#/', 'Return to Dashboard'), ''));
  }
}

async function render() {
  try {
    const hashPath = location.hash.slice(1) || '/';
    const path = hashPath.split('?')[0];
    state.route = path;
    const [base, arg] = path.slice(1).split('/');

    if (base === 'public') return publicTrip(arg);

    if (base === 'login' || base === 'register' || base === 'forgot-password' || base === 'reset-password' || base === 'verify-email') {
      return authPage(base);
    }

    if (!state.token) {
      return authPage('login');
    }

    if (state.token && !state.user) {
      try {
        state.user = await api('/api/auth/me');
        await loadTrips();
      } catch {
        localStorage.removeItem('gt_token');
        state.token = null;
        state.user = null;
        return authPage('login');
      }
    }

    if (base === '') return dashboard();
    if (base === 'new-trip') return newTrip();
    if (base === 'trips') return tripsPage();
    if (base === 'trip') return detail(arg);
    if (base === 'builder') return builder(arg);
    if (base === 'edit-trip') {
      const t = state.trips.find(x => x.id === arg) || await api(`/api/trips/${arg}`);
      return newTrip(t);
    }
    if (base === 'discover') return discover();
    if (base === 'ai-planner') return aiPlanner();
    if (base === 'converter') return converterPage();
    if (base === 'analytics') return analyticsPage();
    if (base === 'calendar') return calendarPage();
    if (base === 'profile') return profile();
    if (base === 'admin') return admin();

    return dashboard();
  } catch (err) {
    console.error('Render error:', err);
    if (state.token) {
      dashboard();
    } else {
      authPage('login');
    }
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('load', render);
render();
