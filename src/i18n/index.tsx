import { createContext, useContext, useState, ReactNode } from 'react';
import { initData } from '@tma.js/sdk-react';
import { ru, type TranslationKeys } from './ru';
import { en } from './en';

type Lang = 'ru' | 'en';
type Translations = Record<TranslationKeys, string>;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const translations: Record<Lang, Translations> = {
  ru,
  en,
};

function detectLanguage(): Lang {
  // Try to get from localStorage first
  const saved = localStorage.getItem('lang');
  if (saved === 'ru' || saved === 'en') {
    return saved;
  }

  // Try to detect from Telegram (initData is restored in init.ts before render)
  try {
    const tgLang = initData.user()?.language_code;
    if (tgLang === 'ru') return 'ru';
    if (tgLang) return 'en';
  } catch (e) {
    // Ignore
  }

  // Fall back to browser language
  try {
    if ((navigator.language || '').toLowerCase().startsWith('ru')) return 'ru';
  } catch (e) {
    // Ignore
  }

  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLanguage());

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key: TranslationKeys, params?: Record<string, string | number>): string => {
    let text = translations[lang][key] || translations.en[key] || key;

    // Simple template replacement
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }

    return text;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useT must be used within I18nProvider');
  }
  return context;
}
