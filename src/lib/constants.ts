export interface Comp {
  id: string;
  title: string;
  status: string;
  endDate: string;
  _count: { competitors: number };
  prizePool: number;
}

export interface LbEntry {
  id: string;
  username: string;
  displayName?: string;
  avatar: string | null;
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  rank: number;
  roi: string;
  currentBalance?: number;
}

export interface Trade {
  id: string;
  pair: string;
  direction: string;
  lotSize: number;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number;
  status: string;
  openedAt: string;
  competitor?: { username: string };
}

export const PAIRS: Record<string, { g: string; f: string; p: number; vol: number; pip: number; d: number; ls: number; sp: number }> = {
  'EUR/USD': { g: 'Forex Majors', f: 'Euro / US Dollar', p: 1.14548, vol: .00025, pip: .0001, d: 5, ls: 100000, sp: .00012 },
  'GBP/USD': { g: 'Forex Majors', f: 'British Pound / US Dollar', p: 1.34953, vol: .00030, pip: .0001, d: 5, ls: 100000, sp: .00015 },
  'USD/JPY': { g: 'Forex Majors', f: 'US Dollar / Japanese Yen', p: 162.330, vol: .035, pip: .01, d: 3, ls: 100000, sp: .015 },
  'AUD/USD': { g: 'Forex Majors', f: 'Australian Dollar / US Dollar', p: 0.69930, vol: .00020, pip: .0001, d: 5, ls: 100000, sp: .00014 },
  'NZD/USD': { g: 'Forex Majors', f: 'New Zealand Dollar / US Dollar', p: 0.58480, vol: .00018, pip: .0001, d: 5, ls: 100000, sp: .00016 },
  'USD/CAD': { g: 'Forex Majors', f: 'US Dollar / Canadian Dollar', p: 1.40000, vol: .00025, pip: .0001, d: 5, ls: 100000, sp: .00015 },
  'EUR/GBP': { g: 'Forex Crosses', f: 'Euro / British Pound', p: .84880, vol: .00018, pip: .0001, d: 5, ls: 100000, sp: .00018 },
  'EUR/JPY': { g: 'Forex Crosses', f: 'Euro / Japanese Yen', p: 185.945, vol: .040, pip: .01, d: 3, ls: 100000, sp: .020 },
  'GBP/JPY': { g: 'Forex Crosses', f: 'British Pound / Japanese Yen', p: 219.069, vol: .045, pip: .01, d: 3, ls: 100000, sp: .025 },
  'USD/CHF': { g: 'Forex Majors', f: 'US Dollar / Swiss Franc', p: 0.80800, vol: .00022, pip: .0001, d: 5, ls: 100000, sp: .00012 },
  'BTC/USD': { g: 'Crypto', f: 'Bitcoin', p: 62907.77, vol: 15, pip: .01, d: 2, ls: 1, sp: 1.5 },
  'ETH/USD': { g: 'Crypto', f: 'Ethereum', p: 1831.40, vol: 2.5, pip: .01, d: 2, ls: 1, sp: .8 },
  'SOL/USD': { g: 'Crypto', f: 'Solana', p: 74.57, vol: .8, pip: .01, d: 2, ls: 1, sp: .15 },
  'XRP/USD': { g: 'Crypto', f: 'Ripple', p: 1.0860, vol: .002, pip: .0001, d: 4, ls: 1, sp: .0008 },
  'DOGE/USD': { g: 'Crypto', f: 'Dogecoin', p: .0718, vol: .001, pip: .0001, d: 4, ls: 1, sp: .0005 },
};

export const TICKER_PAIRS = [
  { pair: 'EUR/USD', price: 1.1455, change: 0.10 }, { pair: 'GBP/USD', price: 1.3495, change: -0.05 },
  { pair: 'USD/JPY', price: 162.33, change: 0.28 }, { pair: 'AUD/USD', price: 0.6993, change: -0.15 },
  { pair: 'XAU/USD', price: 2342.50, change: 1.24 }, { pair: 'BTC/USD', price: 62907.77, change: -1.20 },
  { pair: 'ETH/USD', price: 1831.40, change: -0.85 }, { pair: 'SOL/USD', price: 74.57, change: -0.32 },
];
