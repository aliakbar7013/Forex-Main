import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllBacktestTrades, 
  insertBacktestTrade, 
  deleteBacktestTrade, 
  getBacktestStats,
  getDb,
  seedInitialBacktestTrades
} from '@/lib/db';
import { BacktestTradeRecord, StrategyType, TradeAction } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const strategy = url.searchParams.get('strategy');
    const day = url.searchParams.get('day');
    const outcome = url.searchParams.get('outcome');
    const month = url.searchParams.get('month');
    const cbdrOnly = url.searchParams.get('cbdr_valid') === 'true';

    const db = getDb();
    let trades = getAllBacktestTrades(2000);

    // Auto-seed full 6-month dataset if empty or needs full 28-pair update
    if (trades.length < 800) {
      db.prepare('DELETE FROM backtest_trades').run();
      seedInitialBacktestTrades(db);
      trades = getAllBacktestTrades(2000);
    }

    if (strategy && strategy !== 'ALL') {
      trades = trades.filter(t => t.strategy.toUpperCase() === strategy.toUpperCase());
    }

    if (month && month !== 'ALL') {
      trades = trades.filter(t => t.date_executed.startsWith(month));
    }

    if (day && day !== 'ALL') {
      trades = trades.filter(t => t.trading_day.toLowerCase() === day.toLowerCase());
    }

    if (outcome && outcome !== 'ALL') {
      trades = trades.filter(t => t.outcome === outcome);
    }

    if (cbdrOnly) {
      trades = trades.filter(t => t.isCbdrValidDay);
    }

    const stats = getBacktestStats();

    return NextResponse.json({
      success: true,
      trades,
      stats,
      count: trades.length
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch backtest trades';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'RESET') {
      const db = getDb();
      db.prepare('DELETE FROM backtest_trades').run();
      seedInitialBacktestTrades(db);
      const stats = getBacktestStats();
      const trades = getAllBacktestTrades(2000);
      return NextResponse.json({ success: true, message: 'Backtest dataset reset to default', stats, trades });
    }

    const id = body.id || `bt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const trading_day = body.trading_day || 'Monday';
    const dayLower = trading_day.toLowerCase();
    const isCbdrValidDay = dayLower.includes('mon') || dayLower.includes('tue') || dayLower.includes('wed');

    const trade: BacktestTradeRecord = {
      id,
      signal_id: body.signal_id,
      symbol: (body.symbol || 'EURUSD').toUpperCase(),
      strategy: (body.strategy || 'CBDR') as StrategyType,
      action: (body.action || 'SELL') as TradeAction,
      timeframe: body.timeframe || '15m',
      entry: Number(body.entry || 0),
      sl: Number(body.sl || 0),
      tp1: Number(body.tp1 || 0),
      tp2: body.tp2 ? Number(body.tp2) : undefined,
      tp3: body.tp3 ? Number(body.tp3) : undefined,
      risk_percent: Number(body.risk_percent || 1.0),
      defensive_state: body.defensive_state || 'NORMAL',
      calculated_lot_size: Number(body.calculated_lot_size || 1.0),
      risk_amount_usd: Number(body.risk_amount_usd || 500),
      outcome: body.outcome || 'WIN',
      exit_price: body.exit_price ? Number(body.exit_price) : (body.outcome === 'WIN' ? Number(body.tp1 || 0) : body.outcome === 'LOSS' ? Number(body.sl || 0) : Number(body.entry || 0)),
      realized_pnl: Number(body.realized_pnl || 0),
      riskRewardAchieved: Number(body.riskRewardAchieved || 2.0),
      trading_day,
      isCbdrValidDay,
      session: body.session || 'London',
      date_executed: body.date_executed || now.split('T')[0],
      notes: body.notes,
      created_at: now
    };

    insertBacktestTrade(trade);
    const stats = getBacktestStats();

    return NextResponse.json({
      success: true,
      trade,
      stats
    }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to save backtest trade';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing trade id' }, { status: 400 });
    }

    const deleted = deleteBacktestTrade(id);
    const stats = getBacktestStats();

    return NextResponse.json({ success: deleted, stats });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to delete backtest trade';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
