import { TradingSession } from '@/types';

export interface SessionClocks {
  nyTime: string;          // e.g. "08:22:28 AM"
  nyTimeWithTz: string;    // e.g. "08:22:28 AM NY"
  istTime: string;         // e.g. "05:52:28 PM IST"
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
    nyDateStr,
    dayOfWeekName,
    activeSessions,
    tzLabel: 'New York / Indian Time'
  };
}

export function getTradingSessions(now: Date = new Date()): TradingSession[] {
  // Convert current time to decimal hours in America/New_York
  const nyDateStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const nyDate = new Date(nyDateStr);
  const hours = nyDate.getHours();
  const minutes = nyDate.getMinutes();
  const currentNyHours = hours + (minutes / 60);

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

  // 1. Sydney: 17:00 - 02:00 NY Time [05:00 PM - 02:00 AM NY / 03:30 AM - 12:30 PM IST]
  const sydneyStart = 17.0;
  const sydneyEnd = 2.0;
  const isSydneyActive = isTimeInRange(currentNyHours, sydneyStart, sydneyEnd);

  // 2. Tokyo / Asian: 19:00 - 04:00 NY Time [07:00 PM - 04:00 AM NY / 05:30 AM - 02:30 PM IST]
  const tokyoStart = 19.0;
  const tokyoEnd = 4.0;
  const isTokyoActive = isTimeInRange(currentNyHours, tokyoStart, tokyoEnd);

  // 3. CBDR / London Trading Window: strictly 03:00 AM - 11:45 AM NY Time [12:30 PM - 09:15 PM IST]
  const londonStart = 3.0;
  const londonEnd = 11.75; // 11:45 AM NY Time
  const isLondonActive = isTimeInRange(currentNyHours, londonStart, londonEnd);

  // 4. New York Session: 08:00 AM - 05:00 PM NY Time [05:30 PM - 02:30 AM IST]
  const nyStart = 8.0;
  const nyEnd = 17.0;
  const isNyActive = isTimeInRange(currentNyHours, nyStart, nyEnd);

  // 5. NY Open Kill Zone: 09:30 AM - 12:00 PM NY Time [07:00 PM - 09:30 PM IST]
  const nyKZStart = 9.5;
  const nyKZEnd = 12.0;
  const isNyKZActive = isTimeInRange(currentNyHours, nyKZStart, nyKZEnd);

  return [
    {
      key: 'LONDON',
      name: 'CBDR / London',
      location: 'London (CBDR Window)',
      timeNY: '03:00 AM – 11:45 AM NY',
      timeEST: '03:00 AM – 11:45 AM NY',
      timeIST: '12:30 PM – 09:15 PM IST',
      timeUTC: '12:30 PM – 09:15 PM IST',
      isActive: isLondonActive,
      isUpcoming: !isLondonActive && currentNyHours < londonStart && currentNyHours >= 0,
      progressPercent: isLondonActive ? getProgress(currentNyHours, londonStart, londonEnd) : 0,
      timeRemaining: isLondonActive ? getTimeRemaining(currentNyHours, londonEnd) : 'Window: 03:00 AM – 11:45 AM NY'
    },
    {
      key: 'NEW_YORK',
      name: 'New York Session',
      location: 'New York, US',
      timeNY: '08:00 AM – 05:00 PM NY',
      timeEST: '08:00 AM – 05:00 PM NY',
      timeIST: '05:30 PM – 02:30 AM IST',
      timeUTC: '05:30 PM – 02:30 AM IST',
      isActive: isNyActive,
      isUpcoming: !isNyActive && currentNyHours < nyStart && currentNyHours >= 3,
      progressPercent: isNyActive ? getProgress(currentNyHours, nyStart, nyEnd) : 0,
      timeRemaining: isNyActive ? getTimeRemaining(currentNyHours, nyEnd) : 'Opens at 08:00 AM NY'
    },
    {
      key: 'NY_OPEN_KZ',
      name: 'NY Index Killzone',
      location: 'Wall Street Open',
      timeNY: '09:30 AM – 12:00 PM NY',
      timeEST: '09:30 AM – 12:00 PM NY',
      timeIST: '07:00 PM – 09:30 PM IST',
      timeUTC: '07:00 PM – 09:30 PM IST',
      isActive: isNyKZActive,
      isUpcoming: !isNyKZActive && currentNyHours < nyKZStart && currentNyHours >= 7,
      progressPercent: isNyKZActive ? getProgress(currentNyHours, nyKZStart, nyKZEnd) : 0,
      timeRemaining: isNyKZActive ? getTimeRemaining(currentNyHours, nyKZEnd) : 'Opens at 09:30 AM NY'
    },
    {
      key: 'TOKYO',
      name: 'Asian / Tokyo',
      location: 'Tokyo, JP',
      timeNY: '07:00 PM – 04:00 AM NY',
      timeEST: '07:00 PM – 04:00 AM NY',
      timeIST: '05:30 AM – 02:30 PM IST',
      timeUTC: '05:30 AM – 02:30 PM IST',
      isActive: isTokyoActive,
      isUpcoming: !isTokyoActive && currentNyHours < tokyoStart && currentNyHours >= 14,
      progressPercent: isTokyoActive ? getProgress(currentNyHours, tokyoStart, tokyoEnd) : 0,
      timeRemaining: isTokyoActive ? getTimeRemaining(currentNyHours, tokyoEnd) : 'Opens at 07:00 PM NY'
    },
    {
      key: 'SYDNEY',
      name: 'Sydney Session',
      location: 'Sydney, AU',
      timeNY: '05:00 PM – 02:00 AM NY',
      timeEST: '05:00 PM – 02:00 AM NY',
      timeIST: '03:30 AM – 12:30 PM IST',
      timeUTC: '03:30 AM – 12:30 PM IST',
      isActive: isSydneyActive,
      isUpcoming: !isSydneyActive && currentNyHours < sydneyStart && currentNyHours >= 12,
      progressPercent: isSydneyActive ? getProgress(currentNyHours, sydneyStart, sydneyEnd) : 0,
      timeRemaining: isSydneyActive ? getTimeRemaining(currentNyHours, sydneyEnd) : 'Opens at 05:00 PM NY'
    }
  ];
}
