import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { competitionId, username, avatar, accessCode: code } = body;

    if (!competitionId || !username || !code) {
      return NextResponse.json({ error: 'Competition, username, and access code are required' }, { status: 400 });
    }

    // Validate the access code
    const normalizedCode = code.trim().toUpperCase();
    const accessCode = await db.accessCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!accessCode) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 404 });
    }

    if (accessCode.redeemed) {
      return NextResponse.json({ error: 'This code has already been used' }, { status: 409 });
    }

    if (new Date() > accessCode.expiresAt) {
      return NextResponse.json({ error: 'This access code has expired' }, { status: 410 });
    }

    // Check competition
    const competition = await db.competition.findUnique({
      where: { id: competitionId },
      include: { _count: { select: { competitors: true } } },
    });

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    if (competition.status !== 'active' && competition.status !== 'upcoming') {
      return NextResponse.json({ error: 'Competition is not accepting enrollments' }, { status: 400 });
    }

    const existing = await db.competitor.findFirst({
      where: { competitionId, username },
    });

    if (existing) {
      return NextResponse.json({ error: 'Username already taken in this competition' }, { status: 409 });
    }

    // Create competitor and mark code as redeemed in a transaction
    const competitor = await db.$transaction(async (tx) => {
      const comp = await tx.competitor.create({
        data: {
          competitionId,
          username,
          avatar: avatar || null,
          accessCodeId: accessCode.id,
          initialBalance: 10000.0,
          currentBalance: 10000.0,
        },
      });

      await tx.accessCode.update({
        where: { id: accessCode.id },
        data: {
          redeemed: true,
          redeemedBy: username,
          redeemedAt: new Date(),
        },
      });

      return comp;
    });

    return NextResponse.json(competitor, { status: 201 });
  } catch (error) {
    console.error('Error enrolling:', error);
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  }
}