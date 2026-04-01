import React from 'react';
import { Icon } from '@iconify/react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '64px 32px', textAlign: 'center',
  }}>
    <div style={{
      width: 72, height: 72, borderRadius: '50%',
      background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: '20px',
    }}>
      <Icon icon={icon} width={36} color="rgba(245,200,66,0.6)" />
    </div>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>
      {title}
    </h3>
    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', maxWidth: '320px', margin: '0 0 24px', lineHeight: 1.6 }}>
      {description}
    </p>
    {action}
  </div>
);
