import { Signal } from '@/types';
import { getTelegramSettings } from './db';
import { getSignalTradingDay } from './strategyValidator';

/**
 * Telegram Notification Engine
 * Sends instant real-time trade signals and TP/SL execution notifications to Telegram.
 */

export interface TelegramSendMessageOptions {
  bot_token?: string;
  chat_id?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
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
 * Formats a Signal into a clean, professional HTML Telegram message
 */
export function formatSignalTelegramHtml(signal: Signal): string {
  const isBuy = signal.action === 'BUY';
  const actionEmoji = isBuy ? '🟢 <b>BUY (LONG)</b>' : '🔴 <b>SELL (SHORT)</b>';
  const directionIcon = isBuy ? '📈' : '📉';
  const { dayName, dateFormatted, isCbdrValid } = getSignalTradingDay(signal);

  const createdDate = new Date(signal.created_at);
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

  const lines = [
    `⚡ <b>APEX QUANT SIGNAL ALERT</b> ⚡`,
    ``,
    `📊 <b>Pair:</b> <code>#${signal.symbol}</code> ${directionIcon}`,
    `🎯 <b>Action:</b> ${actionEmoji}`,
    `🧩 <b>Strategy:</b> <code>${signal.strategy}</code> (${signal.timeframe})`,
    ``,
    `📍 <b>Limit Entry:</b> <code>${signal.entry}</code>`,
    `🛑 <b>Stop Loss (Exit):</b> <code>${signal.sl}</code> (<i>${signal.sl_distance_pips_points} pips</i>)`,
    `🎯 <b>Target (TP1 1:3):</b> <code>${signal.tp1}</code> (<i>1:${signal.primary_risk_reward || 3.0} RR</i>)`,
    signal.tp2 ? `🎯 <b>Target (TP2):</b> <code>${signal.tp2}</code> (<i>1:${((signal.primary_risk_reward || 2.0) * 1.5).toFixed(1)} RR</i>)` : '',
    signal.tp3 ? `🎯 <b>Target (TP3 Runner):</b> <code>${signal.tp3}</code> (<i>1:${((signal.primary_risk_reward || 2.0) * 2.5).toFixed(1)} RR</i>)` : '',
    ``,
    `📦 <b>Recommended Lots:</b> <code>${signal.calculated_lot_size} Lots</code> (<i>${signal.risk_percent}% Risk</i>)`,
    `🛡️ <b>Defensive Tier:</b> <code>${signal.defensive_state}</code>`,
    `⏰ <b>Session Window:</b> ${signal.session_name || 'Active Session'} (<i>${nyTime} NY • ${istTime} IST</i>)`,
    `📅 <b>Trading Day:</b> ${dayName} (${dateFormatted}) ${signal.strategy === 'CBDR' ? (isCbdrValid ? '✅ Valid CBDR Day' : '⚠️ Carry-over Position') : ''}`,
    ``,
    `🌐 <b>IPDA Macro Bias:</b> <code>${signal.validation?.overallStatus || 'APPROVED'}</code>`,
    `<i>Apex ICT Quantitative Engine • Auto-Synced</i>`
  ];

  return lines.filter(line => line !== '').join('\n');
}

/**
 * Formats a Trade Resolution (Win / Loss / BE) into a Telegram message
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
    params.notes ? `📝 <b>Details:</b> <i>${params.notes}</i>` : '',
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
 * Sends a trade resolution alert to Telegram if enabled
 */
export async function sendTelegramResolutionAlert(params: {
  symbol: string;
  strategy?: string;
  action?: string;
  outcome: 'WIN' | 'LOSS' | 'BE';
  exitPrice: number;
  pnlUsd?: number;
  rrAchieved?: number;
  notes?: string;
}): Promise<boolean> {
  try {
    const settings = getTelegramSettings();
    if (!settings.enabled || !settings.notify_trade_resolutions) {
      return false;
    }

    const html = formatResolutionTelegramHtml(params);
    const res = await sendTelegramRawMessage(html, {
      bot_token: settings.bot_token,
      chat_id: settings.chat_id
    });

    return res.success;
  } catch (err) {
    console.error('Error sending Telegram resolution alert:', err);
    return false;
  }
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
    `You will receive instant alerts for every new signal, limit entry, stop loss, and target hit!`
  ].join('\n');

  return sendTelegramRawMessage(testHtml, {
    bot_token: botToken,
    chat_id: chatId
  });
}
