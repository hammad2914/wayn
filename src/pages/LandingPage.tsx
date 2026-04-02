import React from 'react';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Features } from '../components/landing/Features';
import { StatsBar } from '../components/landing/StatsBar';
import { CtaFooter } from '../components/landing/CtaFooter';

export const LandingPage: React.FC = () => {
  return (
      <div style={{ background: '#0A0E27', minHeight: '100vh', overflowX: 'hidden' }}>
        <LandingNavbar />
        <HeroSection />
        <HowItWorks />
        <Features />
        <StatsBar />
        <CtaFooter />
      </div>
  );
};
