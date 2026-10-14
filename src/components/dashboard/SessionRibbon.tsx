'use client';

import React from 'react';
import { TradingSession } from '@/types';
import { Clock, Globe } from 'lucide-react';

interface SessionRibbonProps {
  sessions: TradingSession[];
}

export function SessionRibbonComponent({ sessions }: SessionRibbonProps) {
  return (
    <div className="w-full bg-slate-100/90 border-b border-slate-200 py-1.5 px-3 sm:px-6 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-hidden">
        
        {/* Left Label */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider shrink-0">
          <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="hidden sm:inline font-extrabold">Macro Sessions</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-200 font-bold">
            NY &amp; IST
          </span>
        </div>

        {/* Scrollable Session Badges (No Text Distortion) */}
        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          {sessions.map((session) => {
            const isLondon = session.key === 'LONDON';
            const isNY = session.key === 'NEW_YORK' || session.key === 'NY_OPEN_KZ';
            const isTokyo = session.key === 'TOKYO';

            let borderColor = 'border-slate-200 bg-white text-slate-700 shadow-2xs';

            if (session.isActive) {
              if (isLondon) {
                borderColor = 'border-teal-400 bg-teal-50 text-teal-950 shadow-xs ring-1 ring-teal-300';
              } else if (isNY) {
                borderColor = 'border-purple-400 bg-purple-50 text-purple-950 shadow-xs ring-1 ring-purple-300';
              } else if (isTokyo) {
                borderColor = 'border-amber-400 bg-amber-50 text-amber-950 shadow-xs ring-1 ring-amber-300';
              } else {
                borderColor = 'border-emerald-400 bg-emerald-50 text-emerald-950 shadow-xs ring-1 ring-emerald-300';
              }
            }

            return (
              <div
                key={session.key}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all shrink-0 whitespace-nowrap ${borderColor}`}
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  {session.isActive ? (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                    </span>
                  ) : (
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                  <span className="font-bold text-[11px] sm:text-xs">
                    {session.name}
                  </span>
                </div>

                <span className="text-[10px] font-mono opacity-85 font-medium shrink-0">
                  {session.timeNY}
                </span>

                {session.isActive && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 font-bold text-white shadow-2xs tabular-nums shrink-0">
                    {session.progressPercent}%
                  </span>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export const SessionRibbon = React.memo(SessionRibbonComponent);
