import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useLanguage } from '../../contexts/LanguageContext';

export const COUNTRIES = [
  { code: 'AE', name: 'United Arab Emirates', flag: 'emojione:flag-for-united-arab-emirates' },
  { code: 'SA', name: 'Saudi Arabia',         flag: 'emojione:flag-for-saudi-arabia'         },
  { code: 'KW', name: 'Kuwait',               flag: 'emojione:flag-for-kuwait'               },
  { code: 'QA', name: 'Qatar',                flag: 'emojione:flag-for-qatar'                },
  { code: 'BH', name: 'Bahrain',              flag: 'emojione:flag-for-bahrain'              },
  { code: 'OM', name: 'Oman',                 flag: 'emojione:flag-for-oman'                 },
  { code: 'EG', name: 'Egypt',                flag: 'emojione:flag-for-egypt'                },
  { code: 'JO', name: 'Jordan',               flag: 'emojione:flag-for-jordan'               },
  { code: 'LB', name: 'Lebanon',              flag: 'emojione:flag-for-lebanon'              },
  { code: 'IQ', name: 'Iraq',                 flag: 'emojione:flag-for-iraq'                 },
  { code: 'YE', name: 'Yemen',                flag: 'emojione:flag-for-yemen'                },
  { code: 'SY', name: 'Syria',                flag: 'emojione:flag-for-syria'                },
  { code: 'MA', name: 'Morocco',              flag: 'emojione:flag-for-morocco'              },
  { code: 'TN', name: 'Tunisia',              flag: 'emojione:flag-for-tunisia'              },
  { code: 'DZ', name: 'Algeria',              flag: 'emojione:flag-for-algeria'              },
  { code: 'LY', name: 'Libya',                flag: 'emojione:flag-for-libya'                },
  { code: 'SD', name: 'Sudan',                flag: 'emojione:flag-for-sudan'                },
  { code: 'US', name: 'United States',        flag: 'emojione:flag-for-united-states'        },
  { code: 'GB', name: 'United Kingdom',       flag: 'emojione:flag-for-united-kingdom'       },
  { code: 'DE', name: 'Germany',              flag: 'emojione:flag-for-germany'              },
  { code: 'FR', name: 'France',               flag: 'emojione:flag-for-france'               },
  { code: 'IN', name: 'India',                flag: 'emojione:flag-for-india'                },
  { code: 'PK', name: 'Pakistan',             flag: 'emojione:flag-for-pakistan'             },
  { code: 'TR', name: 'Turkey',               flag: 'emojione:flag-for-turkey'               },
];

interface Props {
  value:    string;
  onChange: (code: string) => void;
  label?:   string;
  error?:   boolean;
  compact?: boolean;
}

function getLocalizedName(code: string, locale: string): string {
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region' });
    return dn.of(code) || code;
  } catch {
    return code;
  }
}

const INPUT_BASE: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
  padding: '13px 16px', fontSize: '14px', color: '#FFFFFF',
  cursor: 'pointer', height: '52px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  fontFamily: "'Inter', sans-serif", outline: 'none',
  transition: 'border-color 0.2s',
};

const INPUT_COMPACT: React.CSSProperties = {
  ...INPUT_BASE,
  padding: '8px 12px', fontSize: '13px', height: 'auto',
  borderRadius: '8px', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
};

export const CountryDropdown: React.FC<Props> = ({ value, onChange, label, error, compact = false }) => {
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);
  const { lang }          = useLanguage();
  const locale            = lang === 'ar' ? 'ar-SA' : 'en-US';
  const selected          = COUNTRIES.find(c => c.code === value) ?? COUNTRIES[0];
  const resolvedLabel     = label ?? (lang === 'ar' ? 'البلد' : 'Country');

  // Pre-compute all localized names once per language change
  const localizedNames = useMemo(
    () => Object.fromEntries(COUNTRIES.map(c => [c.code, getLocalizedName(c.code, locale)])),
    [locale],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {resolvedLabel && (
        <label style={{
          display: 'block', marginBottom: compact ? '4px' : '6px',
          fontSize: compact ? '11px' : '13px',
          fontWeight: 600,
          color: compact ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.7)',
          letterSpacing: compact ? '0.02em' : undefined,
        }}>
          {resolvedLabel}
        </label>
      )}

      <button type="button" onClick={() => setOpen(!open)}
        style={{
          ...(compact ? INPUT_COMPACT : INPUT_BASE),
          borderColor: error ? '#EF4444' : open ? '#F5C842' : compact ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.12)',
          boxShadow:   open ? '0 0 0 2px rgba(245,200,66,0.15)' : 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon icon={selected.flag} width={compact ? 16 : 20} style={{ flexShrink: 0, borderRadius: '2px' }} />
          <span style={{ color: '#FFFFFF', fontSize: compact ? '13px' : '14px' }}>
            {compact ? selected.code + ' — ' + localizedNames[selected.code] : localizedNames[selected.code]}
          </span>
        </span>
        <Icon
          icon="solar:alt-arrow-down-bold"
          width={16} color="rgba(255,255,255,0.4)"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: 'rgba(10,14,39,0.98)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(245,200,66,0.2)', borderRadius: '12px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              zIndex: 300, overflow: 'hidden',
            }}
          >
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {COUNTRIES.map(c => (
                <button key={c.code} type="button"
                  onClick={() => { onChange(c.code); setOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                    color: c.code === value ? '#F5C842' : 'rgba(255,255,255,0.7)',
                    fontSize: '13.5px', textAlign: lang === 'ar' ? 'right' : 'left',
                    transition: 'background 0.12s',
                    backgroundColor: c.code === value ? 'rgba(245,200,66,0.08)' : 'transparent',
                    direction: lang === 'ar' ? 'rtl' : 'ltr',
                  }}
                  onMouseEnter={e => { if (c.code !== value) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (c.code !== value) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Icon icon={c.flag} width={20} style={{ flexShrink: 0, borderRadius: '2px' }} />
                  <span style={{ flex: 1 }}>{localizedNames[c.code]}</span>
                  {c.code === value && <Icon icon="solar:check-bold" width={14} color="#F5C842" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
