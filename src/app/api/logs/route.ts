import { NextRequest, NextResponse } from 'next/server';
import { getAllTradeLogs, getAllWebhookLogs } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result: { tradeLogs?: any[]; webhookLogs?: any[] } = {};

    if (type === 'all' || type === 'trades') {
      result.tradeLogs = getAllTradeLogs(limit);
    }
    if (type === 'all' || type === 'webhooks') {
      result.webhookLogs = getAllWebhookLogs(limit);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
