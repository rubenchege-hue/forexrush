import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const CODE_REGEX = /^COMP-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const normalized = code.toUpperCase().trim();

    if (!CODE_REGEX.test(normalized)) {
      return NextResponse.json({ valid: false, error: 'Invalid code format. Use format: COMP-XXXX-XXXX' }, { status: 400 });
    }

    const license = await db.licenseCode.findUnique({
      where: { code: normalized },
    });

    if (!license) {
      return NextResponse.json({ valid: false, error: 'Invalid access code' }, { status: 404 });
    }

    if (license.status === 'expired') {
      return NextResponse.json({ valid: false, error: 'This access code has expired' }, { status: 410 });
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

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { code, competitionId, username } = body;

    if (!competitionId || !username) {
      return NextResponse.json({ error: 'Competition ID and username are required' }, { status: 400 });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 2) {
      return NextResponse.json({ error: 'Username must be at least 2 characters' }, { status: 400 });
    }

    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const competition = await tx.competition.findUnique({
        where: { id: competitionId },
        include: { _count: { select: { competitors: true } } },
      });

      if (!competition) {
        throw new Error('COMPETITION_NOT_FOUND');
      }

      if (competition.status !== 'active' && competition.status !== 'upcoming') {
        throw new Error('COMPETITION_CLOSED');
      }

      const existingUser = await tx.competitor.findFirst({
        where: { competitionId, username: trimmedUsername },
      });

      if (existingUser) {
        throw new Error('USERNAME_TAKEN');
      }

      if (code) {
        const normalized = code.toUpperCase().trim();
        if (!CODE_REGEX.test(normalized)) {
          throw new Error('INVALID_FORMAT');
        }

        const license = await tx.licenseCode.findUnique({
          where: { code: normalized },
        });

        if (!license) {
          throw new Error('INVALID_CODE');
        }

        if (license.status === 'expired') {
          throw new Error('CODE_EXPIRED');
        }

        const existingEntry = await tx.competitor.findFirst({
          where: { licenseCodeId: license.id, competitionId },
        });

        if (existingEntry) {
          return { competitor: existingEntry, isReturning: true };
        }

        const competitor = await tx.competitor.create({
          data: {
            licenseCodeId: license.id,
            competitionId,
            username: trimmedUsername,
            displayName: license.clientName,
            avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(trimmedUsername)}`,
            initialBalance: 10000.0,
            currentBalance: 10000.0,
          },
        });

        await tx.competition.update({
          where: { id: competitionId },
          data: { prizePool: (competition._count.competitors + 1) * 10 },
        });

        return { competitor, isReturning: false };
      }

      const competitor = await tx.competitor.create({
        data: {
          competitionId,
          username: trimmedUsername,
          displayName: trimmedUsername,
          avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(trimmedUsername)}`,
          initialBalance: 10000.0,
          currentBalance: 10000.0,
        },
      });

      return { competitor, isReturning: false };
    });

    const msg = result.isReturning ? 'Welcome back! Re-entering the arena.' : "Welcome! You're now enrolled.";
    return NextResponse.json({
      success: true,
      competitor: result.competitor,
      message: msg,
    }, { status: result.isReturning ? 200 : 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This trader name is already taken.' }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : 'Redemption failed';
    const statusMap: Record<string, number> = {
      INVALID_CODE: 404,
      INVALID_FORMAT: 400,
      CODE_EXPIRED: 410,
      COMPETITION_NOT_FOUND: 404,
      COMPETITION_CLOSED: 400,
      USERNAME_TAKEN: 409,
    };
    const status = statusMap[message] || 500;
    const displayMessages: Record<string, string> = {
      INVALID_CODE: 'Invalid access code. Please check and try again.',
      INVALID_FORMAT: 'Invalid code format. Use format: COMP-XXXX-XXXX',
      CODE_EXPIRED: 'This access code has expired.',
      COMPETITION_NOT_FOUND: 'Competition not found.',
      COMPETITION_CLOSED: 'This competition is not accepting entries.',
      USERNAME_TAKEN: 'This trader name is already taken.',
    };
    return NextResponse.json({ error: displayMessages[message] || 'Redemption failed' }, { status });
  }
}
