'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Target,
  ChevronUp,
  ChevronDown,
  Activity,
  BarChart3,
  Flame,
  Medal,
  Crown,
  Award,
  ArrowRight,
  Play,
  Timer,
  Loader2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────
interface Competition {
  id: string;
  title: string;
  description: string;
  entryFee: number;
  prizePool: number;
  startDate: string;
  endDate: string;
  status: string;
  maxParticipants: number;
  _count: { competitors: number };
}

interface Competitor {
  id: string;
  username: string;
  avatar: string | null;
  initialBalance: number;
  currentBalance: number;
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  rank: number;
  roi: string;
}

interface Trade {
  id: string;
  pair: string;
  direction: string;
  lotSize: number;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number;
  status: string;
  openedAt: string;
  closedAt: string | null;
  competitor?: { username: string; avatar: string | null };
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function Home() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [activeComp, setActiveComp] = useState<Competition | null>(null);
  const [leaderboard, setLeaderboard] = useState<Competitor[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollUsername, setEnrollUsername] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [showMyTrades, setShowMyTrades] = useState(false);
  const [myCompetitorId, setMyCompetitorId] = useState<string | null>(null);
  const [myTrades, setMyTrades] = useState<Trade[]>([]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const [compRes, seedRes] = await Promise.all([
          fetch('/api/competitions'),
          fetch('/api/seed', { method: 'POST' }),
        ]);
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
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!activeComp) return;
    const timer = setInterval(() => {
      const end = new Date(activeComp.endDate).getTime();
      const now = Date.now();
      const diff = Math.max(0, end - now);
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeComp]);

  // Simulated live P&L updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLeaderboard(prev =>
        prev.map(c => {
          const fluctuation = (Math.random() - 0.45) * 30;
          const newPnl = parseFloat((c.totalPnl + fluctuation).toFixed(2));
          const newBalance = parseFloat((c.initialBalance + newPnl).toFixed(2));
          return { ...c, totalPnl: newPnl, currentBalance: newBalance, roi: ((newPnl / c.initialBalance) * 100).toFixed(2) };
        }).sort((a, b) => b.totalPnl - a.totalPnl).map((c, i) => ({ ...c, rank: i + 1 }))
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Enroll handler
  async function handleEnroll() {
    if (!enrollUsername.trim() || !activeComp) return;
    setEnrolling(true);
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionId: activeComp.id,
          username: enrollUsername.trim(),
          avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(enrollUsername.trim())}`,
        }),
      });
      if (res.ok) {
        const comp = await res.json();
        setMyCompetitorId(comp.id);
        setEnrolled(true);
        setEnrollOpen(false);
        // Refresh leaderboard
        const lbRes = await fetch(`/api/leaderboard?competitionId=${activeComp.id}`);
        setLeaderboard(await lbRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEnrolling(false);
    }
  }

  // Fetch my trades
  useEffect(() => {
    if (myCompetitorId) {
      fetch(`/api/trades?competitorId=${myCompetitorId}`)
        .then(r => r.json())
        .then(setMyTrades);
    }
  }, [myCompetitorId]);

  const topThree = leaderboard.slice(0, 3);
  const prizeBreakdown = activeComp
    ? [
        { rank: 1, pct: 50, label: '1st Place', icon: Crown, color: 'text-yellow-500' },
        { rank: 2, pct: 25, label: '2nd Place', icon: Medal, color: 'text-gray-400' },
        { rank: 3, pct: 15, label: '3rd Place', icon: Award, color: 'text-amber-700' },
        { rank: 4, pct: 10, label: '4th-10th Split', icon: BarChart3, color: 'text-muted-foreground' },
      ]
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">ForexRush</span>
          </div>
          <div className="flex items-center gap-3">
            {activeComp && (
              <Badge variant="outline" className="hidden sm:flex items-center gap-1 border-emerald-500/50 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </Badge>
            )}
            <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-semibold shadow-lg shadow-emerald-500/20">
                  {enrolled ? '✓ Enrolled' : 'Join $10'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Join the Competition</DialogTitle>
                  <DialogDescription>Enter with just $10 and trade your way to the top of the leaderboard.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-4 text-center">
                    <p className="text-sm text-muted-foreground">Entry Fee</p>
                    <p className="text-3xl font-bold text-emerald-400">$10</p>
                    <p className="text-xs text-muted-foreground mt-1">Virtual trading balance: $10,000</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Choose your trader name</label>
                    <Input
                      placeholder="e.g. PipMaster_99"
                      value={enrollUsername}
                      onChange={e => setEnrollUsername(e.target.value)}
                      maxLength={20}
                    />
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-semibold"
                    onClick={handleEnroll}
                    disabled={enrolling || !enrollUsername.trim()}
                  >
                    {enrolling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {enrolled ? '✓ Already Enrolled' : 'Enter Competition'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* ── Hero Section ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-background to-green-950/30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge variant="outline" className="mb-6 border-emerald-500/40 text-emerald-400 px-4 py-1.5 text-sm">
                <Flame className="h-3.5 w-3.5 mr-1.5" />
                {activeComp ? `${activeComp._count.competitors} traders competing now` : 'Competitions Open'}
              </Badge>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight">
                Trade. Compete.
                <span className="block bg-gradient-to-r from-emerald-400 via-green-400 to-lime-400 bg-clip-text text-transparent">
                  Win Big.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
                Enter forex trading competitions with just <span className="text-foreground font-semibold">$10</span>.
                Get a <span className="text-foreground font-semibold">$10,000</span> virtual balance, climb the leaderboard, and take home real cash prizes.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold text-lg px-8 py-6 shadow-xl shadow-emerald-500/25"
                  onClick={() => setEnrollOpen(true)}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Enter for $10
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
                  <a href="#leaderboard">
                    <Trophy className="h-5 w-5 mr-2" />
                    View Leaderboard
                  </a>
                </Button>
              </div>
            </motion.div>

            {/* Stats bar */}
            {activeComp && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
              >
                {[
                  { icon: Users, label: 'Traders', value: activeComp._count.competitors.toString() },
                  { icon: DollarSign, label: 'Prize Pool', value: `$${activeComp._count.competitors * 10}` },
                  { icon: Timer, label: 'Time Left', value: timeLeft },
                  { icon: Target, label: 'Entry Fee', value: '$10' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4">
                    <stat.icon className="h-5 w-5 mx-auto text-emerald-400 mb-2" />
                    <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">How It Works</h2>
            <p className="mt-3 text-muted-foreground text-lg">Four simple steps to start competing</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', icon: DollarSign, title: 'Pay $10 Entry', desc: 'Secure your spot in the competition with a low $10 entry fee. Accessible to everyone.' },
              { step: '02', icon: BarChart3, title: 'Get $10K Virtual', desc: 'You receive a $10,000 virtual trading balance to trade forex pairs in real-time.' },
              { step: '03', icon: Activity, title: 'Trade & Climb', desc: 'Execute trades, manage risk, and climb the live leaderboard with your P&L performance.' },
              { step: '04', icon: Trophy, title: 'Win Prizes', desc: 'Top performers win real cash prizes from the prize pool. 1st place takes 50%!' },
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Card className="h-full border-border/50 hover:border-emerald-500/30 transition-colors">
                  <CardContent className="pt-6">
                    <div className="text-4xl font-black text-emerald-500/20 mb-3">{item.step}</div>
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                      <item.icon className="h-5 w-5 text-emerald-500" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Live Leaderboard ─────────────────────────────────────── */}
        <section id="leaderboard" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 bg-gradient-to-b from-transparent to-emerald-950/10">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-emerald-500/40 text-emerald-400">
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              LIVE
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Leaderboard</h2>
            <p className="mt-3 text-muted-foreground text-lg">Real-time rankings — every pip counts</p>
          </div>

          {/* Top 3 Podium */}
          {topThree.length >= 3 && (
            <div className="flex items-end justify-center gap-3 sm:gap-6 mb-10 px-4 max-w-2xl mx-auto">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col items-center w-1/3"
              >
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-gray-400">
                  <AvatarImage src={topThree[1].avatar || undefined} />
                  <AvatarFallback className="bg-gray-700 text-white text-sm">{topThree[1].username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="mt-2 text-xs sm:text-sm font-semibold truncate w-full text-center">{topThree[1].username}</p>
                <p className={`text-xs sm:text-sm font-bold ${topThree[1].totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {topThree[1].totalPnl >= 0 ? '+' : ''}{topThree[1].totalPnl.toFixed(2)}
                </p>
                <div className="w-full mt-2 rounded-t-lg bg-gradient-to-t from-gray-600/20 to-gray-400/10 border border-b-0 border-gray-500/30 flex items-center justify-center">
                  <div className="py-4 sm:py-8">
                    <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mx-auto" />
                    <span className="text-xs text-gray-400 mt-1 block">#2</span>
                  </div>
                </div>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex flex-col items-center w-1/3"
              >
                <Crown className="h-5 w-5 text-yellow-400 mb-1" />
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-yellow-400 shadow-lg shadow-yellow-400/20">
                  <AvatarImage src={topThree[0].avatar || undefined} />
                  <AvatarFallback className="bg-yellow-600 text-white text-sm">{topThree[0].username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="mt-2 text-sm sm:text-base font-bold truncate w-full text-center">{topThree[0].username}</p>
                <p className="text-sm sm:text-base font-bold text-emerald-400">
                  +{topThree[0].totalPnl.toFixed(2)}
                </p>
                <div className="w-full mt-2 rounded-t-lg bg-gradient-to-t from-yellow-600/20 to-yellow-400/10 border border-b-0 border-yellow-500/30 flex items-center justify-center">
                  <div className="py-6 sm:py-12">
                    <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400 mx-auto" />
                    <span className="text-xs text-yellow-400 mt-1 block font-bold">#1</span>
                  </div>
                </div>
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col items-center w-1/3"
              >
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-amber-700">
                  <AvatarImage src={topThree[2].avatar || undefined} />
                  <AvatarFallback className="bg-amber-800 text-white text-sm">{topThree[2].username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="mt-2 text-xs sm:text-sm font-semibold truncate w-full text-center">{topThree[2].username}</p>
                <p className={`text-xs sm:text-sm font-bold ${topThree[2].totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {topThree[2].totalPnl >= 0 ? '+' : ''}{topThree[2].totalPnl.toFixed(2)}
                </p>
                <div className="w-full mt-2 rounded-t-lg bg-gradient-to-t from-amber-800/20 to-amber-700/10 border border-b-0 border-amber-700/30 flex items-center justify-center">
                  <div className="py-3 sm:py-5">
                    <Award className="h-5 w-5 sm:h-6 sm:w-6 text-amber-700 mx-auto" />
                    <span className="text-xs text-amber-700 mt-1 block">#3</span>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <Card className="max-w-4xl mx-auto border-border/50 overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-16">#</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Trader</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Trades</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Win Rate</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">P&L</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {leaderboard.map((c, i) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                            i === 1 ? 'bg-gray-400/20 text-gray-300' :
                            i === 2 ? 'bg-amber-700/20 text-amber-600' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {c.rank}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={c.avatar || undefined} />
                              <AvatarFallback className="bg-muted text-xs">{c.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium truncate max-w-[120px] sm:max-w-none">{c.username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right hidden sm:table-cell">{c.totalTrades}</td>
                        <td className="py-3 px-4 text-right hidden sm:table-cell">
                          <span className={c.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                            {c.winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          <span className={`flex items-center justify-end gap-1 ${c.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {c.totalPnl >= 0 ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            {Math.abs(c.totalPnl).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                            parseFloat(c.roi) >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {parseFloat(c.roi) >= 0 ? '+' : ''}{c.roi}%
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* ── Recent Trades Feed ───────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Live Trades</h2>
            <p className="mt-3 text-muted-foreground text-lg">See what traders are doing right now</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {recentTrades.slice(0, 12).map((trade) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={trade.competitor?.avatar || undefined} />
                          <AvatarFallback className="text-[10px]">{trade.competitor?.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate max-w-[100px]">{trade.competitor?.username}</span>
                      </div>
                      <Badge variant={trade.direction === 'long' ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
                        {trade.direction === 'long' ? (
                          <span className="flex items-center gap-0.5"><TrendingUp className="h-2.5 w-2.5" /> LONG</span>
                        ) : (
                          <span className="flex items-center gap-0.5"><TrendingDown className="h-2.5 w-2.5" /> SHORT</span>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm">{trade.pair}</p>
                        <p className="text-xs text-muted-foreground">{trade.lotSize} lots</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(trade.openedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Prize Breakdown ──────────────────────────────────────── */}
        {activeComp && (
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 bg-gradient-to-b from-transparent to-emerald-950/10">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold">Prize Pool</h2>
              <p className="mt-3 text-muted-foreground text-lg">
                Total: <span className="text-2xl font-bold text-foreground">${activeComp._count.competitors * 10}</span>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {prizeBreakdown.map((prize) => (
                <motion.div
                  key={prize.rank}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="text-center border-border/50 hover:border-emerald-500/30 transition-colors h-full">
                    <CardContent className="pt-6">
                      <prize.icon className={`h-8 w-8 mx-auto mb-3 ${prize.color}`} />
                      <p className="text-3xl font-extrabold mb-1">{prize.pct}%</p>
                      <p className="font-semibold mb-1">{prize.label}</p>
                      <p className="text-sm text-muted-foreground">
                        ${((activeComp._count.competitors * 10) * prize.pct / 100).toFixed(0)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── Features / Trust Section ─────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Why ForexRush?</h2>
            <p className="mt-3 text-muted-foreground text-lg">Built by traders, for traders</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Shield, title: 'Fair & Transparent', desc: 'Everyone starts with the same $10,000 balance. No hidden advantages. Pure skill-based competition.' },
              { icon: Zap, title: 'Real-Time Action', desc: 'Live leaderboard updates, real-time P&L tracking, and instant trade execution. Feel the adrenaline.' },
              { icon: DollarSign, title: 'Low Barrier', desc: 'Just $10 to enter. No large capital requirements. Compete with the best without breaking the bank.' },
            ].map((item) => (
              <Card key={item.title} className="border-border/50 hover:border-emerald-500/30 transition-colors">
                <CardContent className="pt-6 text-center">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── CTA Section ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl border border-emerald-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-emerald-900/40 to-green-950/60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
            <div className="relative text-center px-4 py-16 sm:py-20">
              <h2 className="text-3xl sm:text-5xl font-extrabold mb-4">
                Ready to Compete?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Join hundreds of traders competing for the top spot. Only $10 to enter — your trading skills do the rest.
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold text-lg px-10 py-6 shadow-xl shadow-emerald-500/25"
                onClick={() => setEnrollOpen(true)}
              >
                Enter Now — $10
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 bg-background/80">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <TrendingUp className="h-3 w-3 text-white" />
              </div>
              <span className="font-bold">ForexRush</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} ForexRush. Competitive forex trading platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}