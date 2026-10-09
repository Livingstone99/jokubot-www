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

/** Traduit un texte plus long que MAX_CHARS, phrase par phrase, en plusieurs appels. */
async function translateLong(text: string, from: LangCode, to: LangCode): Promise<string> {
  const parts: string[] = [];
  let part = "";
  for (const sentence of text.match(/[^.!?]+[.!?]*\s*/g) ?? [text]) {
    if (part && (part + sentence).length > MAX_CHARS) {
      parts.push(part);
      part = "";
    }
    part += sentence.slice(0, MAX_CHARS);
  }
  if (part.trim()) parts.push(part);
  const done = await Promise.all(parts.map((p) => translate(p.trim(), from, to)));
  return done.join(" ");
}

/* --------------------------- Voix clonée --------------------------- */
// Le serveur JokuBot (VITE_VOICE_API) reçoit l'enregistrement, clone la voix,
// traduit et renvoie l'audio dans la langue choisie. Sans serveur, la page
// fonctionne en aperçu : texte traduit ici, lu avec la voix de l'appareil.

const VOICE_API = import.meta.env.VITE_VOICE_API;

/** Démo de la page Audio : la même phrase dans chaque langue, sans micro ni réseau. */
export const DEMO_TEXT: Record<LangCode, string> = {
  fr: "Bonjour, votre commande est prête. Vous pouvez venir la récupérer dès aujourd'hui.",
  en: "Hello, your order is ready. You can come and pick it up today.",
  es: "Hola, su pedido está listo. Puede venir a recogerlo hoy mismo.",
  pt: "Olá, a sua encomenda está pronta. Pode vir buscá-la ainda hoje.",
  ar: "مرحبًا، طلبك جاهز. يمكنك الحضور لاستلامه اليوم.",
  de: "Hallo, Ihre Bestellung ist fertig. Sie können sie noch heute abholen.",
  zh: "您好，您的订单已准备好。您今天就可以来取。",
};

/** true quand le serveur de voix clonée est branché. */
export const voiceReady = Boolean(VOICE_API);

/** `audio` : vos mots dans la langue choisie, avec votre voix. null en aperçu. */
export type VoiceResult = { text: string; translation: string; audio: Blob | null };

export async function voiceTranslate(recording: File, text: string, from: LangCode, to: LangCode): Promise<VoiceResult> {
  if (VOICE_API) {
    const body = new FormData();
    body.append("audio", recording);
    body.append("text", text);
    body.append("from", from);
    body.append("to", to);
    let data: { text?: string; translation?: string; audioUrl?: string };
    try {
      const response = await fetch(`${VOICE_API.replace(/\/$/, "")}/voice/translate`, { method: "POST", body });
      if (!response.ok) throw new Error(String(response.status));
      data = await response.json();
    } catch {
      throw new TranslateError("JokuBot n'a pas pu créer votre voix. Réessayez dans un instant.");
    }
    if (!data.audioUrl) throw new TranslateError("JokuBot n'a pas pu créer votre voix. Réessayez dans un instant.");
    const audio = await fetch(data.audioUrl).then((r) => r.blob());
    return { text: data.text || text, translation: data.translation || "", audio };
  }

  if (!text.trim()) throw new TranslateError("JokuBot n'a pas entendu de parole. Parlez plus près du micro, puis réessayez.");
  const translation = from === to ? text : await translateLong(text, from, to);
  return { text, translation, audio: null };
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
