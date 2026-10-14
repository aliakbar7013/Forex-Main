import { NextRequest, NextResponse } from 'next/server';
import { testTelegramConnection } from '@/lib/telegramEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const botToken = body.bot_token || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = body.chat_id || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json({
        success: false,
        error: 'Please provide both Telegram Bot Token and Chat ID to run the test.'
      }, { status: 400 });
    }

    const testResult = await testTelegramConnection(botToken, chatId);

    if (!testResult.success) {
      return NextResponse.json({
        success: false,
        error: testResult.message,
        details: testResult.data
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test notification delivered successfully to your Telegram account / group!'
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to send test Telegram message.'
    }, { status: 500 });
  }
}
