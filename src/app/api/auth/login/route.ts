import { NextRequest, NextResponse } from 'next/server';
import { validatePin } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pin = (body.pin || '').toString().trim();

    if (!pin) {
      return NextResponse.json({ success: false, error: 'Please enter a PIN.' }, { status: 400 });
    }

    const result = validatePin(pin);
    if (!result.valid) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid PIN. Access denied.' 
      }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful.',
      role: result.role,
      label: result.label,
      pin
    });

    // Set secure cookie for 30 days
    response.cookies.set('auth_pin_session', pin, {
      httpOnly: false, // Accessible to client for instant resume
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
