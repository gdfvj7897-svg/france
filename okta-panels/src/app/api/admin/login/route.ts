import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET, TOKEN_EXPIRATION } from '@/config/admin.config';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Create a simple token (timestamp + secret hash)
      const expiry = Date.now() + TOKEN_EXPIRATION;
      const token = Buffer.from(`${expiry}:${ADMIN_SECRET}`).toString('base64');

      const response = NextResponse.json({ success: true });

      // Set HTTP-only cookie
      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: TOKEN_EXPIRATION / 1000,
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
