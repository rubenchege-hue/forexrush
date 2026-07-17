import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fp = (p: number, dec?: number) => {
  const d = dec ?? 5;
  if (d <= 2 && Math.abs(p) >= 1000) return p.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return p.toFixed(d);
};

export const ns = (range: number, ticks: number) => {
  const r = range / ticks;
  const m = Math.pow(10, Math.floor(Math.log10(Math.max(r, 1e-12))));
  const n = r / m;
  return Math.max((n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10) * m, 1e-12);
};

export const fmt$ = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2);

export const fmtBal = (v: number) => '$' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
