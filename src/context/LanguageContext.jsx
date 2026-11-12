import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('gestflow_lang') || 'ca'; // Default: Català
  });

  const setLang = (newLang) => {
    const valid = newLang === 'es' ? 'es' : 'ca';
    setLangState(valid);
    localStorage.setItem('gestflow_lang', valid);
  };

  const t = (path) => {
    if (!path) return '';
    const keys = path.split('.');
    let cur = translations[lang];
    for (const k of keys) {
      if (!cur || cur[k] === undefined) {
        // Fallback to es
        let fb = translations.es;
        for (const fk of keys) {
          if (!fb || fb[fk] === undefined) return path;
          fb = fb[fk];
        }
        return fb;
      }
      cur = cur[k];
    }
    return cur;
  };

  return (
    <LanguageContext.Provider value={{ 
      lang, 
      setLang, 
      t, 
      translations: translations[lang] || translations.ca 
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    const defaultLang = localStorage.getItem('gestflow_lang') || 'ca';
    return {
      lang: defaultLang,
      setLang: () => {},
      t: (path) => path,
      translations: translations[defaultLang] || translations.ca
    };
  }
  return context;
}
