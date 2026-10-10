// Les messageries et les moteurs proposés par JokuBot.

import type { DB, EngineId, NetworkId } from "./db.js";

export type NetworkInfo = {
  id: NetworkId;
  name: string;
  /** Complément de « Connecter … ». */
  cta: string;
  mono: string;
  /** Logo dans public/, affiché à la place du monogramme. */
  logo?: string;
  available: boolean;
};

export const NETWORKS: NetworkInfo[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    cta: "WhatsApp",
    mono: "Wa",
    logo: "channels/whatsapp.jpg",
    available: true,
  },
  {
    id: "telegram",
    name: "Telegram",
    cta: "Telegram",
    mono: "Tg",
    logo: "channels/telegram.jpg",
    available: true,
  },
  {
    id: "facebook",
    name: "Facebook",
    cta: "Facebook",
    mono: "Fb",
    available: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    cta: "Instagram",
    mono: "Ig",
    available: true,
  },
  {
    id: "x",
    name: "X (Twitter)",
    cta: "X",
    mono: "X",
    available: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    cta: "TikTok",
    mono: "Tt",
    available: true,
  },
];

export function network(id: NetworkId): NetworkInfo {
  return NETWORKS.find((n) => n.id === id) as NetworkInfo;
}

export type EngineInfo = {
  id: EngineId;
  number: string;
  name: string;
  description: string;
};

export const ENGINES: EngineInfo[] = [
  {
    id: "service-client",
    number: "01",
    name: "Service client",
    description: "Répond à vos clients sur vos messageries, avec vos prix, vos horaires et votre ton.",
  },
  {
    id: "reseaux",
    number: "02",
    name: "Gestion des réseaux",
    description: "Publie sur votre page Facebook et votre compte Instagram, à l'heure que vous choisissez.",
  },
  {
    id: "comptabilite",
    number: "03",
    name: "Comptabilité",
    description: "Enregistre chaque vente, met de côté les paiements à vérifier et vous envoie un rapport.",
  },
  {
    id: "creation",
    number: "04",
    name: "Création de contenu",
    description: "Crée des affiches pour vos produits, avec une légende prête à publier.",
  },
  {
    id: "meta",
    number: "05",
    name: "Campagnes Meta",
    description: "Lance une publicité sur Facebook et Instagram, avec le budget que vous fixez.",
  },
  {
    id: "nafolo",
    number: "06",
    name: "Paiement Nafolo",
    description: "Envoie votre lien de paiement aux clients et vérifie leurs captures d'écran.",
  },
];

export function engine(id: string): EngineInfo | undefined {
  return ENGINES.find((e) => e.id === id);
}

export type EngineState = "active" | "paused" | "off";

export function engineState(db: DB, id: EngineId): EngineState {
  if (!db.engines[id]) return "off";
  if (id === "service-client" && !db.autoReplies) return "paused";
  return "active";
}
