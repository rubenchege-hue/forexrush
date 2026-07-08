'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Key, Lock, CheckCircle2, XCircle, Eye, EyeOff, Zap, Trophy, Shield, Crown, Medal, BarChart3, Sofa } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════
interface Comp { id: string; title: string; status: string; endDate: string; _count: { competitors: number }; prizePool: number; }
interface LbEntry { id: string; username: string; displayName?: string; avatar: string | null; totalPnl: number; totalTrades: number; winRate: number; rank: number; roi: string; currentBalance?: number; }
interface Trade { id: string; pair: string; direction: string; lotSize: number; entryPrice: number; exitPrice: number | null; pnl: number; status: string; openedAt: string; competitor?: { username: string }; }

// ═══════════════════════════════════════════════════════════════
//  PAIR CONFIG (from Bullrush)
// ═══════════════════════════════════════════════════════════════
const PAIRS: Record<string, { g: string; f: string; p: number; vol: number; pip: number; d: number; ls: number; sp: number; }> = {
  'EUR/USD': { g:'Forex Majors', f:'Euro / US Dollar', p:1.08470, vol:.00025, pip:.0001, d:5, ls:100000, sp:.00012 },
  'GBP/USD': { g:'Forex Majors', f:'British Pound / US Dollar', p:1.27150, vol:.00030, pip:.0001, d:5, ls:100000, sp:.00015 },
  'USD/JPY': { g:'Forex Majors', f:'US Dollar / Japanese Yen', p:155.320, vol:.035, pip:.01, d:3, ls:100000, sp:.015 },
  'AUD/USD': { g:'Forex Majors', f:'Australian Dollar / US Dollar', p:0.65480, vol:.00020, pip:.0001, d:5, ls:100000, sp:.00014 },
  'NZD/USD': { g:'Forex Majors', f:'New Zealand Dollar / US Dollar', p:0.60120, vol:.00018, pip:.0001, d:5, ls:100000, sp:.00016 },
  'USD/CAD': { g:'Forex Majors', f:'US Dollar / Canadian Dollar', p:1.37250, vol:.00025, pip:.0001, d:5, ls:100000, sp:.00015 },
  'EUR/GBP': { g:'Forex Crosses', f:'Euro / British Pound', p:.85320, vol:.00018, pip:.0001, d:5, ls:100000, sp:.00018 },
  'EUR/JPY': { g:'Forex Crosses', f:'Euro / Japanese Yen', p:168.450, vol:.040, pip:.01, d:3, ls:100000, sp:.020 },
  'GBP/JPY': { g:'Forex Crosses', f:'British Pound / Japanese Yen', p:197.380, vol:.045, pip:.01, d:3, ls:100000, sp:.025 },
  'USD/CHF': { g:'Forex Majors', f:'US Dollar / Swiss Franc', p:0.88250, vol:.00022, pip:.0001, d:5, ls:100000, sp:.00012 },
  'BTC/USD': { g:'Crypto', f:'Bitcoin', p:67432.18, vol:15, pip:.01, d:2, ls:1, sp:1.5 },
  'ETH/USD': { g:'Crypto', f:'Ethereum', p:3521.07, vol:2.5, pip:.01, d:2, ls:1, sp:.8 },
  'SOL/USD': { g:'Crypto', f:'Solana', p:172.44, vol:.8, pip:.01, d:2, ls:1, sp:.15 },
  'XRP/USD': { g:'Crypto', f:'Ripple', p:.5234, vol:.002, pip:.0001, d:4, ls:1, sp:.0008 },
  'DOGE/USD': { g:'Crypto', f:'Dogecoin', p:.1642, vol:.001, pip:.0001, d:4, ls:1, sp:.0005 },
};

const TICKER_PAIRS = [
  { pair:'EUR/USD', price:1.0876, change:0.12 }, { pair:'GBP/USD', price:1.2734, change:-0.08 },
  { pair:'USD/JPY', price:149.82, change:0.34 }, { pair:'AUD/USD', price:0.6543, change:-0.21 },
  { pair:'XAU/USD', price:2342.50, change:1.24 }, { pair:'BTC/USD', price:67842, change:2.15 },
  { pair:'ETH/USD', price:3521, change:1.05 }, { pair:'SOL/USD', price:172.44, change:-0.45 },
];

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
const fp = (p: number, dec?: number) => {
  const d = dec ?? 5;
  if (d <= 2 && Math.abs(p) >= 1000) return p.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return p.toFixed(d);
};
const ns = (range: number, ticks: number) => {
  const r = range / ticks, m = Math.pow(10, Math.floor(Math.log10(Math.max(r, 1e-12))));
  const n = r / m;
  return Math.max((n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10) * m, 1e-12);
};
const fmt$ = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2);
const fmtBal = (v: number) => '$' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ═══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function Home() {
  // ── App state ─────────────────────────────────────────────────
  const [phase, setPhase] = useState<'loading' | 'landing' | 'enroll' | 'arena'>('loading');
  const [comp, setComp] = useState<Comp | null>(null);
  const [leaderboard, setLeaderboard] = useState<LbEntry[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);

  // License form
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [licErr, setLicErr] = useState('');
  const [licBusy, setLicBusy] = useState(false);
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');

  // My profile
  const [myName, setMyName] = useState('');
  const [myId, setMyId] = useState('');

  // ── Init ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await fetch('/api/seed', { method: 'POST' });
        const cr = await fetch('/api/competitions');
        const cs = await cr.json();
        const a = cs.find((c: Comp) => c.status === 'active') || cs[0];
        if (a) {
          setComp(a);
          const [lb, tr] = await Promise.all([
            fetch(`/api/leaderboard?competitionId=${a.id}`).then(r => r.json()),
            fetch(`/api/trades?competitionId=${a.id}`).then(r => r.json()),
          ]);
          setLeaderboard(lb);
          setRecentTrades(tr);

          // Check for existing session
          const saved = localStorage.getItem('fx_session');
          if (saved) {
            try {
              const s = JSON.parse(saved);
              const me = lb.find((e: LbEntry) => e.id === s.myId);
              if (me) {
                setMyId(s.myId);
                setMyName(me.displayName || me.username);
                setPhase('arena');
                return;
              }
            } catch { localStorage.removeItem('fx_session'); }
          }
        }
      } catch (e) { console.error(e); }
      setPhase('landing');
    })();
  }, []);

  // ── Verify license ───────────────────────────────────────────
  const verifyLic = useCallback(async () => {
    if (!code.trim()) return;
    setLicBusy(true); setLicErr('');
    try {
      const r = await fetch(`/api/license?code=${encodeURIComponent(code.trim())}`);
      const d = await r.json();
      if (d.valid) { setVerifiedName(d.clientName); setPhase('enroll'); }
      else setLicErr(d.error || 'Invalid code');
    } catch { setLicErr('Network error'); }
    setLicBusy(false);
  }, [code]);

  // ── Redeem & enter arena ──────────────────────────────────────
  const doEnroll = useCallback(async () => {
    if (!code.trim() || !username.trim() || !comp) return;
    setRedeemBusy(true); setLicErr('');
    try {
      const r = await fetch('/api/license', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), competitionId: comp.id, username: username.trim() }),
      });
      const d = await r.json();
      if (d.success) {
        setMyId(d.competitor.id);
        setMyName(d.competitor.displayName || d.competitor.username);
        localStorage.setItem('fx_session', JSON.stringify({ myId: d.competitor.id }));
        const lb = await fetch(`/api/leaderboard?competitionId=${comp.id}`).then(r2 => r2.json());
        setLeaderboard(lb);
        setPhase('arena');
      } else setLicErr(d.error || 'Failed');
    } catch { setLicErr('Network error'); }
    setRedeemBusy(false);
  }, [code, username, comp]);

  // ═══════════════════════════════════════════════════════════════
  //  LOADING
  // ═══════════════════════════════════════════════════════════════
  if (phase === 'loading') return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#07070c' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: '#c8f542' }}>
          <Zap size={18} style={{ color: '#07070c' }} />
        </div>
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#c8f542' }} />
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  LANDING
  // ═══════════════════════════════════════════════════════════════
  if (phase === 'landing') return (
    <div className="min-h-screen flex flex-col" style={{ background: '#07070c', color: '#ededf4', fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Ticker */}
      <div className="overflow-hidden border-b" style={{ borderColor: '#1e1e30' }}>
        <div className="flex animate-ticker whitespace-nowrap py-1 px-4" style={{ background: '#0d0d14' }}>
          {[...TICKER_PAIRS, ...TICKER_PAIRS].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-2 mx-5 text-xs">
              <span style={{ color: '#8585a0' }}>{t.pair}</span>
              <span className="tabular-nums">{t.price.toFixed(t.pair === 'XAU/USD' ? 2 : 4)}</span>
              <span className="tabular-nums" style={{ color: t.change >= 0 ? '#00e87b' : '#ff3b5c' }}>
                {t.change >= 0 ? '+' : ''}{t.change.toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      <nav className="flex items-center justify-between px-4 h-12 border-b" style={{ background: '#0d0d14', borderColor: '#282840' }}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: '#c8f542' }}>
            <Zap size={12} style={{ color: '#07070c' }} />
          </div>
          <span className="text-base font-bold tracking-tight">ForexRush</span>
          {comp && <Badge className="text-[9px] px-1.5 py-0 border" style={{ borderColor: 'rgba(200,245,66,.3)', color: '#c8f542', background: 'transparent' }}>LIVE</Badge>}
        </div>
        <Button onClick={() => setPhase('landing')} className="text-xs font-semibold h-8 px-4 rounded-lg" style={{ background: '#c8f542', color: '#07070c' }}>
          <Key size={12} className="mr-1.5" /> Redeem Code
        </Button>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Enter the Arena.</h1>
            <p className="text-sm" style={{ color: '#8585a0' }}>Redeem your exclusive access code to join the forex competition.</p>
          </div>

          <div className="rounded-xl p-5 border" style={{ background: '#0d0d14', borderColor: '#282840' }}>
            <div className="flex items-center gap-2 mb-4">
              <Key size={16} style={{ color: '#c8f542' }} />
              <span className="text-sm font-semibold">Redeem Access Code</span>
            </div>
            <div className="relative mb-3">
              <input
                placeholder="COMP-XXXX-XXXX" value={code} maxLength={14}
                onChange={e => { setCode(e.target.value.toUpperCase()); setLicErr(''); }}
                onKeyDown={e => e.key === 'Enter' && verifyLic()}
                className="w-full h-11 rounded-lg text-center text-sm tracking-widest uppercase outline-none tabular-nums"
                style={{ background: '#1a1a28', border: '1.5px solid #282840', color: '#ededf4', fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>
            {licErr && <p className="text-xs mb-3 flex items-center gap-1" style={{ color: '#ff3b5c' }}><XCircle size={12} />{licErr}</p>}
            <button onClick={verifyLic} disabled={licBusy || code.length < 14}
              className="w-full h-10 rounded-lg text-sm font-bold transition-all duration-150 disabled:opacity-40"
              style={{ background: '#c8f542', color: '#07070c' }}>
              {licBusy ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Verify & Continue'}
            </button>
            <p className="text-[10px] text-center mt-3" style={{ color: '#505068' }}>15 exclusive codes &middot; Single-use &middot; 30-day validity</p>
          </div>

          {/* Prize info */}
          {comp && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { l: 'Traders', v: comp._count.competitors },
                { l: 'Prize Pool', v: `$${comp._count.competitors * 10}` },
                { l: '1st Prize', v: '50%' },
              ].map(s => (
                <div key={s.l} className="rounded-lg p-2 border" style={{ background: '#0d0d14', borderColor: '#1e1e30' }}>
                  <p className="text-base font-bold tabular-nums">{s.v}</p>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: '#505068' }}>{s.l}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  ENROLL
  // ═══════════════════════════════════════════════════════════════
  if (phase === 'enroll') return (
    <div className="min-h-screen flex flex-col" style={{ background: '#07070c', color: '#ededf4', fontFamily: "'Space Grotesk', sans-serif" }}>
      <nav className="flex items-center gap-2 px-4 h-12 border-b" style={{ background: '#0d0d14', borderColor: '#282840' }}>
        <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: '#c8f542' }}>
          <Zap size={12} style={{ color: '#07070c' }} />
        </div>
        <span className="text-base font-bold">ForexRush</span>
        <Button variant="ghost" size="sm" className="ml-auto text-xs" style={{ color: '#8585a0' }} onClick={() => { setPhase('landing'); setVerifiedName(''); setLicErr(''); }}>Back</Button>
      </nav>
      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="rounded-xl p-5 border" style={{ background: '#0d0d14', borderColor: '#282840' }}>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={16} style={{ color: '#00e87b' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#00e87b' }}>Access Code Verified</p>
                <p className="text-[10px]" style={{ color: '#8585a0' }}>{verifiedName}</p>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-1">Create Trader Profile</h2>
            <p className="text-xs mb-4" style={{ color: '#8585a0' }}>Choose a name for the leaderboard.</p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4" style={{ background: '#1a1a28', border: '1px solid #282840' }}>
              <Lock size={12} style={{ color: '#c8f542' }} />
              <span className="text-xs font-mono tracking-wider" style={{ color: '#c8f542' }}>{code}</span>
              <Badge className="ml-auto text-[9px] border" style={{ borderColor: 'rgba(200,245,66,.3)', color: '#c8f542', background: 'transparent' }}>VERIFIED</Badge>
            </div>
            <input placeholder="e.g. PipMaster_99" value={username} maxLength={20}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doEnroll()}
              className="w-full h-10 rounded-lg px-3 text-sm outline-none mb-1"
              style={{ background: '#1a1a28', border: '1.5px solid #282840', color: '#ededf4' }} />
            {licErr && <p className="text-xs mb-2 flex items-center gap-1" style={{ color: '#ff3b5c' }}><XCircle size={12} />{licErr}</p>}
            <button onClick={doEnroll} disabled={redeemBusy || !username.trim()}
              className="w-full h-10 rounded-lg text-sm font-bold mt-2 disabled:opacity-40"
              style={{ background: '#c8f542', color: '#07070c' }}>
              {redeemBusy ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Enter Competition'}
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  TRADING ARENA (combined Bullrush + ForexRush)
  // ═══════════════════════════════════════════════════════════════
  return <TradingArena leaderboard={leaderboard} myName={myName} myId={myId} compId={comp?.id || ''} onLogout={() => { localStorage.removeItem('fx_session'); setMyId(''); setMyName(''); setPhase('landing'); }} />;
}

// ═══════════════════════════════════════════════════════════════════
//  TRADING ARENA COMPONENT
// ═══════════════════════════════════════════════════════════════════
function TradingArena({ leaderboard, myName, myId, compId, onLogout }: { leaderboard: LbEntry[]; myName: string; myId: string; compId: string; onLogout: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [activePair, setActivePair] = useState('EUR/USD');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [leverage, setLeverage] = useState(10);
  const [lotSize, setLotSize] = useState('0.10');
  const [bottomTab, setBottomTab] = useState<'positions' | 'leaderboard' | 'history'>('positions');
  const [viewMode, setViewMode] = useState<'arena' | 'lounge'>('arena');
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 's' | 'e' | 'i' }[]>([]);

  // Trading state
  const balanceRef = useRef(10000);
  const [balance, setBalance] = useState(10000);
  const positionsRef = useRef<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [totalPnl, setTotalPnl] = useState(0);

  // Chart state
  const [pairData, setPairData] = useState<Record<string, { cn: any[]; cp: number; ch: number }>>({});
  const [sO, setSO] = useState(0);
  const vc = 80;
  const crosshair = useRef({ x: null as number | null, y: null as number | null });
  const isDrag = useRef(false);
  const dragStartX = useRef(0);
  const dragStartO = useRef(0);

  // ── Real market prices ──────────────────────────────────────
  const [realPrices, setRealPrices] = useState<Record<string, number>>({});
  const [marketLive, setMarketLive] = useState(false);
  const isFirstFetch = useRef(true);
  const lastWsUpdate = useRef<Record<string, number>>({});

  // ── Generate candle data ─────────────────────────────────────
  const genCandles = useCallback((n: number, start: number, vol: number) => {
    const d: any[] = []; let pr = start; const now = Date.now();
    for (let i = 0; i < n; i++) {
      const dr = (Math.random() - 0.48) * vol, o = pr, c = o + dr;
      const h = Math.max(o, c) + Math.random() * vol * 0.8;
      const l = Math.min(o, c) - Math.random() * vol * 0.8;
      d.push({ o, h, l, c, v: 50 + Math.random() * 450, t: now - (n - i) * 15 * 60000 });
      pr = c;
    }
    return d;
  }, []);

  // ── Init pair data ───────────────────────────────────────────
  useEffect(() => {
    const pd: Record<string, { cn: any[]; cp: number; ch: number }> = {};
    for (const [s, c] of Object.entries(PAIRS)) {
      const cn = genCandles(300, c.p, c.vol);
      const cp = cn[cn.length - 1].c;
      pd[s] = { cn, cp, ch: ((cp - cn[0].o) / cn[0].o) * 100 };
    }
    setPairData(pd);
  }, [genCandles]);

  // ── Price tick ───────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setPairData(prev => {
        const next = { ...prev };
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
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // ── Fetch real market prices ────────────────────────────────
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/prices');
        const data = await res.json();
        if (data && !data.error && typeof data === 'object' && !Array.isArray(data)) {
          setRealPrices(data);
          setMarketLive(true);

          // Apply real prices to pairData
          setPairData(prev => {
            const next = { ...prev };
            for (const [pair, price] of Object.entries(data)) {
              if (!next[pair]) continue;
              // After first fetch, only update forex (crypto handled by WebSocket)
              if (!isFirstFetch.current && PAIRS[pair]?.g === 'Crypto') continue;
              const cn = [...next[pair].cn];
              const last = cn[cn.length - 1];
              const cfg = PAIRS[pair];
              if (!cfg) continue;
              const o = last.c;
              const h = Math.max(o, price) + Math.random() * cfg.vol * 0.2;
              const l = Math.min(o, price) - Math.random() * cfg.vol * 0.2;
              cn.push({ o, h, l, c: price, v: 100 + Math.random() * 200, t: Date.now() });
              if (cn.length > 500) cn.shift();
              next[pair] = { ...next[pair], cn, cp: price, ch: ((price - cn[0].o) / cn[0].o) * 100 };
            }
            return next;
          });
          isFirstFetch.current = false;
        }
      } catch { /* silent */ }
    };
    fetchPrices();
    const iv = setInterval(fetchPrices, 30000);
    return () => clearInterval(iv);
  }, []);

  // ── Binance WebSocket for real-time crypto ───────────────────
  useEffect(() => {
    const streams = ['btcusdt@ticker', 'ethusdt@ticker', 'solusdt@ticker', 'xrpusdt@ticker', 'dogeusdt@ticker'];
    const pairMap: Record<string, string> = {
      BTCUSDT: 'BTC/USD', ETHUSDT: 'ETH/USD', SOLUSDT: 'SOL/USD',
      XRPUSDT: 'XRP/USD', DOGEUSDT: 'DOGE/USD',
    };
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`);
      } catch { return; }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const symbol = msg.data?.s;
          const price = parseFloat(msg.data?.c);
          if (!symbol || !price) return;

          const mapped = pairMap[symbol];
          if (!mapped) return;

          // Throttle to ~2 updates/sec per pair
          const now = Date.now();
          if (now - (lastWsUpdate.current[mapped] || 0) < 500) return;
          lastWsUpdate.current[mapped] = now;

          setPairData(prev => {
            if (!prev[mapped]) return prev;
            const cn = [...prev[mapped].cn];
            const last = cn[cn.length - 1];
            // Update current candle's close/high/low with real price
            last.c = price;
            last.h = Math.max(last.h, price);
            last.l = Math.min(last.l, price);
            last.v = (last.v || 0) + 10;
            return {
              ...prev,
              [mapped]: { ...prev[mapped], cn, cp: price, ch: ((price - cn[0].o) / cn[0].o) * 100 },
            };
          });
        } catch { /* parse error */ }
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 5000);
      };
      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      try { ws?.close(); } catch {}
    };
  }, []);

  // ── Update positions P&L ─────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      const pd = pairData;
      positionsRef.current = positionsRef.current.map(p => {
        const d = pd[p.pair];
        if (!d) return p;
        const cfg = PAIRS[p.pair];
        if (!cfg) return p;
        const dir = p.side === 'Long' ? 1 : -1;
        let pnl = (d.cp - p.entry) * p.size * cfg.ls * dir;
        if (p.pair.includes('JPY') && !p.pair.startsWith('XRP') && !p.pair.startsWith('DOGE')) pnl /= d.cp;
        return { ...p, mark: d.cp, pnl };
      });
      const tp = positionsRef.current.reduce((s: number, p: any) => s + p.pnl, 0);
      setTotalPnl(tp);
      setBalance(balanceRef.current + tp);
      setPositions([...positionsRef.current]);
    }, 500);
    return () => clearInterval(iv);
  }, [pairData]);

  // ── Canvas chart drawing ─────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !pairData[activePair]) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cw = rect.width, ch = rect.height;
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const d = pairData[activePair];
    const cfg = PAIRS[activePair];
    const cn = d.cn;
    ctx.clearRect(0, 0, cw, ch);

    const paW = cfg.d <= 2 ? 78 : 88, taH = 22;
    const aW = cw - paW, aH = ch - taH;
    if (aW <= 0 || aH <= 0) return;

    const vC = Math.min(vc, cn.length);
    const sI = Math.max(0, Math.min(sO, cn.length - vC));
    const eI = Math.min(cn.length, sI + vC);
    const vis = cn.slice(sI, eI);
    if (!vis.length) return;

    let mn = Infinity, mx = -Infinity;
    vis.forEach((c: any) => { mn = Math.min(mn, c.l); mx = Math.max(mx, c.h); });
    const pP = (mx - mn) * 0.08 || cfg.vol; mn -= pP; mx += pP;
    const pY = (p: number) => aH - ((p - mn) / (mx - mn)) * aH;
    const cW2 = Math.max(1, (aW / vC) * 0.7);
    const gap = aW / vC;
    const iX = (i: number) => i * gap + gap * 0.5;

    // Grid
    ctx.strokeStyle = 'rgba(40,40,64,.5)'; ctx.lineWidth = 0.5;
    const ps = ns(mx - mn, 6);
    let gp = Math.ceil(mn / ps) * ps;
    ctx.font = '9px "JetBrains Mono", monospace'; ctx.textAlign = 'right';
    while (gp < mx) {
      const y = pY(gp);
      if (y > 0 && y < aH) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(aW, y); ctx.stroke(); ctx.fillStyle = '#404060'; ctx.fillText(fp(gp, cfg.d), aW + paW - 5, y + 3); }
      gp += ps;
    }

    // Candles
    vis.forEach((c: any, i: number) => {
      const x = iX(i);
      const gn = c.c >= c.o;
      const col = gn ? '#00e87b' : '#ff3b5c';
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, pY(c.h)); ctx.lineTo(x, pY(c.l)); ctx.stroke();
      const bt = pY(Math.max(c.o, c.c)), bb = pY(Math.min(c.o, c.c));
      ctx.fillStyle = col; ctx.fillRect(x - cW2 / 2, bt, cW2, Math.max(1, bb - bt));
    });

    // Price line
    const lY = pY(d.cp);
    const lg = vis.length > 0 && vis[vis.length - 1].c >= vis[vis.length - 1].o;
    ctx.setLineDash([3, 3]); ctx.strokeStyle = lg ? 'rgba(0,232,123,.5)' : 'rgba(255,59,92,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, lY); ctx.lineTo(aW, lY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = lg ? '#00e87b' : '#ff3b5c';
    ctx.beginPath(); ctx.roundRect(aW, lY - 9, paW, 18, 3); ctx.fill();
    ctx.fillStyle = '#07070c'; ctx.font = 'bold 9px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText(fp(d.cp, cfg.d), aW + paW / 2, lY + 3);

    // Crosshair
    const xh = crosshair.current;
    if (xh.x !== null && xh.y !== null && xh.x < aW && xh.y < aH) {
      ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(200,245,66,.3)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(xh.x, 0); ctx.lineTo(xh.x, aH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, xh.y); ctx.lineTo(aW, xh.y); ctx.stroke(); ctx.setLineDash([]);
      const hp = mn + (1 - xh.y / aH) * (mx - mn);
      ctx.fillStyle = '#c8f542'; ctx.beginPath(); ctx.roundRect(aW, xh.y - 9, paW, 18, 3); ctx.fill();
      ctx.fillStyle = '#07070c'; ctx.font = 'bold 9px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText(fp(hp, cfg.d), aW + paW / 2, xh.y + 3);
    }

    // Border
    ctx.strokeStyle = '#282840'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, aW - 0.5, aH - 0.5);
  }, [pairData, activePair, sO]);

  // ── Chart resize ─────────────────────────────────────────────
  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // Re-draw on data/pair change
  useEffect(() => { setSO(pairData[activePair]?.cn.length - vc || 0); }, [activePair]);
  useEffect(() => { draw(); }, [draw]);

  // ── Chart mouse events ───────────────────────────────────────
  const onCanvasMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    crosshair.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (isDrag.current) {
      const dx = e.clientX - dragStartX.current;
      const cd = Math.round(dx / (r.width / vc));
      const cnLen = pairData[activePair]?.cn.length || 0;
      setSO(Math.max(0, Math.min(cnLen - vc, dragStartO.current - cd)));
    }
  };
  const onCanvasDown = (e: React.MouseEvent) => {
    isDrag.current = true;
    dragStartX.current = e.clientX;
    dragStartO.current = sO;
  };
  const onCanvasUp = () => { isDrag.current = false; };
  const onCanvasLeave = () => { crosshair.current = { x: null, y: null }; isDrag.current = false; };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setSO(prev => Math.max(0, Math.min((pairData[activePair]?.cn.length || 0) - 20, prev + (e.deltaY > 0 ? 5 : -5))));
  };

  // ── Toast helper ─────────────────────────────────────────────
  const toast = (msg: string, type: 's' | 'e' | 'i' = 'i') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // ── Execute trade ────────────────────────────────────────────
  const executeTrade = async () => {
    if (!compId) return;
    const size = parseFloat(lotSize);
    if (!size || size <= 0) { toast('Invalid lot size', 'e'); return; }
    const d = pairData[activePair];
    if (!d) return;
    const cfg = PAIRS[activePair];
    const margin = (size * cfg.ls * d.cp) / leverage;
    if (margin > balanceRef.current) { toast('Insufficient margin', 'e'); return; }

    // Create position locally
    const pos = {
      id: Date.now().toString(),
      pair: activePair,
      side: side === 'buy' ? 'Long' : 'Short',
      size,
      entry: d.cp,
      mark: d.cp,
      pnl: 0,
      leverage,
      time: new Date().toISOString(),
    };
    positionsRef.current = [...positionsRef.current, pos];
    setPositions([...positionsRef.current]);

    // Save to DB and use real trade ID
    try {
      const tr = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorId: myId, competitionId: compId,
          pair: activePair, direction: side === 'buy' ? 'long' : 'short', lotSize: size,
        }),
      });
      const trData = await tr.json();
      if (trData.id) pos.id = trData.id;
    } catch { /* silent */ }

    toast(`${side === 'buy' ? 'Bought' : 'Sold'} ${size} ${activePair} @ ${fp(d.cp, cfg.d)}`, 's');
  };

  // ── Close position ───────────────────────────────────────────
  const closePosition = async (idx: number) => {
    const p = positionsRef.current[idx];
    if (!p) return;
    balanceRef.current += p.pnl;
    setBalance(balanceRef.current);
    setHistory(prev => [{ ...p, exit: p.mark, time: new Date().toISOString() }, ...prev]);
    positionsRef.current.splice(idx, 1);
    setPositions([...positionsRef.current]);
    toast(`Closed ${p.pair} ${p.side} — P&L: ${fmt$(p.pnl)}`, p.pnl >= 0 ? 's' : 'e');

    // Sync close to DB
    try {
      await fetch('/api/trades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId: p.id, competitorId: myId }),
      });
    } catch { /* silent */ }
  };

  const cfg = PAIRS[activePair];
  const pd = pairData[activePair];
  const chClass = pd && pd.ch >= 0 ? 'up' : 'dn';
  const chColor = pd && pd.ch >= 0 ? '#00e87b' : '#ff3b5c';
  const chBg = pd && pd.ch >= 0 ? 'rgba(0,232,123,.1)' : 'rgba(255,59,92,.1)';

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#07070c', color: '#ededf4', fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex items-center px-3 h-12 border-b shrink-0 gap-1.5" style={{ background: '#0d0d14', borderColor: '#282840' }}>
        <div className="flex items-center gap-1.5 mr-3">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: '#c8f542' }}>
            <Zap size={12} style={{ color: '#07070c' }} />
          </div>
          <span className="text-sm font-bold tracking-tight">ForexRush</span>
        </div>
        <div className="h-6 w-px mx-1" style={{ background: '#282840' }} />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: '#13131d', border: '1px solid #282840' }}>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: '#505068' }}>Balance</span>
          <span className="text-xs font-semibold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtBal(balance)}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: '#13131d', border: '1px solid #282840' }}>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: '#505068' }}>P&L</span>
          <span className="text-xs font-semibold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: totalPnl >= 0 ? '#00e87b' : '#ff3b5c' }}>{fmt$(totalPnl)}</span>
        </div>
        <div className="h-6 w-px mx-1" style={{ background: '#282840' }} />
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #282840' }}>
          <button onClick={() => setViewMode('arena')} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold border-none cursor-pointer transition-all duration-150"
            style={{ background: viewMode === 'arena' ? '#c8f542' : 'transparent', color: viewMode === 'arena' ? '#07070c' : '#505068' }}>
            <BarChart3 size={10} /> Arena
          </button>
          <button onClick={() => setViewMode('lounge')} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold border-none cursor-pointer transition-all duration-150"
            style={{ background: viewMode === 'lounge' ? '#c8f542' : 'transparent', color: viewMode === 'lounge' ? '#07070c' : '#505068' }}>
            <Sofa size={10} /> Lounge
          </button>
        </div>
        {marketLive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg ml-auto" style={{ background: 'rgba(0,232,123,.08)', border: '1px solid rgba(0,232,123,.25)' }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse-dot" style={{ background: '#00e87b' }} />
            <span className="text-[10px] font-semibold tracking-wider" style={{ color: '#00e87b' }}>MARKET</span>
          </div>
        )}
        <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold cursor-pointer" style={{ background: 'linear-gradient(135deg,#c8f542,#8bc34a)', color: '#07070c' }}>
          {myName.slice(0, 2).toUpperCase()}
        </div>
        <button onClick={onLogout} className="h-7 px-2.5 rounded-lg text-[10px] font-semibold cursor-pointer border-none ml-1" style={{ background: '#1a1a28', color: '#505068' }} title="Sign out">✕</button>
      </header>

      {/* ═══ Arena view ═══ */}
      {viewMode === 'arena' && (<>
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Chart section */}
        <section className="flex flex-col overflow-hidden min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 border-b shrink-0 flex-wrap" style={{ borderColor: '#282840' }}>
            {/* Pair selector */}
            <select value={activePair} onChange={e => setActivePair(e.target.value)}
              className="h-7 px-2 rounded-md text-xs font-semibold outline-none cursor-pointer"
              style={{ background: '#13131d', border: '1px solid #282840', color: '#ededf4' }}>
              {Object.entries(PAIRS).map(([s, c]) => <option key={s} value={s}>{s}</option>)}
            </select>
            {pd && (
              <>
                <span className="text-[11px] tabular-nums ml-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8585a0' }}>{fp(pd.cp, cfg.d)}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: chColor, background: chBg }}>
                  {pd.ch >= 0 ? '+' : ''}{pd.ch.toFixed(2)}%
                </span>
              </>
            )}
            <div className="h-5 w-px mx-1" style={{ background: '#282840' }} />
            <div className="flex items-center gap-2">
              {['1m', '5m', '15m', '1H', '4H', '1D'].map(tf => (
                <button key={tf} className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors duration-150 ${tf === '15m' ? '' : ''}`}
                  style={{ color: tf === '15m' ? '#ededf4' : '#505068', background: tf === '15m' ? '#1a1a28' : 'transparent', border: 'none', cursor: 'pointer' }}>
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div ref={wrapRef} className="flex-1 relative min-h-0" style={{ background: '#07070c' }}>
            <canvas ref={canvasRef} onMouseMove={onCanvasMove} onMouseDown={onCanvasDown} onMouseUp={onCanvasUp} onMouseLeave={onCanvasLeave} onWheel={onWheel} className="absolute inset-0" />
          </div>
        </section>

        {/* ── Sidebar ───────────────────────────────────────── */}
        <aside className="flex flex-col overflow-hidden border-l" style={{ borderColor: '#282840', background: '#0d0d14' }}>
          {/* PnL summary */}
          <div className="px-3.5 py-2.5 border-b" style={{ background: 'linear-gradient(135deg, rgba(200,245,66,.03), rgba(0,232,123,.02))', borderColor: '#282840' }}>
            <div className="text-center text-lg font-bold tabular-nums py-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: totalPnl >= 0 ? '#00e87b' : '#ff3b5c' }}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
            </div>
            <div className="flex justify-between text-[11px] py-0.5">
              <span style={{ color: '#505068' }}>Open Positions</span>
              <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8585a0' }}>{positions.length}</span>
            </div>
            <div className="flex justify-between text-[11px] py-0.5">
              <span style={{ color: '#505068' }}>Available Margin</span>
              <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8585a0' }}>{fmtBal(balance)}</span>
            </div>
          </div>

          {/* Trading panel */}
          <div className="px-3.5 py-3 border-b" style={{ borderColor: '#282840' }}>
            {/* Buy/Sell toggle */}
            <div className="grid grid-cols-2 gap-0.5 mb-3 p-0.5 rounded-lg" style={{ background: '#1a1a28' }}>
              <button onClick={() => setSide('buy')} className="py-1.5 rounded-md text-xs font-semibold transition-all duration-150 border-none cursor-pointer"
                style={{ background: side === 'buy' ? '#00e87b' : 'transparent', color: side === 'buy' ? '#0a0a0f' : '#505068', boxShadow: side === 'buy' ? '0 3px 12px rgba(0,232,123,.2)' : 'none' }}>
                Buy / Long
              </button>
              <button onClick={() => setSide('sell')} className="py-1.5 rounded-md text-xs font-semibold transition-all duration-150 border-none cursor-pointer"
                style={{ background: side === 'sell' ? '#ff3b5c' : 'transparent', color: side === 'sell' ? '#fff' : '#505068', boxShadow: side === 'sell' ? '0 3px 12px rgba(255,59,92,.2)' : 'none' }}>
                Sell / Short
              </button>
            </div>

            {/* Lot size */}
            <div className="mb-2.5">
              <div className="flex justify-between text-[10px] uppercase tracking-wider mb-1" style={{ color: '#505068' }}>
                <span>Size (Lots)</span>
                <span className="tabular-nums normal-case" style={{ color: '#8585a0', fontFamily: "'JetBrains Mono', monospace" }}>$0.00</span>
              </div>
              <input type="number" value={lotSize} onChange={e => setLotSize(e.target.value)} step="0.01" placeholder="0.00"
                className="w-full h-9 px-2.5 rounded-lg text-sm outline-none tabular-nums"
                style={{ background: '#1a1a28', border: '1.5px solid #282840', color: '#ededf4', fontFamily: "'JetBrains Mono', monospace" }} />
              <div className="grid grid-cols-4 gap-0.5 mt-1.5">
                {[25, 50, 75, 100].map(pct => (
                  <button key={pct} onClick={() => setLotSize('1.00')} className="py-1 rounded text-[10px] font-semibold transition-all duration-150 border-none cursor-pointer"
                    style={{ background: '#1a1a28', border: '1px solid #282840', color: '#8585a0' }}>
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Leverage */}
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#505068' }}>Leverage</div>
              <div className="flex gap-0.5 flex-wrap">
                {[1, 2, 5, 10, 25, 50].map(lv => (
                  <button key={lv} onClick={() => setLeverage(lv)} className="px-2.5 py-1 rounded text-[11px] font-semibold transition-all duration-150 border-none cursor-pointer"
                    style={{ background: leverage === lv ? 'rgba(200,245,66,.1)' : '#1a1a28', border: leverage === lv ? '1px solid rgba(200,245,66,.3)' : '1px solid #282840', color: leverage === lv ? '#c8f542' : '#8585a0' }}>
                    {lv}x
                  </button>
                ))}
              </div>
            </div>

            {/* Execute button */}
            <button onClick={executeTrade}
              className="w-full h-10 rounded-lg text-sm font-bold transition-all duration-200 border-none cursor-pointer"
              style={{ background: side === 'buy' ? '#00e87b' : '#ff3b5c', color: side === 'buy' ? '#0a0a0f' : '#fff' }}>
              {side === 'buy' ? 'Buy / Long' : 'Sell / Short'} {activePair}
            </button>
          </div>

          {/* Order book */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-3 py-2 border-b text-[11px] font-semibold" style={{ borderColor: '#282840' }}>
              <span>Order Book</span>
              <span style={{ color: '#505068', fontSize: '10px' }}>{activePair}</span>
            </div>
            <div className="grid grid-cols-3 text-[9px] uppercase tracking-wider px-3 py-1 border-b" style={{ color: '#505068', borderColor: '#1e1e30' }}>
              <span>Price</span><span className="text-right">Amount</span><span className="text-right">Total</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Asks (sells) */}
              {Array.from({ length: 8 }).map((_, i) => {
                const base = pd?.cp || cfg.p;
                const askP = base + cfg.sp / 2 + (i + 1) * cfg.sp * (0.5 + Math.random() * 2);
                const amt = (Math.random() * 1.5 + 0.05).toFixed(cfg.d);
                return (
                  <div key={`a${i}`} className="grid grid-cols-3 px-3 py-0.5 text-[10px] relative cursor-pointer transition-colors duration-75 hover:bg-[#1a1a28]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <div className="absolute right-0 top-0 bottom-0 opacity-[0.07]" style={{ background: '#ff3b5c', width: `${30 + Math.random() * 60}%` }} />
                    <span className="relative" style={{ color: '#ff3b5c' }}>{fp(askP, cfg.d)}</span>
                    <span className="relative text-right" style={{ color: '#8585a0' }}>{amt}</span>
                    <span className="relative text-right" style={{ color: '#8585a0' }}>{(parseFloat(amt) * (i + 1)).toFixed(cfg.d)}</span>
                  </div>
                );
              })}
              {/* Spread */}
              <div className="text-center py-1 border-y text-[10px]" style={{ borderColor: '#282840', background: '#1a1a28', color: '#505068' }}>
                Spread <span className="tabular-nums" style={{ color: '#8585a0' }}>{fp(cfg.sp, cfg.d)}</span>
              </div>
              {/* Bids (buys) */}
              {Array.from({ length: 8 }).map((_, i) => {
                const base = pd?.cp || cfg.p;
                const bidP = base - cfg.sp / 2 - (i + 1) * cfg.sp * (0.5 + Math.random() * 2);
                const amt = (Math.random() * 1.5 + 0.05).toFixed(cfg.d);
                return (
                  <div key={`b${i}`} className="grid grid-cols-3 px-3 py-0.5 text-[10px] relative cursor-pointer transition-colors duration-75 hover:bg-[#1a1a28]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <div className="absolute right-0 top-0 bottom-0 opacity-[0.07]" style={{ background: '#00e87b', width: `${30 + Math.random() * 60}%` }} />
                    <span className="relative" style={{ color: '#00e87b' }}>{fp(bidP, cfg.d)}</span>
                    <span className="relative text-right" style={{ color: '#8585a0' }}>{amt}</span>
                    <span className="relative text-right" style={{ color: '#8585a0' }}>{(parseFloat(amt) * (i + 1)).toFixed(cfg.d)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Bottom panel ────────────────────────────────────── */}
      <div className="h-52 border-t flex flex-col shrink-0" style={{ borderColor: '#282840', background: '#0d0d14' }}>
        <div className="flex border-b shrink-0" style={{ borderColor: '#282840' }}>
          {(['positions', 'leaderboard', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setBottomTab(tab)}
              className="px-4 py-2 text-[11px] font-medium border-none cursor-pointer transition-colors duration-150"
              style={{ color: bottomTab === tab ? '#ededf4' : '#505068', background: 'transparent', borderBottom: bottomTab === tab ? '2px solid #c8f542' : '2px solid transparent' }}>
              {tab === 'positions' ? `Positions (${positions.length})` : tab === 'leaderboard' ? 'Leaderboard' : 'Trade History'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Positions tab */}
          {bottomTab === 'positions' && (
            positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-1.5" style={{ color: '#505068', fontSize: '12px' }}>
                <span style={{ fontSize: '24px', opacity: 0.4 }}>&#x2197;</span>
                <span>No open positions</span>
              </div>
            ) : (
              <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Pair', 'Side', 'Size', 'Entry', 'Mark', 'P&L ($)', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium uppercase tracking-wider text-[10px] sticky top-0" style={{ color: '#505068', background: '#0d0d14', borderBottom: '1px solid #282840' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {positions.map((p, i) => (
                    <tr key={p.id} className="transition-colors duration-75" style={{ borderBottom: '1px solid #1e1e30' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a1a28')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-3 py-2 font-semibold">{p.pair}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ color: p.side === 'Long' ? '#00e87b' : '#ff3b5c', background: p.side === 'Long' ? 'rgba(0,232,123,.1)' : 'rgba(255,59,92,.1)' }}>
                          {p.side}
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.size.toFixed(2)}</td>
                      <td className="px-3 py-2 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fp(p.entry, PAIRS[p.pair]?.d)}</td>
                      <td className="px-3 py-2 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fp(p.mark, PAIRS[p.pair]?.d)}</td>
                      <td className="px-3 py-2 tabular-nums font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: p.pnl >= 0 ? '#00e87b' : '#ff3b5c' }}>{fmt$(p.pnl)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => closePosition(i)} className="px-2 py-0.5 rounded text-[10px] font-semibold border-none cursor-pointer transition-all duration-150"
                          style={{ background: '#13131d', border: '1px solid #282840', color: '#8585a0' }}>
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {/* Leaderboard tab */}
          {bottomTab === 'leaderboard' && (
            <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Rank', 'Trader', 'P&L', 'Win Rate', 'Trades'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium uppercase tracking-wider text-[10px] sticky top-0" style={{ color: '#505068', background: '#0d0d14', borderBottom: '1px solid #282840' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {leaderboard.map((c, i) => {
                  const isMe = c.displayName === myName || c.username === myName;
                  return (
                    <tr key={c.id} className="transition-colors duration-75" style={{ borderBottom: '1px solid #1e1e30', background: isMe ? 'rgba(200,245,66,.05)' : 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a1a28')}
                      onMouseLeave={e => (e.currentTarget.style.background = isMe ? 'rgba(200,245,66,.05)' : 'transparent')}>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold" style={{
                          background: i === 0 ? 'linear-gradient(135deg,#ffd84d,#f5a623)' : i === 1 ? 'linear-gradient(135deg,#c0c0c0,#888)' : i === 2 ? 'linear-gradient(135deg,#cd7f32,#a0522d)' : '#1a1a28',
                          color: i < 3 ? '#1a1a26' : '#505068',
                        }}>{i + 1}</span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-xs">{c.displayName || c.username} {isMe && <span className="text-[9px] px-1 py-0 rounded font-bold ml-1" style={{ background: '#c8f542', color: '#07070c' }}>YOU</span>}</td>
                      <td className="px-3 py-2 tabular-nums font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.totalPnl >= 0 ? '#00e87b' : '#ff3b5c' }}>{fmt$(c.totalPnl)}</td>
                      <td className="px-3 py-2 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.winRate >= 50 ? '#00e87b' : '#ff3b5c' }}>{c.winRate.toFixed(1)}%</td>
                      <td className="px-3 py-2 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8585a0' }}>{c.totalTrades}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* History tab */}
          {bottomTab === 'history' && (
            history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-1.5" style={{ color: '#505068', fontSize: '12px' }}>
                <span>No trade history yet</span>
              </div>
            ) : (
              <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Time', 'Pair', 'Side', 'Size', 'Entry', 'Exit', 'P&L'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium uppercase tracking-wider text-[10px] sticky top-0" style={{ color: '#505068', background: '#0d0d14', borderBottom: '1px solid #282840' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} className="transition-colors duration-75" style={{ borderBottom: '1px solid #1e1e30' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a1a28')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-3 py-2 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8585a0' }}>{new Date(h.time).toLocaleTimeString()}</td>
                      <td className="px-3 py-2 font-semibold">{h.pair}</td>
                      <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ color: h.side === 'Long' ? '#00e87b' : '#ff3b5c', background: h.side === 'Long' ? 'rgba(0,232,123,.1)' : 'rgba(255,59,92,.1)' }}>{h.side}</span></td>
                      <td className="px-3 py-2 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{h.size.toFixed(2)}</td>
                      <td className="px-3 py-2 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fp(h.entry, PAIRS[h.pair]?.d)}</td>
                      <td className="px-3 py-2 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fp(h.exit, PAIRS[h.pair]?.d)}</td>
                      <td className="px-3 py-2 tabular-nums font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: h.pnl >= 0 ? '#00e87b' : '#ff3b5c' }}>{fmt$(h.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
      </>)}

      {/* ═══ Lounge view ═══ */}
      {viewMode === 'lounge' && (
        <div className="flex-1 overflow-y-auto" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(200,245,66,.04) 0%, transparent 60%)' }}>
          <div className="max-w-3xl mx-auto px-4 py-6">
            {/* Podium */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <div className="flex items-center gap-2 mb-5">
                <Crown size={16} style={{ color: '#ffd84d' }} />
                <h2 className="text-lg font-bold tracking-tight">Top Traders</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 0, 2].map((podIdx) => {
                  const c = leaderboard[podIdx];
                  if (!c) return <div key={podIdx} />;
                  const isFirst = podIdx === 0;
                  const heights = ['pt-6', '', 'pt-8'];
                  const medals = ['linear-gradient(135deg,#ffd84d,#f5a623)', 'linear-gradient(135deg,#c0c0c0,#888)', 'linear-gradient(135deg,#cd7f32,#a0522d)'];
                  const icons = [<Crown key="c" size={14} />, <Medal key="m" size={14} />, <Medal key="m2" size={14} />];
                  const isMe = c.displayName === myName || c.username === myName;
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: podIdx === 0 ? 0.15 : podIdx === 1 ? 0 : 0.1 }}
                      className={`rounded-xl p-4 text-center border ${heights[podIdx]}`}
                      style={{
                        background: isMe ? 'rgba(200,245,66,.06)' : '#0d0d14',
                        borderColor: isMe ? 'rgba(200,245,66,.3)' : '#282840',
                        boxShadow: isFirst ? '0 0 40px rgba(255,216,77,.08)' : 'none',
                        order: podIdx,
                      }}>
                      {/* Avatar */}
                      <div className="mx-auto mb-2 h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: medals[podIdx], color: '#1a1a26' }}>
                        {(c.displayName || c.username).slice(0, 2).toUpperCase()}
                      </div>
                      {/* Rank badge */}
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {icons[podIdx]}
                        <span className="text-[10px] font-bold" style={{ color: '#505068' }}>#{podIdx + 1}</span>
                        {isMe && <span className="text-[8px] px-1 py-0 rounded font-bold" style={{ background: '#c8f542', color: '#07070c' }}>YOU</span>}
                      </div>
                      <p className="text-xs font-bold mb-0.5 truncate">{c.displayName || c.username}</p>
                      <p className="text-lg font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.totalPnl >= 0 ? '#00e87b' : '#ff3b5c' }}>
                        {c.totalPnl >= 0 ? '+' : ''}{c.totalPnl >= 1000 ? `$${(c.totalPnl / 1000).toFixed(1)}K` : `$${c.totalPnl.toFixed(0)}`}
                      </p>
                      <p className="text-[10px] tabular-nums mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8585a0' }}>ROI {c.roi}%</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Live P&L Session Card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-xl p-5 mb-6 border"
              style={{
                background: 'linear-gradient(135deg, rgba(200,245,66,.04), rgba(0,232,123,.03))',
                borderColor: positions.length > 0
                  ? (totalPnl >= 0 ? 'rgba(0,232,123,.3)' : 'rgba(255,59,92,.3)')
                  : '#282840',
                boxShadow: positions.length > 0
                  ? (totalPnl >= 0 ? '0 0 40px rgba(0,232,123,.06)' : '0 0 40px rgba(255,59,92,.06)')
                  : 'none',
              }}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} style={{ color: '#c8f542' }} />
                <h3 className="text-sm font-bold">Your Live Session</h3>
                <span className="flex items-center gap-1 ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,232,123,.1)', color: '#00e87b' }}>
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse-dot" style={{ background: '#00e87b' }} />
                  LIVE
                </span>
              </div>

              {/* P&L & Balance Row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(0,0,0,.25)', border: '1px solid #1e1e30' }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#505068' }}>Unrealized P&L</p>
                  <p className="text-xl font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: totalPnl >= 0 ? '#00e87b' : '#ff3b5c' }}>
                    {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(0,0,0,.25)', border: '1px solid #1e1e30' }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#505068' }}>Equity</p>
                  <p className="text-xl font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#ededf4' }}>
                    {fmtBal(balance)}
                  </p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(0,0,0,.25)', border: '1px solid #1e1e30' }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#505068' }}>Open Positions</p>
                  <p className="text-xl font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#ededf4' }}>
                    {positions.length}
                  </p>
                </div>
              </div>

              {/* Open Positions Table */}
              {positions.length > 0 ? (
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#1e1e30', background: 'rgba(0,0,0,.2)' }}>
                  <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#13131d' }}>
                        {['Pair', 'Side', 'Size', 'Entry', 'Mark', 'P&L'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium uppercase tracking-wider text-[9px]" style={{ color: '#505068' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((p, i) => (
                        <tr key={p.id} className="transition-colors duration-75"
                          style={{ borderBottom: '1px solid #1e1e30' }}>
                          <td className="px-3 py-2 font-semibold">{p.pair}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                              style={{ color: p.side === 'Long' ? '#00e87b' : '#ff3b5c', background: p.side === 'Long' ? 'rgba(0,232,123,.1)' : 'rgba(255,59,92,.1)' }}>
                              {p.side}
                            </span>
                          </td>
                          <td className="px-3 py-2 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.size.toFixed(2)}</td>
                          <td className="px-3 py-2 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8585a0' }}>{fp(p.entry, PAIRS[p.pair]?.d)}</td>
                          <td className="px-3 py-2 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fp(p.mark, PAIRS[p.pair]?.d)}</td>
                          <td className="px-3 py-2 tabular-nums font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: p.pnl >= 0 ? '#00e87b' : '#ff3b5c' }}>
                            {fmt$(p.pnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: '#1e1e30', background: '#0d0d14' }}>
                    <span className="text-[10px]" style={{ color: '#505068' }}>Positions update live every 500ms</span>
                    <button onClick={() => setViewMode('arena')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border-none cursor-pointer transition-all duration-150"
                      style={{ background: '#c8f542', color: '#07070c' }}>
                      <BarChart3 size={10} /> Back to Arena
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg p-6 text-center" style={{ background: 'rgba(0,0,0,.2)', border: '1px dashed #282840' }}>
                  <p className="text-xs mb-1" style={{ color: '#505068' }}>No open positions</p>
                  <p className="text-[10px] mb-3" style={{ color: '#383850' }}>Switch to the Arena to place your first trade</p>
                  <button onClick={() => setViewMode('arena')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border-none cursor-pointer transition-all duration-150"
                    style={{ background: 'rgba(200,245,66,.1)', border: '1px solid rgba(200,245,66,.3)', color: '#c8f542' }}>
                    <BarChart3 size={12} /> Open Arena
                  </button>
                </div>
              )}
            </motion.div>

            {/* My rank card */}
            {(() => {
              const me = leaderboard.find(c => c.displayName === myName || c.username === myName);
              if (!me) return null;
              return (
                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  className="rounded-xl p-4 mb-6 border flex items-center gap-4"
                  style={{ background: 'rgba(200,245,66,.06)', borderColor: 'rgba(200,245,66,.25)' }}>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg,#c8f542,#8bc34a)', color: '#07070c' }}>
                    {myName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold truncate">{me.displayName || me.username}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#c8f542', color: '#07070c' }}>YOU</span>
                    </div>
                    <div className="flex gap-4 text-[11px]">
                      <span style={{ color: '#505068' }}>Rank <b style={{ color: '#ededf4' }}>#{me.rank || leaderboard.indexOf(me) + 1}</b></span>
                      <span style={{ color: '#505068' }}>Balance <b className="tabular-nums" style={{ color: '#ededf4', fontFamily: "'JetBrains Mono', monospace" }}>${me.currentBalance?.toLocaleString() || '10,000'}</b></span>
                      <span style={{ color: '#505068' }}>Trades <b style={{ color: '#ededf4' }}>{me.totalTrades}</b></span>
                      <span style={{ color: '#505068' }}>Win Rate <b className="tabular-nums" style={{ color: me.winRate >= 50 ? '#00e87b' : '#ff3b5c', fontFamily: "'JetBrains Mono', monospace" }}>{me.winRate.toFixed(1)}%</b></span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: me.totalPnl >= 0 ? '#00e87b' : '#ff3b5c' }}>
                      {me.totalPnl >= 0 ? '+' : ''}{fmt$(me.totalPnl)}
                    </p>
                    <p className="text-[10px] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8585a0' }}>ROI {me.roi}%</p>
                  </div>
                </motion.div>
              );
            })()}

            {/* Full leaderboard table */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={14} style={{ color: '#c8f542' }} />
                <h3 className="text-sm font-bold">All Rankings</h3>
                <span className="text-[10px] ml-auto" style={{ color: '#505068' }}>{leaderboard.length} traders</span>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#282840', background: '#0d0d14' }}>
                <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#13131d' }}>
                      {['#', 'Trader', 'Balance', 'P&L', 'ROI', 'Win Rate', 'Trades'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-medium uppercase tracking-wider text-[10px]" style={{ color: '#505068' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((c, i) => {
                      const isMe = c.displayName === myName || c.username === myName;
                      return (
                        <tr key={c.id} className="transition-colors duration-75"
                          style={{ borderBottom: '1px solid #1e1e30', background: isMe ? 'rgba(200,245,66,.06)' : 'transparent' }}
                          onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = '#1a1a28'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isMe ? 'rgba(200,245,66,.06)' : 'transparent'; }}>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold" style={{
                              background: i === 0 ? 'linear-gradient(135deg,#ffd84d,#f5a623)' : i === 1 ? 'linear-gradient(135deg,#c0c0c0,#888)' : i === 2 ? 'linear-gradient(135deg,#cd7f32,#a0522d)' : '#1a1a28',
                              color: i < 3 ? '#1a1a26' : '#505068',
                            }}>{i + 1}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                                style={{ background: i < 3 ? ['linear-gradient(135deg,#ffd84d,#f5a623)', 'linear-gradient(135deg,#c0c0c0,#888)', 'linear-gradient(135deg,#cd7f32,#a0522d)'][i] : '#1a1a28', color: i < 3 ? '#1a1a26' : '#505068' }}>
                                {(c.displayName || c.username).slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-semibold truncate">{c.displayName || c.username}</span>
                              {isMe && <span className="text-[8px] px-1 py-0 rounded font-bold shrink-0" style={{ background: '#c8f542', color: '#07070c' }}>YOU</span>}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8585a0' }}>
                            ${c.currentBalance?.toLocaleString() || '10,000'}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.totalPnl >= 0 ? '#00e87b' : '#ff3b5c' }}>
                            {c.totalPnl >= 0 ? '+' : ''}{fmt$(c.totalPnl)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{
                              color: parseFloat(c.roi) >= 0 ? '#00e87b' : '#ff3b5c',
                              background: parseFloat(c.roi) >= 0 ? 'rgba(0,232,123,.1)' : 'rgba(255,59,92,.1)',
                            }}>{c.roi}%</span>
                          </td>
                          <td className="px-4 py-2.5 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.winRate >= 50 ? '#00e87b' : '#ff3b5c' }}>
                            {c.winRate.toFixed(1)}%
                          </td>
                          <td className="px-4 py-2.5 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8585a0' }}>{c.totalTrades}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Competition stats footer */}
            <div className="grid grid-cols-3 gap-3 mt-6 mb-4">
              {[
                { label: 'Total Traders', value: leaderboard.length, icon: <Shield size={12} /> },
                { label: 'Prize Pool', value: `$${(leaderboard.length * 10).toLocaleString()}`, icon: <Trophy size={12} /> },
                { label: '1st Place Prize', value: `${Math.round(leaderboard.length * 10 * 0.5)}%`, icon: <Crown size={12} /> },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: '#0d0d14', borderColor: '#282840' }}>
                  <div className="flex items-center justify-center gap-1.5 mb-1.5" style={{ color: '#505068' }}>
                    {s.icon}
                    <span className="text-[10px] uppercase tracking-wider">{s.label}</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#c8f542' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="fixed top-14 right-3 z-[9999] flex flex-col gap-1.5">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 120, opacity: 0 }}
              className="px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 max-w-xs"
              style={{
                background: t.type === 's' ? 'rgba(0,232,123,.1)' : t.type === 'e' ? 'rgba(255,59,92,.14)' : 'rgba(91,140,255,.1)',
                border: `1px solid ${t.type === 's' ? 'rgba(0,232,123,.3)' : t.type === 'e' ? 'rgba(255,59,92,.3)' : 'rgba(91,140,255,.3)'}`,
                color: t.type === 's' ? '#66ffb0' : t.type === 'e' ? '#ff8da0' : '#8db4ff',
                backdropFilter: 'blur(12px)',
              }}>
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}