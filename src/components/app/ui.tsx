import React from 'react';
import { COUNTRIES } from './shared';
import { useLanguage } from '../../contexts/LanguageContext';

/** The app's line icons: one stroke style, drawn in the text colour */
const PATHS = {
  today: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>,
  addr:  <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  route: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" /></>,
  user:  <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
};
export const Icon: React.FC<{ name: keyof typeof PATHS }> = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {PATHS[name]}
  </svg>
);

export const CountrySelect: React.FC<{ value: string; onChange: (v: string) => void; lang: string }> = ({ value, onChange, lang }) => (
  <select className="ap-in" value={value} onChange={e => onChange(e.target.value)}>
    {COUNTRIES.map(([code, en, ar]) => <option key={code} value={code}>{lang === 'ar' ? ar : en}</option>)}
  </select>
);


export const LangSwitch: React.FC = () => {
  const { lang, setLang } = useLanguage();
  return (
    <div className="ap-lang">
      <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
      <button className={lang === 'ar' ? 'on' : ''} onClick={() => setLang('ar')}>عربي</button>
    </div>
  );
};

