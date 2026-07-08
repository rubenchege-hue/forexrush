import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const FOREX_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'USD/CHF'];
const FOREX_PRICES: Record<string, number> = {
  'EUR/USD': 1.0876, 'GBP/USD': 1.2734, 'USD/JPY': 149.82, 'AUD/USD': 0.6543,
  'USD/CAD': 1.3621, 'NZD/USD': 0.6127, 'EUR/GBP': 0.8542, 'EUR/JPY': 163.01,
  'GBP/JPY': 190.72, 'USD/CHF': 0.8834,
};

const AVATARS = [
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader1',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader2',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader3',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader4',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader5',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader6',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader7',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader8',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader9',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader10',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader11',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader12',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader13',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader14',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader15',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader16',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader17',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader18',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader19',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=trader20',
];

const USERNAMES = [
  'ForexKing_99', 'PipHunter', 'TrendRider', 'ScalpMaster', 'BullRun_Trader',
  'ChartWizard', 'SwingPro', 'MarginCall_Mike', 'GreenPips', 'RiskManager',
  'BreakoutBoss', 'CandleKing', 'FiboTrader', 'MACD_Master', 'RSI_Warrior',
  'VolatilityVixen', 'RangeTrader', 'NewsTrader_Jay', 'CarryTrade_Chris', 'AlgoTrader_X',
  'ForexNinja', 'PipCollector', 'TrendSurfer', 'SniperFx', 'GoldRush_Trader',
  'DollarBull', 'YenMaster', 'EuroKing', 'PoundPro', 'LoonieTrader',
];

export async function POST() {
  try {
    // Clear existing data
    await db.trade.deleteMany();
    await db.competitor.deleteMany();
    await db.competition.deleteMany();

    // Create a main competition
    const competition = await db.competition.create({
      data: {
        title: 'Forex Rush — July Showdown',
        description: 'The ultimate forex trading competition. Trade with $10,000 virtual balance and compete for the top spot on the leaderboard. Only $10 to enter — winners take the prize pool!',
        entryFee: 10.0,
        prizePool: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active',
        maxParticipants: 500,
      },
    });

    // Create competitors with realistic P&L data
    const shuffledUsernames = [...USERNAMES].sort(() => Math.random() - 0.5).slice(0, 25);

    const competitors = await Promise.all(
      shuffledUsernames.map((username, index) => {
        // Generate varied P&L to make leaderboard interesting
        const totalPnl = Math.round((Math.random() * 6000 - 1500 + (25 - index) * 200) * 100) / 100;
        const totalTrades = Math.floor(Math.random() * 80) + 10;
        const wins = Math.floor(totalTrades * (0.35 + Math.random() * 0.4));
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const currentBalance = 10000 + totalPnl;

        return db.competitor.create({
          data: {
            competitionId: competition.id,
            username,
            avatar: AVATARS[index % AVATARS.length],
            initialBalance: 10000.0,
            currentBalance: parseFloat(currentBalance.toFixed(2)),
            totalPnl,
            totalTrades,
            winRate: parseFloat(winRate.toFixed(2)),
          },
        });
      })
    );

    // Create some trades for each competitor
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
        const isWin = pnl > 0;
        const openedAt = new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000);
        const closedAt = new Date(openedAt.getTime() + Math.random() * 4 * 60 * 60 * 1000);

        await db.trade.create({
          data: {
            competitorId: competitor.id,
            competitionId: competition.id,
            pair,
            direction,
            lotSize,
            entryPrice,
            exitPrice,
            pnl,
            status: 'closed',
            openedAt,
            closedAt,
          },
        });
      }
    }

    // Update competition prize pool based on participants
    await db.competition.update({
      where: { id: competition.id },
      data: {
        prizePool: competitors.length * 10,
      },
    });

    // Create a second upcoming competition
    await db.competition.create({
      data: {
        title: 'Forex Rush — August Masters',
        description: 'Prove your forex skills in the August Masters tournament. Bigger prize pool, tougher competition. Early bird enrollment open now!',
        entryFee: 10.0,
        prizePool: 0,
        startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
        status: 'upcoming',
        maxParticipants: 1000,
      },
    });

    return NextResponse.json({
      message: 'Database seeded successfully',
      competitionId: competition.id,
      competitorsCount: competitors.length,
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}