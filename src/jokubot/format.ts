// Formats d'affichage : montants, heures, téléphones, initiales.

import { locale, t } from "./prefs.js";

// Les formats suivent la langue choisie (français ou anglais).
export function amount(value: number): string {
  return new Intl.NumberFormat(locale()).format(Math.round(value));
}

export function money(value: number, currency = "FCFA"): string {
  return `${amount(value)} ${currency}`;
}

function format(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale(), options).format(date);
}

export function clock(iso: string): string {
  return format(new Date(iso), { hour: "2-digit", minute: "2-digit" });
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** « 14:05 » aujourd'hui, « Hier », sinon « 03/10 ». */
export function listTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (isSameDay(date, now)) return clock(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return t("Hier");
  return format(date, { day: "2-digit", month: "2-digit" });
}

export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (isSameDay(date, now)) return t("Aujourd'hui");
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return t("Hier");
  return format(date, { weekday: "short", day: "numeric", month: "short" });
}

export function dateTime(iso: string): string {
  const date = new Date(iso);
  if (isSameDay(date, new Date())) return t("Aujourd'hui, {heure}", { heure: clock(iso) });
  return format(date, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** « 1 vente », « 3 ventes » — le mot est traduit selon la langue choisie. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${t(count > 1 ? many : one)}`;
}

/** Retire les accents et met en minuscules, pour comparer des mots. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export type Country = {
  code: string;
  name: string;
  dial: string;
  digits: number;
  example: string;
};

export const COUNTRIES: Country[] = [
  { code: "CI", name: "Côte d'Ivoire", dial: "+225", digits: 10, example: "07 08 45 12 30" },
  { code: "SN", name: "Sénégal", dial: "+221", digits: 9, example: "77 123 45 67" },
  { code: "ML", name: "Mali", dial: "+223", digits: 8, example: "76 12 34 56" },
  { code: "BF", name: "Burkina Faso", dial: "+226", digits: 8, example: "70 12 34 56" },
  { code: "BJ", name: "Bénin", dial: "+229", digits: 10, example: "01 97 12 34 56" },
  { code: "TG", name: "Togo", dial: "+228", digits: 8, example: "90 12 34 56" },
  { code: "GN", name: "Guinée", dial: "+224", digits: 9, example: "620 12 34 56" },
  { code: "CM", name: "Cameroun", dial: "+237", digits: 9, example: "6 71 23 45 67" },
  { code: "FR", name: "France", dial: "+33", digits: 9, example: "6 12 34 56 78" },
];

export function countryByDial(dial: string): Country {
  return COUNTRIES.find((c) => c.dial === dial) ?? (COUNTRIES[0] as Country);
}

export function phoneDigits(number: string, dial: string): string {
  let digits = number.replace(/\D/g, "");
  // En France, le 0 initial disparaît derrière l'indicatif.
  if (dial === "+33" && digits.length === 10 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/** Groupe les chiffres par deux en partant de la fin : « 07 08 45 12 30 ». */
export function groupDigits(digits: string): string {
  const groups: string[] = [];
  for (let end = digits.length; end > 0; end -= 2) {
    groups.unshift(digits.slice(Math.max(0, end - 2), end));
  }
  // Espaces insécables : un numéro ne se coupe jamais en fin de ligne.
  return groups.join("\u00a0");
}

export function fullPhone(dial: string, number: string): string {
  return `${dial}\u00a0${groupDigits(phoneDigits(number, dial))}`;
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
