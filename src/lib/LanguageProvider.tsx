'use client';
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { LocaleContext, DEFAULT_LOCALE, LANG_KEY, storedLocale, localeFromSearch, isLocale, type Locale } from './i18n';
export function LanguageProvider({ children, locale = DEFAULT_LOCALE }: { children: ReactNode; locale?: Locale }) {
  const [stored, setStored] = useState<Locale>(locale);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const param = localeFromSearch(window.location.search);
    if (isLocale(param)) {
      setStored(param);
      try { localStorage.setItem(LANG_KEY, param); } catch {}
    } else {
      setStored(storedLocale());
    }
  }, []);
  const set = useCallback((next: Locale) => {
    setStored(next);
    try { localStorage.setItem(LANG_KEY, next); } catch {}
    try { const u = new URL(window.location.href); u.searchParams.delete('lang'); window.history.replaceState({}, '', u.pathname + u.search + u.hash); } catch {}
  }, []);
  const value = { locale: stored, setLocale: set };
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
