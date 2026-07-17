import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Simulated forex prices (base rates)
const FOREX_PRICES: Record<string, number> = {
  'EUR/USD': 1.1455,
  'GBP/USD': 1.3495,
  'USD/JPY': 162.33,
  'AUD/USD': 0.6993,
  'USD/CAD': 1.4000,
  'NZD/USD': 0.5848,
  'EUR/GBP': 0.8488,
  'EUR/JPY': 185.95,
  'GBP/JPY': 219.07,
  'USD/CHF': 0.8080,
  'BTC/USD': 62907.77,
  'ETH/USD': 1831.40,
  'SOL/USD': 74.57,
  'XRP/USD': 1.0860,
  'DOGE/USD': 0.0718,
};

function isCryptoPair(pair: string): boolean {
  return ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'].some(c => pair.includes(c));
}

function getSimulatedPrice(pair: string): number {
  const base = FOREX_PRICES[pair] || 1.0;
  const volatility = base * 0.0015;
  const change = (Math.random() - 0.5) * 2 * volatility;
  const decimals = pair.includes('JPY') || isCryptoPair(pair) ? 2 : 4;
  return parseFloat((base + change).toFixed(decimals));
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
    const { competitorId, competitionId, pair, direction, lotSize, entryPrice: clientEntryPrice } = body;

    if (!competitorId || !competitionId || !pair || !direction || !lotSize) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const competitor = await db.competitor.findUnique({
      where: { id: competitorId },
    });

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    let entryPrice: number;
    if (clientEntryPrice !== undefined) {
      const price = parseFloat(clientEntryPrice);
      if (isNaN(price) || price <= 0) {
        return NextResponse.json({ error: 'Invalid entry price' }, { status: 400 });
      }
      entryPrice = price;
    } else {
      entryPrice = getSimulatedPrice(pair);
    }

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
    const { tradeId, competitorId, exitPrice: clientExitPrice } = body;

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

    let exitPrice: number;
    if (clientExitPrice !== undefined) {
      const price = parseFloat(clientExitPrice);
      if (isNaN(price) || price <= 0) {
        return NextResponse.json({ error: 'Invalid exit price' }, { status: 400 });
      }
      exitPrice = price;
    } else {
      exitPrice = getSimulatedPrice(trade.pair);
    }

    // Calculate P&L based on direction
    let pnl: number;
    if (isCryptoPair(trade.pair)) {
      const dir = trade.direction === 'long' ? 1 : -1;
      pnl = parseFloat(((exitPrice - trade.entryPrice) * trade.lotSize * dir).toFixed(2));
    } else {
      const pipValue = trade.pair.includes('JPY') ? 0.01 : 0.0001;
      const pips = trade.direction === 'long'
        ? (exitPrice - trade.entryPrice) / pipValue
        : (trade.entryPrice - exitPrice) / pipValue;
      pnl = parseFloat((pips * trade.lotSize * (trade.pair.includes('JPY') ? 6.67 : 10)).toFixed(2));
    }

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