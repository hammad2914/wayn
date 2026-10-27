import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, right }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
    <div>
      <h2 style={{
        fontFamily: "'Readex Pro', sans-serif", fontSize: '20px', fontWeight: 700,
        color: '#0E1A17', margin: 0, lineHeight: 1.2,
      }}>
        {title}
      </h2>
      {subtitle && <p style={{ color: 'rgba(14,26,23,0.6)', fontSize: '13px', margin: '6px 0 0 15px' }}>{subtitle}</p>}
    </div>
    {right && <div>{right}</div>}
  </div>
);
