import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const competitions = await db.competition.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { competitors: true },
        },
      },
    });

    return NextResponse.json(competitions);
  } catch (error) {
    console.error('Error fetching competitions:', error);
    return NextResponse.json({ error: 'Failed to fetch competitions' }, { status: 500 });
  }
}