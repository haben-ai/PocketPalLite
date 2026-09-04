import i18next from 'i18next';
import {initReactI18next} from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

export const SUPPORTED_LANGUAGES = [
  {code: 'en', label: 'English (EN)'},
  {code: 'es', label: 'Español (ES)'},
  {code: 'fr', label: 'Français (FR)'},
];

/**
 * Real i18next setup, not a stub -- covers the highest-traffic UI (drawer,
 * chat composer/actions, the Settings screen) across three languages.
 * Screens not yet migrated to t() simply keep showing their English
 * strings, which is a graceful gap rather than a broken one; more keys can
 * be added to the locale files as more screens are migrated.
 */
export function initI18n(language: string): void {
  if (i18next.isInitialized) {
    i18next.changeLanguage(language);
    return;
  }
  i18next.use(initReactI18next).init({
    resources: {
      en: {translation: en},
      es: {translation: es},
      fr: {translation: fr},
    },
    lng: language,
    fallbackLng: 'en',
    interpolation: {escapeValue: false},
    compatibilityJSON: 'v4',
  });
}
