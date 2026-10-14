import { NextRequest, NextResponse } from 'next/server';
import { getTelegramSettings, saveTelegramSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = getTelegramSettings();
    return NextResponse.json({
      success: true,
      settings
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = saveTelegramSettings({
      bot_token: body.bot_token !== undefined ? String(body.bot_token) : undefined,
      chat_id: body.chat_id !== undefined ? String(body.chat_id) : undefined,
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
      notify_new_signals: body.notify_new_signals !== undefined ? Boolean(body.notify_new_signals) : undefined,
      notify_trade_resolutions: body.notify_trade_resolutions !== undefined ? Boolean(body.notify_trade_resolutions) : undefined
    });

    return NextResponse.json({
      success: true,
      message: 'Telegram notification settings saved successfully.',
      settings: updated
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
