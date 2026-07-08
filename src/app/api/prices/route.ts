import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [forexRes, cryptoRes] = await Promise.allSettled([
      fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        signal: AbortSignal.timeout(5000),
      }),
      fetch('https://api.binance.com/api/v3/ticker/price', {
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    const prices: Record<string, number> = {};

    // ── Forex rates ───────────────────────────────────────────────
    if (forexRes.status === 'fulfilled') {
      try {
        const data = await forexRes.value.json();
        const r = data.rates;
        if (r) {
          if (r.EUR) prices['EUR/USD'] = 1 / r.EUR;
          if (r.GBP) prices['GBP/USD'] = 1 / r.GBP;
          if (r.JPY) prices['USD/JPY'] = r.JPY;
          if (r.AUD) prices['AUD/USD'] = 1 / r.AUD;
          if (r.NZD) prices['NZD/USD'] = 1 / r.NZD;
          if (r.CAD) prices['USD/CAD'] = r.CAD;
          if (r.CHF) prices['USD/CHF'] = r.CHF;
          // Crosses derived from majors
          if (prices['EUR/USD'] && prices['GBP/USD']) {
            prices['EUR/GBP'] = prices['EUR/USD'] / prices['GBP/USD'];
          }
          if (prices['EUR/USD'] && prices['USD/JPY']) {
            prices['EUR/JPY'] = prices['EUR/USD'] * prices['USD/JPY'];
          }
          if (prices['GBP/USD'] && prices['USD/JPY']) {
            prices['GBP/JPY'] = prices['GBP/USD'] * prices['USD/JPY'];
          }
        }
      } catch { /* parse error */ }
    }

    // ── Crypto from Binance ───────────────────────────────────────
    if (cryptoRes.status === 'fulfilled') {
      try {
        const data = await cryptoRes.value.json();
        const map: Record<string, string> = {
          BTCUSDT: 'BTC/USD',
          ETHUSDT: 'ETH/USD',
          SOLUSDT: 'SOL/USD',
          XRPUSDT: 'XRP/USD',
          DOGEUSDT: 'DOGE/USD',
        };
        if (Array.isArray(data)) {
          for (const item of data) {
            const mapped = map[item.symbol];
            if (mapped) prices[mapped] = parseFloat(item.price);
          }
        }
      } catch { /* parse error */ }
    }

    if (Object.keys(prices).length === 0) {
      return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 503 });
    }

    return NextResponse.json(prices);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 503 });
  }
}