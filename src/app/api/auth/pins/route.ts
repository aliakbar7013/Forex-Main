import { NextRequest, NextResponse } from 'next/server';
import { getAllAuthPins, createAuthPin, toggleAuthPinStatus, deleteAuthPin, validatePin } from '@/lib/db';

export const dynamic = 'force-dynamic';

function isCallerAdmin(req: NextRequest): boolean {
  const cookiePin = req.cookies.get('auth_pin_session')?.value;
  const headerPin = req.headers.get('x-auth-pin');
  const pin = (cookiePin || headerPin || '').trim();
  if (!pin) return false;
  const res = validatePin(pin);
  return res.valid && res.role === 'ADMIN';
}

// GET /api/auth/pins - List all PINs (Admin only)
export async function GET(req: NextRequest) {
  if (!isCallerAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Admin PIN required.' }, { status: 403 });
  }

  const pins = getAllAuthPins();
  return NextResponse.json({ success: true, pins });
}

// POST /api/auth/pins - Create a new user PIN (Admin only)
export async function POST(req: NextRequest) {
  if (!isCallerAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Admin PIN required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const pin = (body.pin || '').toString().trim();
    const label = (body.label || '').toString().trim();
    const role = body.role === 'ADMIN' ? 'ADMIN' : 'USER';

    const result = createAuthPin(pin, label, role);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      pins: getAllAuthPins()
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create PIN';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PATCH /api/auth/pins - Toggle active status (Admin only)
export async function PATCH(req: NextRequest) {
  if (!isCallerAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Admin PIN required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const pin = (body.pin || '').toString().trim();
    const isActive = Boolean(body.is_active);

    const result = toggleAuthPinStatus(pin, isActive);
    return NextResponse.json({
      success: result.success,
      message: result.message,
      pins: getAllAuthPins()
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to toggle status';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/auth/pins - Delete PIN (Admin only)
export async function DELETE(req: NextRequest) {
  if (!isCallerAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Admin PIN required.' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    let pin = url.searchParams.get('pin') || '';
    if (!pin) {
      try {
        const body = await req.json();
        pin = body?.pin || '';
      } catch {}
    }

    const result = deleteAuthPin(pin);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      pins: getAllAuthPins()
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete PIN';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
