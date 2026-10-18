import { TradingSession } from '@/types';

export interface SessionClocks {
  nyTime: string;          // e.g. "08:22:28 AM"
  nyTimeWithTz: string;    // e.g. "08:22:28 AM NY"
  istTime: string;         // e.g. "05:52:28 PM IST"
  utcTime?: string;        // e.g. "12:22:28 PM UTC"
  nyDateStr: string;
  dayOfWeekName: string;
  activeSessions: string[];
  tzLabel: string;
}

export function getCurrentMarketClocks(now: Date = new Date()): SessionClocks {
  // 1. New York Time (America/New_York)
  const nyTime = now.toLocaleTimeString('en-US', { 
    timeZone: 'America/New_York', 
    hour12: true, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  const nyTimeWithTz = `${nyTime} NY`;

  // 2. Indian Time (Asia/Kolkata)
  const istTime = now.toLocaleTimeString('en-IN', { 
    timeZone: 'Asia/Kolkata', 
    hour12: true, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

  // 3. UTC Time (LuxAlgo Base Timezone)
  const utcTime = now.toLocaleTimeString('en-US', {
    timeZone: 'UTC',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const nyDateStr = now.toLocaleDateString('en-US', { 
    timeZone: 'America/New_York', 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  const dayOfWeekName = now.toLocaleDateString('en-US', { 
    timeZone: 'America/New_York', 
    weekday: 'long' 
  });

  const sessions = getTradingSessions(now);
  const activeSessions = sessions.filter(s => s.isActive).map(s => s.name);

  return {
    nyTime,
    nyTimeWithTz,
    istTime,
    utcTime,
    nyDateStr,
    dayOfWeekName,
    activeSessions,
    tzLabel: 'LuxAlgo UTC / NY / IST'
  };
}

export function getTradingSessions(now: Date = new Date()): TradingSession[] {
  // Convert current time to UTC decimal hours matching LuxAlgo Pine Script: time(tf, session_str, "UTC")
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const currentUtcHours = utcHours + (utcMinutes / 60);

  // Helper to check range across midnight
  const isTimeInRange = (current: number, start: number, end: number) => {
    if (start <= end) {
      return current >= start && current < end;
    } else {
      // Wraps around midnight
      return current >= start || current < end;
    }
  };

  const getProgress = (current: number, start: number, end: number) => {
    let totalSpan = 0;
    let elapsed = 0;

    if (start <= end) {
      totalSpan = end - start;
      elapsed = current - start;
    } else {
      totalSpan = (24 - start) + end;
      elapsed = current >= start ? (current - start) : (24 - start + current);
    }

    if (totalSpan <= 0) return 0;
    const pct = Math.max(0, Math.min(100, (elapsed / totalSpan) * 100));
    return Math.round(pct);
  };

  const getTimeRemaining = (current: number, end: number) => {
    let diffHours = 0;
    if (current <= end) {
      diffHours = end - current;
    } else {
      diffHours = (24 - current) + end;
    }
    const h = Math.floor(diffHours);
    const m = Math.floor((diffHours - h) * 60);
    return `${h}h ${m}m remaining`;
  };

  // --------------------------------------------------------------------------
  // Exact LuxAlgo Sessions Settings (Pine Script: tz_incr = 0 UTC)
  // Session A: New York  '1300-2200' UTC (#ff5d00) -> 09:00 AM - 06:00 PM NY / 06:30 PM - 03:30 AM IST
  // Session B: London    '0700-1600' UTC (#2157f3) -> 03:00 AM - 12:00 PM NY / 12:30 PM - 09:30 PM IST
  // Session C: Tokyo     '0000-0900' UTC (#e91e63) -> 08:00 PM - 05:00 AM NY / 05:30 AM - 02:30 PM IST
  // Session D: Sydney    '2100-0600' UTC (#ffeb3b) -> 05:00 PM - 02:00 AM NY / 02:30 AM - 11:30 AM IST
  // --------------------------------------------------------------------------

  // 1. Session B: London ('0700-1600' UTC / 03:00 AM - 12:00 PM NY / 12:30 PM - 09:30 PM IST)
  const londonStart = 7.0;
  const londonEnd = 16.0;
  const isLondonActive = isTimeInRange(currentUtcHours, londonStart, londonEnd);

  // 2. Session A: New York ('1300-2200' UTC / 09:00 AM - 06:00 PM NY / 06:30 PM - 03:30 AM IST)
  const nyStart = 13.0;
  const nyEnd = 22.0;
  const isNyActive = isTimeInRange(currentUtcHours, nyStart, nyEnd);

  // 3. Session C: Tokyo / Asian ('0000-0900' UTC / 08:00 PM - 05:00 AM NY / 05:30 AM - 02:30 PM IST)
  const tokyoStart = 0.0;
  const tokyoEnd = 9.0;
  const isTokyoActive = isTimeInRange(currentUtcHours, tokyoStart, tokyoEnd);

  // 4. Session D: Sydney ('2100-0600' UTC / 05:00 PM - 02:00 AM NY / 02:30 AM - 11:30 AM IST)
  const sydneyStart = 21.0;
  const sydneyEnd = 6.0;
  const isSydneyActive = isTimeInRange(currentUtcHours, sydneyStart, sydneyEnd);

  // 5. Special Kill Zone: NY Open / Index Window (09:30 AM - 12:00 PM NY / 13:30 - 16:00 UTC / 07:00 PM - 09:30 PM IST)
  const nyKZStart = 13.5;
  const nyKZEnd = 16.0;
  const isNyKZActive = isTimeInRange(currentUtcHours, nyKZStart, nyKZEnd);

  return [
    {
      key: 'LONDON',
      name: 'London (LuxAlgo)',
      location: 'London Session (07:00 – 16:00 UTC)',
      timeNY: '03:00 AM – 12:00 PM NY',
      timeEST: '03:00 AM – 12:00 PM NY',
      timeIST: '12:30 PM – 09:30 PM IST',
      timeUTC: '07:00 – 16:00 UTC',
      isActive: isLondonActive,
      isUpcoming: !isLondonActive && currentUtcHours < londonStart && currentUtcHours >= 0,
      progressPercent: isLondonActive ? getProgress(currentUtcHours, londonStart, londonEnd) : 0,
      timeRemaining: isLondonActive ? getTimeRemaining(currentUtcHours, londonEnd) : 'Opens at 07:00 UTC (03:00 AM NY)'
    },
    {
      key: 'NEW_YORK',
      name: 'New York (LuxAlgo)',
      location: 'New York Session (13:00 – 22:00 UTC)',
      timeNY: '09:00 AM – 06:00 PM NY',
      timeEST: '09:00 AM – 06:00 PM NY',
      timeIST: '06:30 PM – 03:30 AM IST',
      timeUTC: '13:00 – 22:00 UTC',
      isActive: isNyActive,
      isUpcoming: !isNyActive && currentUtcHours < nyStart && currentUtcHours >= 7,
      progressPercent: isNyActive ? getProgress(currentUtcHours, nyStart, nyEnd) : 0,
      timeRemaining: isNyActive ? getTimeRemaining(currentUtcHours, nyEnd) : 'Opens at 13:00 UTC (09:00 AM NY)'
    },
    {
      key: 'NY_OPEN_KZ',
      name: 'NY Index Killzone',
      location: 'Wall Street Open (13:30 – 16:00 UTC)',
      timeNY: '09:30 AM – 12:00 PM NY',
      timeEST: '09:30 AM – 12:00 PM NY',
      timeIST: '07:00 PM – 09:30 PM IST',
      timeUTC: '13:30 – 16:00 UTC',
      isActive: isNyKZActive,
      isUpcoming: !isNyKZActive && currentUtcHours < nyKZStart && currentUtcHours >= 10,
      progressPercent: isNyKZActive ? getProgress(currentUtcHours, nyKZStart, nyKZEnd) : 0,
      timeRemaining: isNyKZActive ? getTimeRemaining(currentUtcHours, nyKZEnd) : 'Opens at 13:30 UTC (09:30 AM NY)'
    },
    {
      key: 'TOKYO',
      name: 'Tokyo (LuxAlgo)',
      location: 'Tokyo Session (00:00 – 09:00 UTC)',
      timeNY: '08:00 PM – 05:00 AM NY',
      timeEST: '08:00 PM – 05:00 AM NY',
      timeIST: '05:30 AM – 02:30 PM IST',
      timeUTC: '00:00 – 09:00 UTC',
      isActive: isTokyoActive,
      isUpcoming: !isTokyoActive && currentUtcHours >= 18,
      progressPercent: isTokyoActive ? getProgress(currentUtcHours, tokyoStart, tokyoEnd) : 0,
      timeRemaining: isTokyoActive ? getTimeRemaining(currentUtcHours, tokyoEnd) : 'Opens at 00:00 UTC (08:00 PM NY)'
    },
    {
      key: 'SYDNEY',
      name: 'Sydney (LuxAlgo)',
      location: 'Sydney Session (21:00 – 06:00 UTC)',
      timeNY: '05:00 PM – 02:00 AM NY',
      timeEST: '05:00 PM – 02:00 AM NY',
      timeIST: '02:30 AM – 11:30 AM IST',
      timeUTC: '21:00 – 06:00 UTC',
      isActive: isSydneyActive,
      isUpcoming: !isSydneyActive && currentUtcHours < sydneyStart && currentUtcHours >= 16,
      progressPercent: isSydneyActive ? getProgress(currentUtcHours, sydneyStart, sydneyEnd) : 0,
      timeRemaining: isSydneyActive ? getTimeRemaining(currentUtcHours, sydneyEnd) : 'Opens at 21:00 UTC (05:00 PM NY)'
    }
  ];
}
