import { NextRequest, NextResponse } from 'next/server';
import { validatePin } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cookiePin = req.cookies.get('auth_pin_session')?.value;
    const headerPin = req.headers.get('x-auth-pin');
    const pin = (cookiePin || headerPin || '').trim();

    if (!pin) {
      return NextResponse.json({ authenticated: false });
    }

    const result = validatePin(pin);
    if (!result.valid) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      role: result.role,
      label: result.label,
      pin
    });
  } catch (err: unknown) {
    return NextResponse.json({ authenticated: false });
  }
}
