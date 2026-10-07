// Langue (français / anglais) et thème (clair / sombre), gardés dans le navigateur.

import { useSyncExternalStore } from "react";

import { EN } from "./i18n-en.js";

export type Lang = "fr" | "en";
export type Theme = "light" | "dark";

const LANG_KEY = "jokubot.lang";
const THEME_KEY = "jokubot.theme";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible : le choix vaut pour cette visite seulement.
  }
}

let lang: Lang = read(LANG_KEY) === "en" ? "en" : "fr";
let theme: Theme = (() => {
  const stored = read(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
})();

const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function applyTheme() {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0b0b0b" : "#ffffff");
}

if (typeof document !== "undefined") {
  document.documentElement.lang = lang;
  applyTheme();
}

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang) {
  lang = next;
  write(LANG_KEY, next);
  document.documentElement.lang = next;
  emit();
}

export function setTheme(next: Theme) {
  theme = next;
  write(THEME_KEY, next);
  applyTheme();
  emit();
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, () => lang, () => lang);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, () => theme, () => theme);
}

/** Format des dates et des nombres selon la langue choisie. */
export function locale(): string {
  return lang === "en" ? "en-GB" : "fr-FR";
}

/**
 * Traduit un texte écrit en français. Le texte français sert de clé : sans
 * traduction anglaise connue, il s'affiche tel quel. `{nom}` est remplacé par
 * la valeur correspondante de `vars`.
 */
export function t(text: string, vars?: Record<string, string | number>): string {
  const base = lang === "en" ? (EN[text] ?? text) : text;
  if (!vars) return base;
  return base.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}
