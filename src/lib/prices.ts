import { PAIRS } from '@/lib/constants';

export interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  t: number;
}

export interface PairData {
  cn: Candle[];
  cp: number;
  ch: number;
}

export function genCandles(n: number, start: number, vol: number): Candle[] {
  const d: Candle[] = [];
  let pr = start;
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const dr = (Math.random() - 0.48) * vol;
    const o = pr;
    const c = o + dr;
    const h = Math.max(o, c) + Math.random() * vol * 0.8;
    const l = Math.min(o, c) - Math.random() * vol * 0.8;
    d.push({ o, h, l, c, v: 50 + Math.random() * 450, t: now - (n - i) * 15 * 60000 });
    pr = c;
  }
  return d;
}

export function generateTick(
  prev: Record<string, PairData>
): Record<string, PairData> {
  const next: Record<string, PairData> = { ...prev };
  for (const [s, cfg] of Object.entries(PAIRS)) {
    if (!next[s]) continue;
    const cn = [...next[s].cn];
    const last = cn[cn.length - 1];
    const drift = (Math.random() - 0.48) * cfg.vol * 0.3;
    const newC = last.c + drift;
    const newO = last.c;
    const h = Math.max(newO, newC) + Math.random() * cfg.vol * 0.15;
    const l = Math.min(newO, newC) - Math.random() * cfg.vol * 0.15;
    cn.push({ o: newO, h, l, c: newC, v: 50 + Math.random() * 200, t: Date.now() });
    if (cn.length > 500) cn.shift();
    next[s] = { ...next[s], cn, cp: newC, ch: ((newC - cn[0].o) / cn[0].o) * 100 };
  }
  return next;
}
