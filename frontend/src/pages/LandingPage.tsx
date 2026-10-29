import React from 'react';
import { HeroConsole } from '../components/landing/HeroConsole';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Features } from '../components/landing/Features';
import { TryIt } from '../components/landing/TryIt';
import { Cities } from '../components/landing/Cities';
import { Faq } from '../components/landing/Faq';
import { Closing } from '../components/landing/Closing';

export const LandingPage: React.FC = () => {
  return (
      <div style={{ background: '#0A0E27', minHeight: '100vh', overflowX: 'clip' }}>
        <HeroConsole />
        <HowItWorks />
        <Features />
        <TryIt />
        <Cities />
        <Faq />
        <Closing />
      </div>
  );
};
