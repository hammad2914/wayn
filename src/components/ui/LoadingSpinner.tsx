import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-[2px]',
    md: 'w-6 h-6 border-[2.5px]',
    lg: 'w-10 h-10 border-[3px]',
  };

  return (
    <div
      className={`${sizes[size]} rounded-full border-white/20 border-t-white animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};
