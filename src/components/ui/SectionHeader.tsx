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
        fontFamily: "'Sora', sans-serif", fontSize: '20px', fontWeight: 700,
        color: '#FFFFFF', margin: 0, lineHeight: 1.2,
        borderLeft: '3px solid #F5C842', paddingLeft: '12px',
      }}>
        {title}
      </h2>
      {subtitle && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '6px 0 0 15px' }}>{subtitle}</p>}
    </div>
    {right && <div>{right}</div>}
  </div>
);
