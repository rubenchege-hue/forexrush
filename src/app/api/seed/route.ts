import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const FOREX_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'USD/CHF'];
const FOREX_PRICES: Record<string, number> = {
  'EUR/USD': 1.0876, 'GBP/USD': 1.2734, 'USD/JPY': 149.82, 'AUD/USD': 0.6543,
  'USD/CAD': 1.3621, 'NZD/USD': 0.6127, 'EUR/GBP': 0.8542, 'EUR/JPY': 163.01,
  'GBP/JPY': 190.72, 'USD/CHF': 0.8834,
};

const LICENSE_CODES = [
  { code: 'COMP-XAJI-0Y6D', client: 'Client 1', email: 'client1@example.com' },
  { code: 'COMP-PBHS-AHXT', client: 'Client 2', email: 'client2@example.com' },
  { code: 'COMP-HV3A-3ZMF', client: 'Client 3', email: 'client3@example.com' },
  { code: 'COMP-8MDD-4V30', client: 'Client 4', email: 'client4@example.com' },
  { code: 'COMP-T9NT-3W5U', client: 'Client 5', email: 'client5@example.com' },
  { code: 'COMP-ZBIK-CIDK', client: 'Client 6', email: 'client6@example.com' },
  { code: 'COMP-WNNH-J7XV', client: 'Client 7', email: 'client7@example.com' },
  { code: 'COMP-G0FN-9XUY', client: 'Client 8', email: 'client8@example.com' },
  { code: 'COMP-41IB-LJH7', client: 'Client 9', email: 'client9@example.com' },
  { code: 'COMP-5LXO-6QJI', client: 'Client 10', email: 'client10@example.com' },
  { code: 'COMP-UJV6-OH9S', client: 'Client 11', email: 'client11@example.com' },
  { code: 'COMP-DBDW-2PCN', client: 'Client 12', email: 'client12@example.com' },
  { code: 'COMP-9T84-AZYT', client: 'Client 13', email: 'client13@example.com' },
  { code: 'COMP-JXEP-Q85J', client: 'Client 14', email: 'client14@example.com' },
  { code: 'COMP-SG65-KXVF', client: 'Client 15', email: 'client15@example.com' },
];

const USERNAMES = [
  'ForexKing_99', 'PipHunter', 'TrendRider', 'ScalpMaster', 'BullRun_Trader',
  'ChartWizard', 'SwingPro', 'MarginCall_Mike', 'GreenPips', 'RiskManager',
  'BreakoutBoss', 'CandleKing', 'FiboTrader', 'MACD_Master', 'RSI_Warrior',
  'VolatilityVixen', 'RangeTrader', 'NewsTrader_Jay', 'CarryTrade_Chris', 'AlgoTrader_X',
];

export async function POST() {
  try {
    // Skip if data already exists
    const existingComp = await db.competition.count();
    if (existingComp > 0) {
      const comps = await db.competition.findMany({ include: { _count: { select: { competitors: true } } }, orderBy: { createdAt: 'desc' } });
      const active = comps.find(c => c.status === 'active') || comps[0];
      return NextResponse.json({ message: 'Already seeded', competitionId: active?.id, skipped: true });
    }

    // Clear existing data
    await db.trade.deleteMany();
    await db.competitor.deleteMany();
    await db.licenseCode.deleteMany();
    await db.competition.deleteMany();

    // Seed license codes
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    for (const lc of LICENSE_CODES) {
      await db.licenseCode.create({
        data: {
          code: lc.code,
          clientName: lc.client,
          email: lc.email,
          status: 'active',
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + thirtyDays),
        },
      });
    }

    // Create main competition
    const competition = await db.competition.create({
      data: {
        title: 'Forex Rush — July Showdown',
        description: 'The ultimate forex trading competition. Trade with a $10,000 virtual balance and compete for the top spot on the leaderboard. 15 exclusive access codes — redeem yours to enter.',
        entryFee: 10.0,
        prizePool: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active',
        maxParticipants: 500,
      },
    });

    // Create demo competitors (without license codes — they're simulated traders)
    const shuffled = [...USERNAMES].sort(() => Math.random() - 0.5).slice(0, 20);

    const competitors = await Promise.all(
      shuffled.map((username, index) => {
        const totalPnl = Math.round((Math.random() * 6000 - 1500 + (20 - index) * 200) * 100) / 100;
        const totalTrades = Math.floor(Math.random() * 80) + 10;
        const wins = Math.floor(totalTrades * (0.35 + Math.random() * 0.4));
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const currentBalance = 10000 + totalPnl;

        return db.competitor.create({
          data: {
            competitionId: competition.id,
            username,
            displayName: username,
            avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${username}`,
            initialBalance: 10000.0,
            currentBalance: parseFloat(currentBalance.toFixed(2)),
            totalPnl,
            totalTrades,
            winRate: parseFloat(winRate.toFixed(2)),
          },
        });
      })
    );

    // Create trades for each competitor
    for (const competitor of competitors) {
      const numTrades = Math.floor(Math.random() * 5) + 2;
      for (let i = 0; i < numTrades; i++) {
        const pair = FOREX_PAIRS[Math.floor(Math.random() * FOREX_PAIRS.length)];
        const direction = Math.random() > 0.5 ? 'long' : 'short';
        const lotSize = parseFloat((Math.random() * 1.5 + 0.1).toFixed(2));
        const basePrice = FOREX_PRICES[pair];
        const isJpy = pair.includes('JPY');
        const entryPrice = parseFloat((basePrice + (Math.random() - 0.5) * basePrice * 0.002).toFixed(isJpy ? 2 : 4));
        const pipValue = isJpy ? 0.01 : 0.0001;
        const pipsRange = Math.random() * 60 - 20;
        const exitPrice = parseFloat((direction === 'long'
          ? entryPrice + pipsRange * pipValue
          : entryPrice - pipsRange * pipValue
        ).toFixed(isJpy ? 2 : 4));
        const pips = direction === 'long'
          ? (exitPrice - entryPrice) / pipValue
          : (entryPrice - exitPrice) / pipValue;
        const pnl = parseFloat((pips * lotSize * (isJpy ? 6.67 : 10)).toFixed(2));
        const openedAt = new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000);
        const closedAt = new Date(openedAt.getTime() + Math.random() * 4 * 60 * 60 * 1000);

        await db.trade.create({
          data: {
            competitorId: competitor.id,
            competitionId: competition.id,
            pair, direction, lotSize, entryPrice, exitPrice, pnl,
            status: 'closed', openedAt, closedAt,
          },
        });
      }
    }

    // Update prize pool
    const totalParticipants = competitors.length;
    await db.competition.update({
      where: { id: competition.id },
      data: { prizePool: totalParticipants * 10 },
    });

    // Second upcoming competition
    await db.competition.create({
      data: {
        title: 'Forex Rush — August Masters',
        description: 'Bigger prize pool, tougher competition. New access codes will be issued for this round.',
        entryFee: 10.0,
        prizePool: 0,
        startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
        status: 'upcoming',
        maxParticipants: 1000,
      },
    });

    return NextResponse.json({
      message: 'Database seeded',
      competitionId: competition.id,
      competitors: totalParticipants,
      licenseCodes: LICENSE_CODES.length,
    });
  } catch (error) {
    console.error('Error seeding:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}