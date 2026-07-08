import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Access code is required' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    const accessCode = await db.accessCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!accessCode) {
      return NextResponse.json({ valid: false, error: 'Invalid access code' }, { status: 404 });
    }

    if (accessCode.redeemed) {
      return NextResponse.json({ valid: false, error: 'This code has already been redeemed' }, { status: 410 });
    }

    if (new Date() > accessCode.expiresAt) {
      return NextResponse.json({ valid: false, error: 'This access code has expired' }, { status: 410 });
    }

    return NextResponse.json({
      valid: true,
      clientName: accessCode.clientName,
      email: accessCode.email,
      expiresAt: accessCode.expiresAt,
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json({ valid: false, error: 'Verification failed' }, { status: 500 });
  }
}