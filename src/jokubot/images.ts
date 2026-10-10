// Génération d'images : Pollinations (gratuit, sans clé, appel direct depuis la page).
// Le service gratuit accepte environ une image par minute et ajoute un petit filigrane.
// Pour la production, ce sera au serveur JokuBot d'appeler un service payant.

import { translate } from "./audio.js";

export type Style = "produit" | "affiche" | "illustration" | "realiste";
export type Format = "carre" | "vertical" | "horizontal";

export const STYLES: { id: Style; name: string; prompt: string }[] = [
  { id: "produit", name: "Photo produit", prompt: "professional product photography, studio lighting, clean background, sharp focus" },
  { id: "affiche", name: "Affiche publicitaire", prompt: "advertising poster, bold composition, vibrant colors, commercial design" },
  { id: "illustration", name: "Illustration", prompt: "flat vector illustration, colorful, modern" },
  { id: "realiste", name: "Photo réaliste", prompt: "realistic photo, natural light, high detail" },
];

export const FORMATS: { id: Format; name: string; hint: string; width: number; height: number }[] = [
  { id: "carre", name: "Carré", hint: "Publication", width: 1024, height: 1024 },
  { id: "vertical", name: "Vertical", hint: "Story, statut WhatsApp", width: 768, height: 1344 },
  { id: "horizontal", name: "Horizontal", hint: "Bannière, Facebook", width: 1344, height: 768 },
];

export class ImageError extends Error {
  constructor(
    message: string,
    /** Vrai quand le service gratuit demande d'attendre avant l'image suivante. */
    readonly limited = false,
  ) {
    super(message);
  }
}

/** Le service comprend mieux l'anglais : la description est traduite d'abord, si possible. */
async function toEnglish(text: string) {
  try {
    return await translate(text, "fr", "en");
  } catch {
    return text;
  }
}

export async function generateImage(description: string, style: Style, format: Format): Promise<Blob> {
  const { prompt } = STYLES.find((s) => s.id === style)!;
  const { width, height } = FORMATS.find((f) => f.id === format)!;
  const subject = await toEnglish(description);
  const seed = Math.floor(Math.random() * 1_000_000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(`${subject}, ${prompt}`)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new ImageError("Pas de connexion au service d'images. Vérifiez votre connexion internet, puis réessayez.");
  }
  if (response.status === 402 || response.status === 429)
    throw new ImageError("Le service gratuit fait une pause entre deux images.", true);
  const blob = await response.blob();
  if (!response.ok || !blob.type.startsWith("image/")) throw new ImageError("L'image n'a pas pu être créée. Réessayez dans un instant.");
  return blob;
}
