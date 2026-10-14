import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'rose' | 'amber' | 'cyan' | 'purple' | 'slate' | 'blue' | 'indigo' | 'teal' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
}

export function Badge({
  children,
  variant = 'slate',
  size = 'md',
  className = '',
  dot = false,
}: BadgeProps) {
  const variantStyles: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
    rose: 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
    amber: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
    cyan: 'bg-cyan-50 text-cyan-800 border-cyan-300 font-bold',
    purple: 'bg-purple-50 text-purple-800 border-purple-300 font-bold',
    blue: 'bg-blue-50 text-blue-800 border-blue-300 font-bold',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-300 font-bold',
    teal: 'bg-teal-50 text-teal-800 border-teal-300 font-bold',
    slate: 'bg-slate-100 text-slate-800 border-slate-300 font-semibold',
    outline: 'bg-transparent text-slate-700 border-slate-300 font-medium',
  };

  const dotColors: Record<string, string> = {
    emerald: 'bg-emerald-600',
    rose: 'bg-rose-600',
    amber: 'bg-amber-600',
    cyan: 'bg-cyan-600',
    purple: 'bg-purple-600',
    blue: 'bg-blue-600',
    indigo: 'bg-indigo-600',
    teal: 'bg-teal-600',
    slate: 'bg-slate-600',
    outline: 'bg-slate-600',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-bold',
    md: 'text-xs px-2.5 py-1 font-bold',
    lg: 'text-sm px-3 py-1.5 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all ${variantStyles[variant] || variantStyles.slate} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full animate-pulse ${dotColors[variant] || dotColors.slate}`}
        />
      )}
      {children}
    </span>
  );
}
