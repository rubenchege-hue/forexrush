'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Trophy, Users, DollarSign, Clock, TrendingUp, TrendingDown,
  Zap, Shield, Target, ChevronUp, ChevronDown, Activity,
  BarChart3, Flame, Crown, Medal, Award, ArrowRight, Play,
  Timer, Loader2, Key, Lock, CheckCircle2, XCircle, Eye,
  EyeOff, Sparkles, AlertTriangle, Copy,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────
interface Competition {
  id: string; title: string; description: string; entryFee: number;
  prizePool: number; startDate: string; endDate: string; status: string;
  maxParticipants: number; _count: { competitors: number };
}

interface Competitor {
  id: string; username: string; displayName?: string; avatar: string | null;
  initialBalance: number; currentBalance: number; totalPnl: number;
  totalTrades: number; winRate: number; rank: number; roi: string;
}

interface Trade {
  id: string; pair: string; direction: string; lotSize: number;
  entryPrice: number; exitPrice: number | null; pnl: number;
  status: string; openedAt: string; closedAt: string | null;
  competitor?: { username: string; displayName?: string; avatar: string | null };
}

type AppState = 'loading' | 'landing' | 'enroll' | 'dashboard';

// ── Forex pairs for ticker ────────────────────────────────────────────
const TICKER_PAIRS = [
  { pair: 'EUR/USD', price: 1.0876, change: 0.12 },
  { pair: 'GBP/USD', price: 1.2734, change: -0.08 },
  { pair: 'USD/JPY', price: 149.82, change: 0.34 },
  { pair: 'AUD/USD', price: 0.6543, change: -0.21 },
  { pair: 'USD/CAD', price: 1.3621, change: 0.05 },
  { pair: 'NZD/USD', price: 0.6127, change: 0.18 },
  { pair: 'EUR/GBP', price: 0.8542, change: -0.03 },
  { pair: 'XAU/USD', price: 2342.50, change: 1.24 },
  { pair: 'BTC/USD', price: 67842.00, change: 2.15 },
  { pair: 'USD/CHF', price: 0.8834, change: -0.11 },
];

// ── Main Page ──────────────────────────────────────────────────────────
export default function Home() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [activeComp, setActiveComp] = useState<Competition | null>(null);
  const [leaderboard, setLeaderboard] = useState<Competitor[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);

  // License form
  const [licenseCode, setLicenseCode] = useState('');
  const [username, setUsername] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [licenseError, setLicenseError] = useState('');
  const [licenseVerifying, setLicenseVerifying] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [verifiedClient, setVerifiedClient] = useState<{ clientName: string; email: string } | null>(null);

  // My session
  const [myCompetitor, setMyCompetitor] = useState<Competitor | null>(null);

  // Countdown
  const [timeLeft, setTimeLeft] = useState('');

  // ── Init: seed + fetch ───────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        await fetch('/api/seed', { method: 'POST' });
        const compRes = await fetch('/api/competitions');
        const comps = await compRes.json();
        setCompetitions(comps);
        const active = comps.find((c: Competition) => c.status === 'active') || comps[0];
        if (active) {
          setActiveComp(active);
          const [lbRes, tradesRes] = await Promise.all([
            fetch(`/api/leaderboard?competitionId=${active.id}`),
            fetch(`/api/trades?competitionId=${active.id}`),
          ]);
          setLeaderboard(await lbRes.json());
          setRecentTrades(await tradesRes.json());
        }
      } catch (e) { console.error(e); }
      setAppState('landing');
    }
    init();
  }, []);

  // ── Countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeComp) return;
    const tick = () => {
      const diff = Math.max(0, new Date(activeComp.endDate).getTime() - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(d).padStart(2,'0')}:${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [activeComp]);

  // ── Live P&L simulation ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setLeaderboard(prev =>
        prev.map(c => {
          const f = (Math.random() - 0.45) * 30;
          const np = parseFloat((c.totalPnl + f).toFixed(2));
          return { ...c, totalPnl: np, currentBalance: parseFloat((c.initialBalance + np).toFixed(2)), roi: ((np / c.initialBalance) * 100).toFixed(2) };
        }).sort((a, b) => b.totalPnl - a.totalPnl).map((c, i) => ({ ...c, rank: i + 1 }))
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // ── Verify license code ─────────────────────────────────────────
  const verifyLicense = useCallback(async () => {
    if (!licenseCode.trim()) return;
    setLicenseVerifying(true);
    setLicenseError('');
    try {
      const res = await fetch(`/api/license?code=${encodeURIComponent(licenseCode.trim())}`);
      const data = await res.json();
      if (data.valid) {
        setVerifiedClient({ clientName: data.clientName, email: data.email });
        setAppState('enroll');
      } else {
        setLicenseError(data.error || 'Invalid code');
      }
    } catch { setLicenseError('Network error. Try again.'); }
    setLicenseVerifying(false);
  }, [licenseCode]);

  // ── Redeem & Enroll ─────────────────────────────────────────────
  const handleEnroll = useCallback(async () => {
    if (!licenseCode.trim() || !username.trim() || !activeComp) return;
    setRedeeming(true);
    setLicenseError('');
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: licenseCode.trim(),
          competitionId: activeComp.id,
          username: username.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMyCompetitor(data.competitor);
        setAppState('dashboard');
        const lbRes = await fetch(`/api/leaderboard?competitionId=${activeComp.id}`);
        setLeaderboard(await lbRes.json());
      } else {
        setLicenseError(data.error || 'Enrollment failed');
      }
    } catch { setLicenseError('Network error. Try again.'); }
    setRedeeming(false);
  }, [licenseCode, username, activeComp]);

  const topThree = leaderboard.slice(0, 3);

  // ── Loading ─────────────────────────────────────────────────────
  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center animate-pulse-glow">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          <p className="text-sm text-muted-foreground font-mono">Loading markets...</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  //  ENROLL / LICENSE FLOW
  // ══════════════════════════════════════════════════════════════════
  if (appState === 'enroll') {
    return (
      <div className="min-h-screen flex flex-col bg-background bg-grid bg-noise">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 glass-strong border-b border-border/30">
          <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">ForexRush</span>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] px-1.5 py-0">
                BETA
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setAppState('landing'); setVerifiedClient(null); setLicenseError(''); }}>
              Back
            </Button>
          </div>
        </nav>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="glass rounded-2xl p-6 sm:p-8 glow-green">
              {/* Verified badge */}
              <div className="flex items-center gap-2 mb-6">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Access Code Verified</p>
                  <p className="text-xs text-muted-foreground">{verifiedClient?.clientName} &middot; {verifiedClient?.email}</p>
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-1">Create Your Trader Profile</h2>
              <p className="text-sm text-muted-foreground mb-6">Choose a name that will appear on the live leaderboard.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Access Code</label>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 border border-border/40">
                    <Lock className="h-4 w-4 text-emerald-500" />
                    <span className="font-mono text-sm text-emerald-400 tracking-wider">{licenseCode}</span>
                    <Badge variant="outline" className="ml-auto border-emerald-500/30 text-emerald-400 text-[10px]">VERIFIED</Badge>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Trader Name</label>
                  <Input
                    placeholder="e.g. PipMaster_99"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    maxLength={20}
                    className="bg-muted/50 border-border/40 focus:border-emerald-500/50 h-11 font-mono placeholder:font-sans placeholder:text-muted-foreground/50"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">This will be your identity on the leaderboard. No spaces.</p>
                </div>

                {licenseError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{licenseError}</p>
                  </div>
                )}

                <Button
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-base mt-2 glow-green transition-all duration-200"
                  onClick={handleEnroll}
                  disabled={redeeming || !username.trim()}
                >
                  {redeeming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Enter Competition
                </Button>
              </div>

              <div className="mt-6 pt-5 border-t border-border/30 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">$10K</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Virtual Balance</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">7d</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-400">50%</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">1st Prize</p>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  //  DASHBOARD (after enrollment)
  // ══════════════════════════════════════════════════════════════════
  if (appState === 'dashboard' && myCompetitor) {
    const myRank = leaderboard.find(c => c.id === myCompetitor.id)?.rank || leaderboard.length;
    const myPnl = leaderboard.find(c => c.id === myCompetitor.id)?.totalPnl || 0;
    const myRoi = leaderboard.find(c => c.id === myCompetitor.id)?.roi || '0.00';

    return (
      <div className="min-h-screen flex flex-col bg-background bg-grid bg-noise">
        {/* Ticker tape */}
        <div className="overflow-hidden border-b border-border/20 bg-surface">
          <div className="flex animate-ticker whitespace-nowrap py-1.5 px-4">
            {[...TICKER_PAIRS, ...TICKER_PAIRS].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-3 mx-6 text-xs">
                <span className="text-muted-foreground font-medium">{t.pair}</span>
                <span className="font-mono text-foreground tabular-nums">{t.price.toFixed(t.pair.includes('JPY') ? 2 : t.pair === 'XAU/USD' ? 2 : 4)}</span>
                <span className={`font-mono tabular-nums ${t.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.change >= 0 ? '+' : ''}{t.change.toFixed(2)}%
                </span>
              </span>
            ))}
          </div>
        </div>

        <nav className="sticky top-0 z-50 glass-strong border-b border-border/30">
          <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">ForexRush</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 border-emerald-500/40 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </Badge>
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={myCompetitor.avatar || undefined} />
                  <AvatarFallback className="bg-emerald-900 text-emerald-300 text-xs">{myCompetitor.username.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline">{myCompetitor.username}</span>
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:py-8">
          {/* My Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Rank', value: `#${myRank}`, sub: `of ${leaderboard.length}`, icon: Trophy, accent: false },
              { label: 'Balance', value: `$${(myCompetitor.initialBalance + myPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: `${myPnl >= 0 ? '+' : ''}${myPnl.toFixed(2)} P&L`, icon: DollarSign, accent: myPnl >= 0 },
              { label: 'ROI', value: `${parseFloat(myRoi) >= 0 ? '+' : ''}${myRoi}%`, sub: 'Return on investment', icon: BarChart3, accent: parseFloat(myRoi) >= 0 },
              { label: 'Time Left', value: timeLeft, sub: activeComp?.title, icon: Timer, accent: false },
            ].map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="glass border-border/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</span>
                      <stat.icon className={`h-4 w-4 ${stat.accent === false ? 'text-muted-foreground' : stat.accent ? 'text-emerald-400' : 'text-red-400'}`} />
                    </div>
                    <p className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${stat.accent === false ? '' : stat.accent ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Leaderboard + Trades */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Leaderboard */}
            <div className="lg:col-span-2">
              <Card className="glass border-border/30 overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-400" />
                      <CardTitle className="text-base">Leaderboard</CardTitle>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                      {leaderboard.length} traders
                    </Badge>
                  </div>
                </CardHeader>
                <div className="max-h-[560px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 glass-strong z-10">
                      <tr className="border-b border-border/20">
                        <th className="text-left py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-14">#</th>
                        <th className="text-left py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Trader</th>
                        <th className="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Win %</th>
                        <th className="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">P&L</th>
                        <th className="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {leaderboard.map((c, i) => {
                          const isMe = c.id === myCompetitor.id;
                          return (
                            <motion.tr
                              key={c.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2 }}
                              className={`border-b border-border/15 transition-colors ${isMe ? 'bg-emerald-500/8' : 'hover:bg-muted/20'}`}
                            >
                              <td className="py-2.5 px-4">
                                <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md text-[11px] font-bold font-mono ${
                                  i === 0 ? 'bg-amber-500/15 text-amber-400' :
                                  i === 1 ? 'bg-gray-400/15 text-gray-300' :
                                  i === 2 ? 'bg-orange-500/15 text-orange-400' :
                                  isMe ? 'bg-emerald-500/15 text-emerald-400' :
                                  'bg-muted/30 text-muted-foreground'
                                }`}>
                                  {c.rank}
                                </span>
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="h-7 w-7">
                                    <AvatarImage src={c.avatar || undefined} />
                                    <AvatarFallback className="bg-muted text-[10px]">{c.username.slice(0,2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <span className="font-medium text-sm">{c.displayName || c.username}</span>
                                    {isMe && <span className="ml-1.5 text-[10px] text-emerald-400 font-medium">YOU</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-right hidden sm:table-cell">
                                <span className={`font-mono text-xs tabular-nums ${c.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {c.winRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <span className={`inline-flex items-center gap-0.5 font-mono text-sm font-semibold tabular-nums ${c.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {c.totalPnl >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  {Math.abs(c.totalPnl).toFixed(2)}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-semibold tabular-nums ${
                                  parseFloat(c.roi) >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                  {parseFloat(c.roi) >= 0 ? '+' : ''}{c.roi}%
                                </span>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Recent Trades */}
            <div className="space-y-4">
              <Card className="glass border-border/30">
                <CardHeader className="pb-3 border-b border-border/20">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    <CardTitle className="text-base">Recent Trades</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="space-y-2 max-h-[460px] overflow-y-auto">
                    {recentTrades.slice(0, 20).map((trade) => (
                      <div key={trade.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/20 transition-colors">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          trade.direction === 'long' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                        }`}>
                          {trade.direction === 'long'
                            ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                            : <TrendingDown className="h-4 w-4 text-red-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{trade.pair}</span>
                            <span className={`font-mono text-sm font-semibold tabular-nums ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                              {trade.competitor?.displayName || trade.competitor?.username}
                            </span>
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                              trade.direction === 'long' ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'
                            }`}>
                              {trade.direction.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Prize Pool Mini */}
              {activeComp && (
                <Card className="glass border-border/30 glow-green">
                  <CardContent className="p-4 text-center">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Prize Pool</p>
                    <p className="text-3xl font-extrabold text-gradient-green font-mono tabular-nums">
                      ${(activeComp._count.competitors * 10).toLocaleString()}
                    </p>
                    <div className="flex justify-center gap-4 mt-3 text-xs">
                      <div><span className="text-amber-400 font-bold">1st</span> <span className="text-muted-foreground">50%</span></div>
                      <div><span className="text-gray-300 font-bold">2nd</span> <span className="text-muted-foreground">25%</span></div>
                      <div><span className="text-orange-400 font-bold">3rd</span> <span className="text-muted-foreground">15%</span></div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>

        <footer className="border-t border-border/20 mt-auto">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                <TrendingUp className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-xs text-muted-foreground">ForexRush &copy; {new Date().getFullYear()}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Simulated trading &middot; Not financial advice</p>
          </div>
        </footer>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  //  LANDING PAGE
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex flex-col bg-background bg-grid bg-noise">
      {/* ── Ticker Tape ──────────────────────────────────────────── */}
      <div className="overflow-hidden border-b border-border/20 bg-surface">
        <div className="flex animate-ticker whitespace-nowrap py-1.5 px-4">
          {[...TICKER_PAIRS, ...TICKER_PAIRS].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-3 mx-6 text-xs">
              <span className="text-muted-foreground font-medium">{t.pair}</span>
              <span className="font-mono text-foreground tabular-nums">{t.price.toFixed(t.pair.includes('JPY') ? 2 : t.pair === 'XAU/USD' ? 2 : 4)}</span>
              <span className={`font-mono tabular-nums ${t.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {t.change >= 0 ? '+' : ''}{t.change.toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-border/30">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">ForexRush</span>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] px-1.5 py-0 hidden sm:inline-flex">
              LIVE
            </Badge>
          </div>
          <Button
            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-sm glow-green transition-all duration-200"
            onClick={() => { setAppState('loading'); setTimeout(() => setAppState('landing'), 50); }}
          >
            <Key className="h-3.5 w-3.5 mr-1.5" />
            Redeem Code
          </Button>
        </div>
      </nav>

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-emerald-600/3 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative mx-auto max-w-6xl px-4 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge variant="outline" className="mb-6 border-emerald-500/30 text-emerald-400 px-4 py-1.5 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                {activeComp ? `${activeComp._count.competitors} traders competing` : 'Competition Active'}
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                Enter the Arena.
                <br />
                <span className="text-gradient-green">Trade to the Top.</span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                Redeem your exclusive access code to join the competition.
                Start with <span className="text-foreground font-semibold font-mono">$10,000</span> virtual balance.
                Climb the leaderboard. Win real prizes.
              </p>

              {/* Stats row */}
              {activeComp && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mt-10 grid grid-cols-3 gap-3 max-w-lg mx-auto"
                >
                  {[
                    { icon: Users, label: 'Traders', value: activeComp._count.competitors.toString() },
                    { icon: DollarSign, label: 'Prize Pool', value: `$${activeComp._count.competitors * 10}` },
                    { icon: Timer, label: 'Ends In', value: timeLeft.split(':').slice(0, 2).join(':') },
                  ].map((s) => (
                    <div key={s.label} className="glass rounded-xl p-3">
                      <s.icon className="h-4 w-4 mx-auto text-emerald-400 mb-1.5" />
                      <p className="text-lg sm:text-xl font-bold font-mono tabular-nums">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* ── License Code Input ────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-12 max-w-md mx-auto"
            >
              <div className="glass rounded-2xl p-6 glow-green">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-bold">Redeem Your Access Code</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Enter the code from your invitation to join the competition.</p>

                <div className="relative mb-3">
                  <Input
                    placeholder="COMP-XXXX-XXXX"
                    value={licenseCode}
                    onChange={e => { setLicenseCode(e.target.value.toUpperCase()); setLicenseError(''); }}
                    className="h-12 bg-muted/50 border-border/40 focus:border-emerald-500/50 font-mono text-base tracking-widest text-center uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                    maxLength={14}
                    onKeyDown={e => { if (e.key === 'Enter') verifyLicense(); }}
                  />
                  <button
                    onClick={() => setShowCode(!showCode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {licenseError && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-3 text-sm text-red-400">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {licenseError}
                  </motion.div>
                )}

                <Button
                  className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm glow-green transition-all duration-200"
                  onClick={verifyLicense}
                  disabled={licenseVerifying || licenseCode.trim().length < 14}
                >
                  {licenseVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                  Verify & Continue
                </Button>

                <p className="text-[11px] text-muted-foreground mt-3 text-center">
                  15 exclusive access codes issued &middot; Each code is single-use &middot; Valid for 30 days
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Top 3 Podium ───────────────────────────────────────── */}
        {topThree.length >= 3 && (
          <section className="mx-auto max-w-6xl px-4 py-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold">Top Performers</h2>
              <p className="text-sm text-muted-foreground mt-2">Live leaderboard — updated in real-time</p>
            </div>

            <div className="flex items-end justify-center gap-3 sm:gap-5 max-w-2xl mx-auto">
              {/* 2nd */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center w-1/3">
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-gray-400/50">
                  <AvatarImage src={topThree[1].avatar || undefined} />
                  <AvatarFallback className="bg-gray-700/50 text-gray-300 text-xs">{topThree[1].username.slice(0,2)}</AvatarFallback>
                </Avatar>
                <p className="mt-2 text-xs sm:text-sm font-semibold truncate w-full text-center">{topThree[1].displayName || topThree[1].username}</p>
                <p className={`text-xs sm:text-sm font-bold font-mono tabular-nums ${topThree[1].totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {topThree[1].totalPnl >= 0 ? '+' : ''}{topThree[1].totalPnl.toFixed(0)}
                </p>
                <div className="w-full mt-2 rounded-t-xl glass border-b-0 flex items-center justify-center py-3 sm:py-6">
                  <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                </div>
              </motion.div>

              {/* 1st */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center w-1/3">
                <Crown className="h-5 w-5 text-amber-400 mb-1" />
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-amber-400/70 shadow-lg shadow-amber-400/10">
                  <AvatarImage src={topThree[0].avatar || undefined} />
                  <AvatarFallback className="bg-amber-900/50 text-amber-300 text-sm">{topThree[0].username.slice(0,2)}</AvatarFallback>
                </Avatar>
                <p className="mt-2 text-sm sm:text-base font-bold truncate w-full text-center">{topThree[0].displayName || topThree[0].username}</p>
                <p className="text-sm sm:text-base font-bold text-emerald-400 font-mono tabular-nums">
                  +{topThree[0].totalPnl.toFixed(0)}
                </p>
                <div className="w-full mt-2 rounded-t-xl glass border-b-0 flex items-center justify-center py-5 sm:py-10 glow-green-strong">
                  <div className="text-center">
                    <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400 mx-auto" />
                    <span className="text-xs text-amber-400 font-bold mt-1 block">#1</span>
                  </div>
                </div>
              </motion.div>

              {/* 3rd */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center w-1/3">
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-orange-400/50">
                  <AvatarImage src={topThree[2].avatar || undefined} />
                  <AvatarFallback className="bg-orange-900/50 text-orange-300 text-xs">{topThree[2].username.slice(0,2)}</AvatarFallback>
                </Avatar>
                <p className="mt-2 text-xs sm:text-sm font-semibold truncate w-full text-center">{topThree[2].displayName || topThree[2].username}</p>
                <p className={`text-xs sm:text-sm font-bold font-mono tabular-nums ${topThree[2].totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {topThree[2].totalPnl >= 0 ? '+' : ''}{topThree[2].totalPnl.toFixed(0)}
                </p>
                <div className="w-full mt-2 rounded-t-xl glass border-b-0 flex items-center justify-center py-2 sm:py-4">
                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* ── How It Works ───────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold">How It Works</h2>
            <p className="text-sm text-muted-foreground mt-2">Three steps to start competing</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { step: '01', icon: Key, title: 'Redeem Code', desc: 'Enter your exclusive access code to unlock the competition. Single-use, 30-day validity.' },
              { step: '02', icon: BarChart3, title: 'Trade & Compete', desc: 'Get $10,000 virtual balance. Execute trades and climb the live leaderboard.' },
              { step: '03', icon: Trophy, title: 'Win Prizes', desc: 'Top performers take the prize pool. 1st place wins 50% — pure skill, no luck.' },
            ].map((item, idx) => (
              <motion.div key={item.step} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: idx * 0.1 }}>
                <Card className="glass border-border/30 h-full hover:border-emerald-500/20 transition-colors duration-300">
                  <CardContent className="pt-6">
                    <span className="text-3xl font-black text-emerald-500/15 font-mono">{item.step}</span>
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mt-2 mb-3">
                      <item.icon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <h3 className="font-bold mb-1.5">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Prize Breakdown ────────────────────────────────────── */}
        {activeComp && (
          <section className="mx-auto max-w-6xl px-4 py-16">
            <div className="glass rounded-2xl p-6 sm:p-8 glow-green">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold">Prize Distribution</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Total Pool: <span className="text-2xl font-extrabold text-gradient-green font-mono tabular-nums">${(activeComp._count.competitors * 10).toLocaleString()}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
                {[
                  { rank: '1st', pct: '50%', amount: (activeComp._count.competitors * 10 * 0.5), icon: Crown, color: 'text-amber-400' },
                  { rank: '2nd', pct: '25%', amount: (activeComp._count.competitors * 10 * 0.25), icon: Medal, color: 'text-gray-300' },
                  { rank: '3rd', pct: '15%', amount: (activeComp._count.competitors * 10 * 0.15), icon: Award, color: 'text-orange-400' },
                  { rank: '4-10', pct: '10%', amount: (activeComp._count.competitors * 10 * 0.1), icon: BarChart3, color: 'text-muted-foreground' },
                ].map((p) => (
                  <div key={p.rank} className="text-center p-3 rounded-xl glass-subtle">
                    <p.icon className={`h-6 w-6 mx-auto mb-2 ${p.color}`} />
                    <p className="text-2xl font-extrabold font-mono tabular-nums">{p.pct}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.rank} Place</p>
                    <p className="text-sm font-semibold font-mono tabular-nums mt-1 text-emerald-400">${p.amount.toFixed(0)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Features ───────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Shield, title: 'Fair Competition', desc: 'Everyone starts equal with $10K. No hidden advantages — pure skill determines the winner.' },
              { icon: Zap, title: 'Real-Time Leaderboard', desc: 'Live P&L updates every few seconds. Watch the rankings shift as traders execute.' },
              { icon: Lock, title: 'Exclusive Access', desc: 'Invitation-only. 15 access codes per round keeps the competition elite.' },
            ].map((item) => (
              <Card key={item.title} className="glass border-border/30 hover:border-emerald-500/20 transition-colors duration-300">
                <CardContent className="pt-5 text-center">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="font-bold mb-1.5">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-border/20 mt-auto">
        <div className="mx-auto max-w-6xl px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">ForexRush &copy; {new Date().getFullYear()}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Simulated trading competition &middot; Not financial advice</p>
        </div>
      </footer>
    </div>
  );
}