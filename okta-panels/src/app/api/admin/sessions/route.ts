import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SECRET } from '@/config/admin.config';
import { getActiveSessions, getAllSessions, getSessionStats, clearAllSessions } from '@/lib/sessions';
import { store } from '@/lib/store';

function verifyToken(request: NextRequest): boolean {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [expiry, secret] = decoded.split(':');
    if (secret !== ADMIN_SECRET) return false;
    if (Date.now() > parseInt(expiry)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const showAll = request.nextUrl.searchParams.get('all') === 'true';
  const sessions = showAll ? getAllSessions() : getActiveSessions();
  const stats = getSessionStats();
  return NextResponse.json({
    sessions,
    stats,
    isPaused: store.isPaused,
  });
}

export async function PATCH(request: NextRequest) {
  if (!verifyToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (typeof body.paused !== 'boolean') {
      return NextResponse.json({ error: '`paused` must be a boolean' }, { status: 400 });
    }
    store.isPaused = body.paused;
    return NextResponse.json({ ok: true, isPaused: store.isPaused });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verifyToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  clearAllSessions();
  return NextResponse.json({ success: true });
}
