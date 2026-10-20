import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.'
  });

  response.cookies.delete('auth_session_id');
  response.cookies.delete('auth_pin_session');
  return response;
}
