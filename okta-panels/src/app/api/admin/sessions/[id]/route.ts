import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SECRET } from '@/config/admin.config';
import { setPushStatus, getSessionById, getActiveSessions } from '@/lib/sessions';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const action = body?.action;

    if (action === 'approve' || action === 'reject') {
      const success = setPushStatus(id, action === 'approve' ? 'approved' : 'rejected');

      if (!success) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }

    // Allow admin to set phone number: { action: 'setPhone', phoneNumber: '+1 ...' }
    if (action === 'setPhone') {
      const phoneNumber = body?.phoneNumber;
      if (!phoneNumber || typeof phoneNumber !== 'string') {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
      }

      const session = getSessionById(id);
      if (!session) {
        // Debug: return active session ids to help diagnose why the provided id isn't present
        const active = getActiveSessions().map(s => s.id);
        console.error(`Admin setPhone: session not found for id=${id}. activeCount=${active.length}`);
        return NextResponse.json({ error: 'Session not found', activeSessionIds: active }, { status: 404 });
      }

      // setSessionPhone imported below
      const { setSessionPhone } = await import('@/lib/sessions');
      const ok = setSessionPhone(id, phoneNumber);
      if (!ok) return NextResponse.json({ error: 'Failed to set phone' }, { status: 500 });

      // Return updated session for convenience
      const updated = getSessionById(id);
      return NextResponse.json({ success: true, session: updated });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // This endpoint is public - used by the login page to check push status
  const { id } = await params;
  const session = getSessionById(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({
    pushStatus: session.pushStatus,
    pushRequestedAt: session.pushRequestedAt,
  });
}
