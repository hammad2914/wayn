import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'teal' | 'green' | 'amber' | 'red' | 'purple' | 'default';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}) => {
  const variants = {
    teal: 'bg-teal-400/15 text-teal-400 border border-teal-400/30',
    green: 'bg-green-500/15 text-green-400 border border-green-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    red: 'bg-red-500/15 text-red-400 border border-red-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    default: 'bg-white/5 text-slate-400 border border-white/10',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
};
