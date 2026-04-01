import { useState, useEffect } from 'react';

export function useBreakpoint() {
  const [winW, setWinW] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const fn = () => setWinW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  return {
    winW,
    isMobile: winW < 640,   // phones
    isTablet: winW < 1024,  // tablets / small laptops
    isMd: winW < 768,       // standard mobile breakpoint
  };
}
