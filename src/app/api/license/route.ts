import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Verify a license code without redeeming
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const license = await db.licenseCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!license) {
      return NextResponse.json({ valid: false, error: 'Invalid access code' }, { status: 404 });
    }

    if (license.status === 'expired') {
      return NextResponse.json({ valid: false, error: 'This access code has expired' }, { status: 410 });
    }

    if (license.status === 'redeemed') {
      return NextResponse.json({ valid: false, error: 'This access code has already been redeemed' }, { status: 409 });
    }

    return NextResponse.json({
      valid: true,
      clientName: license.clientName,
      email: license.email,
      expiresAt: license.expiresAt,
    });
  } catch (error) {
    console.error('Error verifying license:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

// Redeem a license code and enroll
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, competitionId, username } = body;

    if (!code || !competitionId || !username) {
      return NextResponse.json({ error: 'Code, competition ID, and username are required' }, { status: 400 });
    }

    const upperCode = code.toUpperCase().trim();

    // Find and validate license
    const license = await db.licenseCode.findUnique({
      where: { code: upperCode },
    });

    if (!license) {
      return NextResponse.json({ error: 'Invalid access code. Please check and try again.' }, { status: 404 });
    }

    if (license.status === 'expired') {
      return NextResponse.json({ error: 'This access code has expired.' }, { status: 410 });
    }

    if (license.status === 'redeemed') {
      return NextResponse.json({ error: 'This access code has already been used.' }, { status: 409 });
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
      return NextResponse.json({ error: 'This competition is not accepting entries' }, { status: 400 });
    }

    // Check username uniqueness
    const existingUser = await db.competitor.findFirst({
      where: { competitionId, username: username.trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'This trader name is already taken.' }, { status: 409 });
    }

    // Create competitor and mark license as redeemed in a transaction-like flow
    const competitor = await db.competitor.create({
      data: {
        licenseCodeId: license.id,
        competitionId,
        username: username.trim(),
        displayName: license.clientName,
        avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username.trim())}`,
        initialBalance: 10000.0,
        currentBalance: 10000.0,
      },
    });

    await db.licenseCode.update({
      where: { id: license.id },
      data: {
        status: 'redeemed',
        redeemedAt: new Date(),
        redeemedBy: username.trim(),
      },
    });

    // Update prize pool
    const comp = await db.competition.findUnique({
      where: { id: competitionId },
      include: { _count: { select: { competitors: true } } },
    });

    if (comp) {
      await db.competition.update({
        where: { id: competitionId },
        data: { prizePool: comp._count.competitors * 10 },
      });
    }

    return NextResponse.json({
      success: true,
      competitor,
      message: `Welcome, ${license.clientName}! You're now enrolled.`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error redeeming license:', error);
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 });
  }
}