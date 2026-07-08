import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get('competitionId');

    if (!competitionId) {
      return NextResponse.json({ error: 'Competition ID is required' }, { status: 400 });
    }

    const competitors = await db.competitor.findMany({
      where: { competitionId },
      orderBy: { totalPnl: 'desc' },
    });

    const leaderboard = competitors.map((c, index) => ({
      ...c,
      rank: index + 1,
      roi: ((c.totalPnl / c.initialBalance) * 100).toFixed(2),
    }));

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}