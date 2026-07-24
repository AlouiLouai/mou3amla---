"use client";

import { useCallback, useSyncExternalStore } from "react";
import { translations, type Language, type TranslationKey } from "@/features/i18n/translations";

const STORAGE_KEY = "mou3amla-language";
const DEFAULT_LANGUAGE: Language = "en";

function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "fr" || value === "tn";
}

let currentLanguage: Language = DEFAULT_LANGUAGE;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Lazily reads localStorage on the first client call rather than eagerly at
// module scope, matching use-qr-camera-scanner.ts's pattern - getSnapshot
// only runs on the client, so this never executes during SSR.
function getSnapshot(): Language {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLanguage(stored)) {
    currentLanguage = stored;
  }
  return currentLanguage;
}

// Pinned to the default for both the server render and the first client
// render, same reasoning as use-qr-camera-scanner.ts's isSupported - avoids
// a hydration mismatch, then reconciles with the real stored value right after.
function getServerSnapshot(): Language {
  return DEFAULT_LANGUAGE;
}

export function setLanguage(language: Language) {
  currentLanguage = language;
  window.localStorage.setItem(STORAGE_KEY, language);
  document.documentElement.lang = language === "tn" ? "ar-TN" : language;
  listeners.forEach((listener) => listener());
}

export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useTranslation() {
  const language = useLanguage();
  const t = useCallback((key: TranslationKey) => translations[language][key], [language]);
  return { t, language, setLanguage };
}
