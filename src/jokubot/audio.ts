// Audio : langues proposées, traduction et lecture à voix haute.
// La traduction passe par MyMemory (gratuit, sans clé, appel direct depuis la page).
// Pour la production, ce sera au serveur JokuBot de traduire.

export type LangCode = "fr" | "en" | "es" | "pt" | "ar" | "de" | "zh";

/** `voice` : code utilisé pour la dictée et la lecture à voix haute. */
export const LANGS: { code: LangCode; name: string; voice: string }[] = [
  { code: "fr", name: "Français", voice: "fr-FR" },
  { code: "en", name: "Anglais", voice: "en-US" },
  { code: "es", name: "Espagnol", voice: "es-ES" },
  { code: "pt", name: "Portugais", voice: "pt-PT" },
  { code: "ar", name: "Arabe", voice: "ar-SA" },
  { code: "de", name: "Allemand", voice: "de-DE" },
  { code: "zh", name: "Chinois", voice: "zh-CN" },
];

export function lang(code: LangCode) {
  return LANGS.find((l) => l.code === code)!;
}

/** MyMemory accepte 500 caractères par appel. */
export const MAX_CHARS = 500;

export class TranslateError extends Error {}

export async function translate(text: string, from: LangCode, to: LangCode): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  let data: { responseStatus?: number | string; responseData?: { translatedText?: string }; quotaFinished?: boolean };
  try {
    const response = await fetch(url);
    data = await response.json();
  } catch {
    throw new TranslateError("Pas de connexion au service de traduction. Vérifiez votre connexion internet, puis réessayez.");
  }
  if (data.quotaFinished) throw new TranslateError("Le service de traduction a atteint sa limite du jour. Réessayez demain.");
  const result = data.responseData?.translatedText;
  if (Number(data.responseStatus) !== 200 || !result) throw new TranslateError("La traduction n'a pas abouti. Réessayez dans un instant.");
  return result;
}

/** Lit le texte à voix haute, avec une voix de la langue si l'appareil en a une. */
export function speak(text: string, code: LangCode) {
  if (!("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang(code).voice;
  window.speechSynthesis.speak(utterance);
  return true;
}

/* ------------------------------ Dictée ------------------------------ */

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

/** Dictée du navigateur (Chrome, Edge, Safari). null si l'appareil ne sait pas transcrire. */
export function createRecognition(): Recognition | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}
