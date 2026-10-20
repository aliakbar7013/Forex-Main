import { Signal } from '@/types';
import { getTelegramSettings } from './db';
import { getSignalTradingDay } from './strategyValidator';
import { getPipSize } from './cbdrRealDataEngine';

/**
 * Telegram Notification Engine
 * Sends instant real-time trade signals to Telegram.
 * Trade resolution (TP/SL hits) notifications are disabled per user requirements
 * so the channel stays completely clean with actionable entries only.
 */

export interface TelegramSendMessageOptions {
  bot_token?: string;
  chat_id?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

function escapeTelegramHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Send raw message via Telegram Bot API
 */
export async function sendTelegramRawMessage(
  textHtml: string,
  options?: TelegramSendMessageOptions
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const settings = getTelegramSettings();
    const botToken = options?.bot_token || settings.bot_token;
    const chatId = options?.chat_id || settings.chat_id;

    if (!botToken || !chatId) {
      return {
        success: false,
        message: 'Telegram bot token or chat ID is missing.'
      };
    }

    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();

    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const body = {
      chat_id: cleanChatId,
      text: textHtml,
      parse_mode: options?.parse_mode || 'HTML',
      disable_web_page_preview: true
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.warn('Telegram API error:', result);
      return {
        success: false,
        message: result.description || `Telegram API responded with HTTP status ${response.status}`,
        data: result
      };
    }

    return {
      success: true,
      message: 'Message sent successfully to Telegram',
      data: result
    };
  } catch (err: any) {
    console.error('Failed to send Telegram message:', err);
    return {
      success: false,
      message: err.message || 'Unknown network error communicating with Telegram API'
    };
  }
}

/**
 * Formats a Signal into an institutional, high-clarity HTML Telegram message
 * with Entry, Stop Loss, Take Profit, and strict Risk/Reward ratio.
 */
export function formatSignalTelegramHtml(signal: Signal): string {
  const isBuy = signal.action === 'BUY';
  const orderType = isBuy ? 'BUY LIMIT' : 'SELL LIMIT';
  const actionEmoji = isBuy ? '🟢 <b>BUY (LONG)</b>' : '🔴 <b>SELL (SHORT)</b>';
  const directionIcon = isBuy ? '📈' : '📉';
  const { dayName, dateFormatted, isCbdrValid } = getSignalTradingDay(signal);

  const createdDate = new Date(signal.created_at || Date.now());
  const nyTime = createdDate.toLocaleTimeString('en-US', { 
    timeZone: 'America/New_York', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
  const istTime = createdDate.toLocaleTimeString('en-US', { 
    timeZone: 'Asia/Kolkata', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });

  const pipFactor = getPipSize(signal.symbol);
  const slPips = signal.sl_distance_pips_points 
    ? Number(signal.sl_distance_pips_points).toFixed(1)
    : (Math.abs(signal.entry - signal.sl) / pipFactor).toFixed(1);

  const tpPips = (Math.abs(signal.tp1 - signal.entry) / pipFactor).toFixed(1);
  const rrRatio = signal.primary_risk_reward ? `1:${signal.primary_risk_reward}` : '1:3.0';

  const cleanNotes = signal.notes ? escapeTelegramHtml(signal.notes) : '';

  const lines = [
    `⚡ <b>NEW ICT TRADE SIGNAL</b> ⚡`,
    ``,
    `📊 <b>Pair:</b> <code>#${signal.symbol}</code> ${directionIcon}`,
    `🎯 <b>Order Type:</b> <b>${orderType}</b> (${actionEmoji})`,
    `🧩 <b>Strategy:</b> <code>${signal.strategy}</code> (${signal.timeframe || '15m'})`,
    ``,
    `📍 <b>Entry Price:</b> <code>${signal.entry}</code>`,
    `🛑 <b>Stop Loss (SL):</b> <code>${signal.sl}</code> (<b>-${slPips} pips</b>)`,
    `🎯 <b>Take Profit (TP):</b> <code>${signal.tp1}</code> (<b>+${tpPips} pips</b>)`,
    `⚖️ <b>Risk to Reward:</b> <b>${rrRatio} Strict RR</b>`,
    signal.tp2 ? `🎯 <b>Take Profit 2 (Runner):</b> <code>${signal.tp2}</code>` : '',
    signal.tp3 ? `🎯 <b>Take Profit 3 (Runner):</b> <code>${signal.tp3}</code>` : '',
    ``,
    `📦 <b>Recommended Lot:</b> <code>${signal.calculated_lot_size || 0.1} Lots</code> (<i>${signal.risk_percent || 1}% Risk</i>)`,
    `🛡️ <b>Risk Tier:</b> <code>${signal.defensive_state || 'NORMAL'}</code>`,
    `⏰ <b>Session:</b> ${escapeTelegramHtml(signal.session_name || 'London / NY Open')} (<i>${nyTime} NY • ${istTime} IST</i>)`,
    `📅 <b>Trading Day:</b> ${dayName} (${dateFormatted}) ${signal.strategy === 'CBDR' ? (isCbdrValid ? '✅ Valid CBDR Day' : '⚠️ Carry-over Position') : ''}`,
    cleanNotes ? `💡 <b>Confluence / Notes:</b> <i>${cleanNotes}</i>` : '',
    ``,
    `<i>Apex ICT Quantitative Engine • High-Probability Execution</i>`
  ];

  return lines.filter(line => line !== '').join('\n');
}

/**
 * Formats a Trade Resolution (Win / Loss / BE) into a Telegram message
 * Kept for archiving / optional reference
 */
export function formatResolutionTelegramHtml(params: {
  symbol: string;
  strategy?: string;
  action?: string;
  outcome: 'WIN' | 'LOSS' | 'BE';
  exitPrice: number;
  pnlUsd?: number;
  rrAchieved?: number;
  notes?: string;
}): string {
  const isWin = params.outcome === 'WIN';
  const header = isWin 
    ? `🎉 <b>TRADE RESOLVED: TARGET HIT (WIN)</b> 🎉` 
    : `⚠️ <b>TRADE RESOLVED: STOP LOSS HIT (LOSS)</b> ⚠️`;

  const rrStr = isWin ? `+${params.rrAchieved || 3.0}R` : `-1.0R`;

  const lines = [
    header,
    ``,
    `📊 <b>Instrument:</b> <code>#${params.symbol}</code>`,
    params.action ? `🎯 <b>Direction:</b> <code>${params.action}</code>` : '',
    params.strategy ? `🧩 <b>Strategy:</b> <code>${params.strategy}</code>` : '',
    `🏆 <b>Outcome:</b> <b>${params.outcome} (${rrStr})</b>`,
    `📍 <b>Exit Price:</b> <code>${params.exitPrice}</code>`,
    params.notes ? `📝 <b>Details:</b> <i>${escapeTelegramHtml(params.notes)}</i>` : '',
    ``,
    `📁 <i>Record has been permanently archived in the Backtest Database.</i>`
  ];

  return lines.filter(line => line !== '').join('\n');
}

/**
 * Sends a real-time signal alert to Telegram if enabled
 */
export async function sendTelegramSignalAlert(signal: Signal): Promise<boolean> {
  try {
    const settings = getTelegramSettings();
    if (!settings.enabled || !settings.notify_new_signals) {
      return false;
    }

    const html = formatSignalTelegramHtml(signal);
    const res = await sendTelegramRawMessage(html, {
      bot_token: settings.bot_token,
      chat_id: settings.chat_id
    });

    return res.success;
  } catch (err) {
    console.error('Error sending Telegram signal alert:', err);
    return false;
  }
}

/**
 * Sends a trade resolution alert to Telegram.
 * NOTE: User explicitly disabled TP hit and SL hit notifications for Telegram.
 * Telegram is strictly reserved for new trade signal dispatches with Entry, SL, TP, and RR.
 */
export async function sendTelegramResolutionAlert(_params: {
  symbol: string;
  strategy?: string;
  action?: string;
  outcome: 'WIN' | 'LOSS' | 'BE';
  exitPrice: number;
  pnlUsd?: number;
  rrAchieved?: number;
  notes?: string;
}): Promise<boolean> {
  // Always return false: TP and SL hit alerts are permanently disabled for Telegram per user specification.
  return false;
}

/**
 * Test Telegram Connection
 */
export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; message: string; data?: any }> {
  const testHtml = [
    `🤖 <b>APEX SIGNALS TELEGRAM BOT CONNECTED</b> 🚀`,
    ``,
    `✅ <b>Connection Test:</b> <i>SUCCESSFUL</i>`,
    `🕒 <b>Timestamp:</b> <code>${new Date().toISOString()}</code>`,
    ``,
    `Your Telegram Bot is now connected to the <b>Apex ICT Quantitative Trading Dashboard</b>.`,
    `You will receive instant alerts whenever a new trade signal is generated, complete with:`,
    `• Pair & Order Type (Buy/Sell Limit)`,
    `• Limit Entry Price`,
    `• Stop Loss (SL) with exact pip distance`,
    `• Take Profit (TP) with exact pip gain`,
    `• Strict 1:3 Risk/Reward (RR) calculation`,
    `• Calculated Lot Size based on your Risk %`,
    ``,
    `<i>Note: TP/SL hit resolution notifications are disabled to keep your Telegram channel clean.</i>`
  ].join('\n');

  return sendTelegramRawMessage(testHtml, {
    bot_token: botToken,
    chat_id: chatId
  });
}
