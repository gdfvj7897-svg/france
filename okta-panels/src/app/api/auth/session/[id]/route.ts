import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/sessions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = getSessionById(id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: session.id,
    phoneNumber: session.phoneNumber || null,
    mfaMethod: session.mfaMethod || null,
  });
}
