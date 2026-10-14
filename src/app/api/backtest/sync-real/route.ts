import { NextRequest, NextResponse } from 'next/server';
import { getDb, getAllBacktestTrades, getBacktestStats, insertSignal } from '@/lib/db';
import { fetchRealCandles, backtestCbdrOnCandles } from '@/lib/cbdrRealDataEngine';
import { BacktestTradeRecord, Signal } from '@/types';
import { broadcastSSE } from '@/lib/eventBroadcaster';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const customApiKey = body.apiKey || undefined;
    const requestedSymbols = body.symbols || [
      'EURUSD',
      'GBPUSD',
      'USDJPY',
      'USDCHF',
      'AUDUSD',
      'USDCAD',
      'NZDUSD',
      'GBPNZD',
      'GBPCHF',
      'GBPJPY',
      'EURJPY',
      'EURGBP',
      'XAUUSD'
    ];

    const db = getDb();
    let totalCompleted = 0;
    let totalActiveLive = 0;
    const errors: string[] = [];
    const generatedActiveSignals: Signal[] = [];

    // Clear existing real-market backtest trades if requested or resetFirst
    if (body.resetFirst) {
      db.prepare("DELETE FROM backtest_trades WHERE id LIKE 'real_bt_%' OR id LIKE 'bt_trade_%' OR id LIKE 'bt_sig_demo_%'").run();
    }
    
    // Always refresh real active signals in signals table
    db.prepare("DELETE FROM signals WHERE id LIKE 'sig_real_%'").run();

    const provider = 'TRADINGVIEW';

    for (const symbol of requestedSymbols) {
      try {
        const candles = await fetchRealCandles(symbol, customApiKey, 200, provider);
        if (candles.length > 0) {
          const { completedTrades, activeLiveTrades } = backtestCbdrOnCandles(symbol, candles);
          
          // 1. Save Completed Trades (Hit TP or SL) to Backtest Database
          for (const t of completedTrades) {
            const exitPrice = t.exit_price || (t.outcome === 'WIN' ? t.tp1 : t.sl);
            const record: BacktestTradeRecord = {
              id: t.id,
              symbol: t.symbol,
              strategy: 'CBDR',
              action: t.action,
              timeframe: '15m',
              entry: t.entry,
              sl: t.sl,
              tp1: t.tp1,
              tp2: t.tp2,
              exit_price: exitPrice,
              risk_percent: t.risk_percent,
              defensive_state: 'NORMAL',
              calculated_lot_size: t.calculated_lot_size,
              risk_amount_usd: 1000,
              outcome: t.outcome,
              realized_pnl: t.realized_pnl,
              riskRewardAchieved: t.riskRewardAchieved,
              trading_day: t.trading_day,
              session: t.session,
              date_executed: t.date_executed,
              created_at: new Date(t.date_executed).toISOString(),
              notes: t.notes,
              isCbdrValidDay: t.isCbdrValidDay
            };

            db.prepare(`
              INSERT OR REPLACE INTO backtest_trades (
                id, symbol, strategy, action, timeframe, entry, sl, tp1, tp2,
                risk_percent, defensive_state, calculated_lot_size, risk_amount_usd,
                outcome, exit_price, realized_pnl, risk_reward_achieved, trading_day, session,
                date_executed, created_at, notes, is_cbdr_valid_day
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              record.id,
              record.symbol,
              record.strategy,
              record.action,
              record.timeframe,
              record.entry,
              record.sl,
              record.tp1,
              record.tp2 || null,
              record.risk_percent,
              record.defensive_state,
              record.calculated_lot_size,
              record.risk_amount_usd,
              record.outcome,
              exitPrice,
              record.realized_pnl || 0,
              record.riskRewardAchieved,
              record.trading_day,
              record.session || 'London',
              record.date_executed,
              record.created_at,
              record.notes || '',
              record.isCbdrValidDay ? 1 : 0
            );

            totalCompleted++;
          }

          // 2. Save Active Unresolved Trades (Not yet hit TP or SL) to Live Signals Table
          for (const liveSig of activeLiveTrades) {
            insertSignal(liveSig);
            broadcastSSE('NEW_SIGNAL', liveSig);
            generatedActiveSignals.push(liveSig);
            totalActiveLive++;
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${symbol}: ${msg}`);
      }
    }

    const stats = getBacktestStats();
    const trades = getAllBacktestTrades(500);

    return NextResponse.json({
      success: true,
      message: `Sync complete: ${totalCompleted} completed trades archived in Backtest, ${totalActiveLive} active unresolved setups placed into Live Trades.`,
      totalGenerated: totalCompleted,
      totalCompleted,
      totalActiveLive,
      activeLiveTrades: generatedActiveSignals,
      errors: errors.length > 0 ? errors : undefined,
      stats,
      tradesCount: trades.length
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to execute real market backtest';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function GET() {
  const stats = getBacktestStats();
  const trades = getAllBacktestTrades(500);
  return NextResponse.json({
    success: true,
    stats,
    trades
  });
}
