const fallbackRatesUSD = {
  USD: 1.0,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 155.0,
  CNY: 7.23,
  AUD: 1.51,
  CAD: 1.36,
  SGD: 1.35,
  AED: 3.67,
  CHF: 0.90,
  KRW: 1370.0,
  THB: 36.5,
  IDR: 16000.0,
  VND: 25400.0,
  TRY: 32.2,
  BRL: 5.15,
  MXN: 16.7,
  ZAR: 18.4,
  NZD: 1.64,
  MYR: 4.72,
  ISK: 138.0
};

const cache = {
  rates: { ...fallbackRatesUSD },
  lastUpdated: new Date().toISOString(),
  lastFetched: null,
  isLive: false,
  ttlMs: 60 * 60 * 1000
};

async function fetchLiveRates() {
  const now = Date.now();
  if (cache.lastFetched && (now - cache.lastFetched < cache.ttlMs)) {
    return cache;
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && typeof data.rates === 'object') {
        cache.rates = { ...fallbackRatesUSD, ...data.rates };
        cache.lastUpdated = new Date().toISOString();
        cache.lastFetched = now;
        cache.isLive = true;
        cache.source = 'Live Exchange Rate';
        return cache;
      }
    }
  } catch {
    // Fail silently to cached/fallback rates
  }

  cache.isLive = false;
  cache.source = 'Cached Exchange Rate';
  return cache;
}

async function getExchangeRate(fromCurrency, toCurrency) {
  const from = String(fromCurrency || 'USD').toUpperCase();
  const to = String(toCurrency || 'USD').toUpperCase();

  if (from === to) {
    return { from, to, rate: 1.0, isLive: true, source: 'Home Currency', lastUpdated: new Date().toISOString() };
  }

  const rateData = await fetchLiveRates();
  const rates = rateData.rates;

  const fromRateInUSD = rates[from];
  const toRateInUSD = rates[to];

  if (!fromRateInUSD || !toRateInUSD) {
    const err = new Error(`Unsupported currency code: ${!fromRateInUSD ? from : to}`);
    err.status = 400;
    throw err;
  }

  const rate = (1 / fromRateInUSD) * toRateInUSD;

  return {
    from,
    to,
    rate: Math.round(rate * 1000000) / 1000000,
    isLive: rateData.isLive,
    source: rateData.source,
    lastUpdated: rateData.lastUpdated
  };
}

async function convertCurrency(amount, fromCurrency, toCurrency) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0) {
    const err = new Error('Please enter a valid positive numerical amount.');
    err.status = 422;
    throw err;
  }

  const rateInfo = await getExchangeRate(fromCurrency, toCurrency);
  const convertedAmount = num * rateInfo.rate;

  return {
    amount: num,
    from: rateInfo.from,
    to: rateInfo.to,
    rate: rateInfo.rate,
    convertedAmount: Math.round(convertedAmount * 100) / 100,
    isLive: rateInfo.isLive,
    source: rateInfo.source,
    lastUpdated: rateInfo.lastUpdated
  };
}

async function getRateToINR(currencyCode) {
  const code = String(currencyCode || 'INR').toUpperCase();
  if (code === 'INR') {
    return { from: 'INR', to: 'INR', rate: 1.0, isLive: true, source: 'Home Currency (INR)', lastUpdated: new Date().toISOString() };
  }
  return await getExchangeRate(code, 'INR');
}

module.exports = {
  fetchLiveRates,
  getExchangeRate,
  convertCurrency,
  getRateToINR,
  fallbackRatesUSD
};
