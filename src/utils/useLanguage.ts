import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useLanguage() {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    i18n.changeLanguage(language);
  }, [language, i18n]);

  const toggleLanguage = useCallback(() => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    setLanguage(newLang);
  }, [i18n.language]);

  return { language, setLanguage, toggleLanguage };
}
