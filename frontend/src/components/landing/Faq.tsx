import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../translations';
import './faq.css';

// What teams ask first. Every answer is what the app does today (engine limits in engine.controller.ts).
const QUESTIONS = [1, 2, 3, 4, 5, 6] as const;

export const Faq: React.FC = () => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="wq">
      <div className="wq-wrap">
        <div className="wq-side">
          <p className="wq-label">{t('wq.label')}</p>
          <h2>{t('wq.h2')}</h2>
          <p>{t('wq.side')}</p>
        </div>
        <ul className="wq-list">
          {QUESTIONS.map((n, i) => (
            <li key={n} className={open === i ? 'open' : ''}>
              <button type="button" className="wq-q" aria-expanded={open === i} aria-controls={`wq-a${n}`} onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{t(`wq.q${n}` as TranslationKey)}</span><i aria-hidden="true" />
              </button>
              <div className="wq-a" id={`wq-a${n}`} role="region">
                <div><p>{t(`wq.a${n}` as TranslationKey)}</p></div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
