import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { competitionId, username, avatar } = body;

    if (!competitionId || !username) {
      return NextResponse.json({ error: 'Competition ID and username are required' }, { status: 400 });
    }

    const competition = await db.competition.findUnique({
      where: { id: competitionId },
      include: {
        _count: { select: { competitors: true } },
      },
    });

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    if (competition.status !== 'active' && competition.status !== 'upcoming') {
      return NextResponse.json({ error: 'Competition is not accepting enrollments' }, { status: 400 });
    }

    if (competition._count.competitors >= competition.maxParticipants) {
      return NextResponse.json({ error: 'Competition is full' }, { status: 400 });
    }

    const existing = await db.competitor.findFirst({
      where: { competitionId, username },
    });

    if (existing) {
      return NextResponse.json({ error: 'Username already taken in this competition' }, { status: 409 });
    }

    const competitor = await db.competitor.create({
      data: {
        competitionId,
        username,
        avatar: avatar || null,
        initialBalance: 10000.0,
        currentBalance: 10000.0,
      },
    });

    return NextResponse.json(competitor, { status: 201 });
  } catch (error) {
    console.error('Error enrolling:', error);
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  }
}