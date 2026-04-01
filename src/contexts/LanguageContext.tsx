import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translations } from '../translations';
import type { Lang, TranslationKey } from '../translations';

interface LanguageContextType {
  lang:    Lang;
  setLang: (l: Lang) => void;
  t:       (key: TranslationKey) => string;
  isRTL:   boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('wayn-lang') as Lang) ?? 'en';
  });

  const isRTL = lang === 'ar';

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('wayn-lang', l);
  }, []);

  // Apply dir + lang attribute to <html> so CSS logical properties and browser behaviour work
  useEffect(() => {
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  const t = useCallback(
    (key: TranslationKey) => translations[lang][key] ?? key,
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
};
