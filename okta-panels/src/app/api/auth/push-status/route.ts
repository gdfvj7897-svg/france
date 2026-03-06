import { NextRequest, NextResponse } from 'next/server';
import { getSessionByIp } from '@/lib/sessions';

export async function GET(request: NextRequest) {
  const rawIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const { normalizeIp } = await import('@/lib/sessions');
  const clientIp = normalizeIp(rawIp);

  const session = getSessionByIp(clientIp);

  if (!session) {
    return NextResponse.json({ status: 'not_found' });
  }

  // Check if push request has timed out (3 minutes)
  if (session.pushStatus === 'waiting' && session.pushRequestedAt) {
    const elapsed = Date.now() - new Date(session.pushRequestedAt).getTime();
    const THREE_MINUTES = 3 * 60 * 1000;

    if (elapsed > THREE_MINUTES) {
      return NextResponse.json({ status: 'timeout' });
    }
  }

  return NextResponse.json({
    status: session.pushStatus || 'none',
    sessionId: session.id,
  });
}
