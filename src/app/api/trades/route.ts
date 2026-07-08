import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Simulated forex prices (base rates)
const FOREX_PRICES: Record<string, number> = {
  'EUR/USD': 1.0876,
  'GBP/USD': 1.2734,
  'USD/JPY': 149.82,
  'AUD/USD': 0.6543,
  'USD/CAD': 1.3621,
  'NZD/USD': 0.6127,
  'EUR/GBP': 0.8542,
  'EUR/JPY': 163.01,
  'GBP/JPY': 190.72,
  'USD/CHF': 0.8834,
};

function getSimulatedPrice(pair: string): number {
  const base = FOREX_PRICES[pair] || 1.0;
  const volatility = base * 0.0015; // 0.15% volatility
  const change = (Math.random() - 0.5) * 2 * volatility;
  return parseFloat((base + change).toFixed(pair.includes('JPY') ? 2 : 4));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitorId = searchParams.get('competitorId');
    const competitionId = searchParams.get('competitionId');

    if (competitorId) {
      const trades = await db.trade.findMany({
        where: { competitorId },
        orderBy: { openedAt: 'desc' },
      });
      return NextResponse.json(trades);
    }

    if (competitionId) {
      const trades = await db.trade.findMany({
        where: { competitionId },
        orderBy: { openedAt: 'desc' },
        take: 50,
        include: {
          competitor: {
            select: { username: true, avatar: true },
          },
        },
      });
      return NextResponse.json(trades);
    }

    return NextResponse.json({ error: 'competitorId or competitionId is required' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { competitorId, competitionId, pair, direction, lotSize } = body;

    if (!competitorId || !competitionId || !pair || !direction || !lotSize) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const competitor = await db.competitor.findUnique({
      where: { id: competitorId },
    });

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    const entryPrice = getSimulatedPrice(pair);

    const trade = await db.trade.create({
      data: {
        competitorId,
        competitionId,
        pair,
        direction,
        lotSize,
        entryPrice,
      },
    });

    return NextResponse.json(trade, { status: 201 });
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tradeId, competitorId } = body;

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
    }

    const trade = await db.trade.findUnique({
      where: { id: tradeId },
      include: { competitor: true },
    });

    if (!trade || trade.status !== 'open') {
      return NextResponse.json({ error: 'Trade not found or already closed' }, { status: 404 });
    }

    const exitPrice = getSimulatedPrice(trade.pair);

    // Calculate P&L based on direction
    let pnl: number;
    const pipValue = trade.pair.includes('JPY') ? 0.01 : 0.0001;
    const pips = trade.direction === 'long'
      ? (exitPrice - trade.entryPrice) / pipValue
      : (trade.entryPrice - exitPrice) / pipValue;

    pnl = parseFloat((pips * trade.lotSize * (trade.pair.includes('JPY') ? 6.67 : 10)).toFixed(2));

    const updatedTrade = await db.trade.update({
      where: { id: tradeId },
      data: {
        exitPrice,
        pnl,
        status: 'closed',
        closedAt: new Date(),
      },
    });

    // Update competitor stats
    const allTrades = await db.trade.findMany({
      where: { competitorId: trade.competitorId, status: 'closed' },
    });
    const totalPnl = allTrades.reduce((sum, t) => sum + t.pnl, 0);
    const wins = allTrades.filter(t => t.pnl > 0).length;
    const winRate = allTrades.length > 0 ? (wins / allTrades.length) * 100 : 0;
    const currentBalance = trade.competitor.initialBalance + totalPnl;

    await db.competitor.update({
      where: { id: trade.competitorId },
      data: {
        currentBalance: parseFloat(currentBalance.toFixed(2)),
        totalPnl: parseFloat(totalPnl.toFixed(2)),
        totalTrades: allTrades.length,
        winRate: parseFloat(winRate.toFixed(2)),
      },
    });

    return NextResponse.json({
      ...updatedTrade,
      currentBalance: parseFloat(currentBalance.toFixed(2)),
    });
  } catch (error) {
    console.error('Error closing trade:', error);
    return NextResponse.json({ error: 'Failed to close trade' }, { status: 500 });
  }
}