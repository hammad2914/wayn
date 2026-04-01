import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full rounded-xl glass border border-white/10 bg-transparent
              px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500
              transition-all duration-200 outline-none
              focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 focus:shadow-[0_0_12px_rgba(0,212,255,0.15)]
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
