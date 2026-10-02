import { useCallback, useEffect, useState } from "react";

/* Préférences sans équivalent dans l'API (voir docs/ui-hypotheses.md) :
   enregistrées sur cet appareil uniquement. */

export type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type LocalPrefs = {
  photo: string | null;
  days: Day[];
  opensAt: string;
  closesAt: string;
  greeting: string;
  notifyMessage: boolean;
  notifyChannel: boolean;
};

const KEY = "joku.prefs";
const EVENT = "joku-prefs";

export const DEFAULT_PREFS: LocalPrefs = {
  photo: null,
  days: ["mon", "tue", "wed", "thu", "fri", "sat"],
  opensAt: "08:00",
  closesAt: "18:00",
  greeting: "",
  notifyMessage: true,
  notifyChannel: true,
};

export function readPrefs(): LocalPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<LocalPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Enregistre les préférences ; renvoie false si le navigateur refuse (stockage plein ou bloqué). */
export function writePrefs(prefs: LocalPrefs): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

/** Photo de profil, tenue à jour quand elle change ailleurs dans l'application. */
export function useProfilePhoto(): string | null {
  const [photo, setPhoto] = useState(() => readPrefs().photo);
  const sync = useCallback(() => setPhoto(readPrefs().photo), []);
  useEffect(() => {
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);
  return photo;
}

/** Réduit une image à 256 px de côté pour garder un stockage léger. */
export function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      // Recadrage carré centré.
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}
