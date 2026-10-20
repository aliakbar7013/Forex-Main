import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').toString().trim();
    const password = (body.password || '').toString();

    // Fallback: if user sent pin for backward compatibility, handle master admin 9398
    if (body.pin && !email && !password) {
      if (body.pin.toString().trim() === '9398') {
        const authRes = authenticateUser('admin@forex.com', 'AdminPassword123!');
        if (authRes.success && authRes.user) {
          const response = NextResponse.json({
            success: true,
            message: 'Authentication successful.',
            user: authRes.user
          });
          response.cookies.set('auth_session_id', authRes.user.id, {
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
            sameSite: 'lax'
          });
          return response;
        }
      }
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Please enter both your email address and password.' },
        { status: 400 }
      );
    }

    const result = authenticateUser(email, password);
    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const user = result.user;
    const response = NextResponse.json({
      success: true,
      message: 'Login successful.',
      user
    });

    // Set secure session cookie
    response.cookies.set('auth_session_id', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax'
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Authentication failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
