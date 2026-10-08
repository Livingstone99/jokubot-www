// État de démonstration de JokuBot, gardé dans le navigateur.
// Seul `api.ts` le modifie ; les écrans le lisent avec `useDb()`.

import { useSyncExternalStore } from "react";

import { isSameDay, uid } from "./format.js";
import { mockPosts, SOCIAL_IDS } from "./social.js";

export type NetworkId = "whatsapp" | "telegram" | SocialId;
/** Réseaux sociaux gérés par PostFast (données fictives pour l'instant). */
export type SocialId = "facebook" | "instagram" | "x" | "tiktok";
export type EngineId = "service-client" | "reseaux" | "comptabilite" | "creation" | "meta" | "nafolo";

export type Connection = {
  connected: boolean;
  account?: string;
  since?: string;
};
export type Fact = { id: string; text: string; at: string };
export type TeachMessage = { id: string; from: "me" | "bot"; text: string; at: string };
export type SaleStatus = "validee" | "a_verifier" | "refusee";
export type Sale = {
  id: string;
  at: string;
  label: string;
  client: string;
  reference: string;
  amount: number;
  status: SaleStatus;
  source: "manuel" | "jokubot" | "nafolo";
};
export type VisualFormat = "carre" | "vertical";
export type Creation = {
  id: string;
  at: string;
  description: string;
  caption: string;
  format: VisualFormat;
  svg: string;
};
export type Post = {
  id: string;
  at: string;
  scheduledFor?: string;
  text: string;
  creationId?: string;
  status: "publie" | "programme" | "echec";
  result: string;
};
export type Campaign = {
  id: string;
  at: string;
  name: string;
  creationId?: string;
  text: string;
  budget: number;
  days: number;
  status: "active" | "pause";
};

export type ServiceClientSettings = {
  channels: NetworkId[];
  tone: "chaleureux" | "professionnel" | "direct";
  hours: "toujours" | "hors";
  from: string;
  to: string;
  businessName: string;
  description: string;
};
export type ReseauxSettings = {
  pageId: string;
  token: string;
  instagramId: string;
  autoPublish: boolean;
  frequency: "jour" | "lmv" | "lundi";
  time: string;
  topics: string[];
};
export type ComptaSettings = {
  company: string;
  currency: string;
  reportFrequency: "soir" | "lundi" | "mois";
  reportChannel: "whatsapp" | "email";
};
export type CreationSettings = { format: VisualFormat };
export type MetaSettings = { adAccount: string; token: string; page: string; country: string };
export type NafoloSettings = {
  mode: "lien" | "numero";
  link: string;
  number: string;
  displayName: string;
  validation: "auto" | "demander";
};

export type EngineSettings = {
  "service-client": ServiceClientSettings;
  reseaux: ReseauxSettings;
  comptabilite: ComptaSettings;
  creation: CreationSettings;
  meta: MetaSettings;
  nafolo: NafoloSettings;
};

export type Account = { firstName: string; lastName: string; email: string; password: string };

/** Publication sur un réseau social (données fictives pour l'instant). */
/** Réglages choisis à la connexion d'un réseau social. */
export type SocialPrefs = {
  accountType: string;
  rhythm: "jour" | "3-semaine" | "semaine" | "manuel";
  time: string;
  topics: string[];
};

export type SocialPost = {
  id: string;
  network: SocialId;
  text: string;
  at: string;
  scheduledFor?: string;
  status: "publie" | "programme";
  media?: { kind: "image" | "video"; name: string };
  likes: number;
  comments: number;
};

export type DB = {
  v: 1;
  account: Account | null;
  loggedIn: boolean;
  autoReplies: boolean;
  connections: Record<NetworkId, Connection>;
  engines: Partial<EngineSettings>;
  facts: Fact[];
  teach: TeachMessage[];
  teachTopic: string | null;
  sales: Sale[];
  creations: Creation[];
  posts: Post[];
  campaigns: Campaign[];
  socialPosts: SocialPost[];
  socialPrefs: Partial<Record<SocialId, SocialPrefs>>;
  /** Compte PostFast relié avec une clé API : il donne accès aux réseaux sociaux. */
  postfast: { connected: boolean; since: string; networks: SocialId[] } | null;
};

const KEY = "jokubot.demo.v1";

function emptyConnections(): Record<NetworkId, Connection> {
  return {
    whatsapp: { connected: false },
    telegram: { connected: false },
    facebook: { connected: false },
    instagram: { connected: false },
    x: { connected: false },
    tiktok: { connected: false },
  };
}

function emptyDb(): DB {
  return {
    v: 1,
    account: null,
    loggedIn: false,
    autoReplies: true,
    connections: emptyConnections(),
    engines: {},
    facts: [],
    teach: [],
    teachTopic: null,
    sales: [],
    creations: [],
    posts: [],
    campaigns: [],
    socialPosts: [],
    socialPrefs: {},
    postfast: null,
  };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.v === 1) {
        // On ne garde que les messageries proposées (d'anciennes données peuvent en contenir d'autres).
        const connections = emptyConnections();
        for (const id of Object.keys(connections) as NetworkId[]) {
          if (parsed.connections?.[id]) connections[id] = parsed.connections[id];
        }
        const db = { ...emptyDb(), ...parsed, connections };
        // Champs d'anciennes versions (messages clients simulés) : on les oublie.
        for (const key of ["conversations", "notice", "discordServers"]) delete (db as Record<string, unknown>)[key];
        // Comptes sociaux connectés avant l'ajout des publications : on leur en donne.
        if (!Array.isArray(parsed.socialPosts)) {
          db.socialPosts = SOCIAL_IDS.filter((id) => connections[id].connected).flatMap((id) => mockPosts(id));
        }
        // L'accueil de JokuBot s'affiche désormais sans être enregistré.
        db.teach = db.teach.filter((m) => !(m.from === "bot" && m.text.includes("Parlez-moi de votre activité")));
        const service = db.engines["service-client"];
        if (service) service.channels = service.channels.filter((c) => c in connections);
        return db;
      }
    }
  } catch {
    // Stockage indisponible (navigation privée) : on repart de zéro.
  }
  return emptyDb();
}

let state: DB = load();
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Rien à faire : la démonstration continue en mémoire.
  }
}

export function getDb(): DB {
  return state;
}

/** Applique une modification et prévient les écrans. */
export function update(change: (draft: DB) => void): void {
  const draft = structuredClone(state);
  change(draft);
  state = draft;
  save();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDb(): DB {
  return useSyncExternalStore(subscribe, getDb, getDb);
}

// Une autre fenêtre ouverte sur la démo : on suit ses changements.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    state = load();
    for (const listener of listeners) listener();
  });
}

/* ------------------------------------------------------------------ */
/* Données de démonstration, créées avec le compte                     */
/* ------------------------------------------------------------------ */

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function seed(account: Account): DB {
  const db = emptyDb();
  db.account = account;
  db.loggedIn = true;
  db.connections.whatsapp = { connected: true, account: "+225 07 08 45 12 30", since: ago(60 * 24 * 12) };
  // Réseaux sociaux fictifs : deux connectés, deux à connecter, pour montrer les deux états.
  db.connections.facebook = { connected: true, account: "Boutique Awa", since: ago(60 * 24 * 30) };
  db.connections.instagram = { connected: true, account: "@boutiqueawa", since: ago(60 * 24 * 21) };
  db.socialPosts = [...mockPosts("facebook"), ...mockPosts("instagram")];
  db.engines["service-client"] = {
    channels: ["whatsapp"],
    tone: "chaleureux",
    hours: "toujours",
    from: "08:00",
    to: "19:00",
    businessName: "Boutique Awa",
    description:
      "Pagnes wax de 6 000 à 15 000 FCFA. Livraison à Abidjan pour 1 000 FCFA. Boutique à Marcory, près du marché.",
  };
  db.facts = [
    { id: uid("f"), text: "Pagnes wax de 6 000 à 15 000 FCFA selon la qualité (6 yards).", at: ago(60 * 24 * 3) },
    { id: uid("f"), text: "Livraison partout à Abidjan pour 1 000 FCFA. Boutique à Marcory, près du marché.", at: ago(60 * 24 * 3) },
  ];
  const today = new Date();
  const at = (daysAgo: number, hour: number, minute: number) => {
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    date.setHours(hour, minute, 0, 0);
    // Une vente « d'aujourd'hui » ne peut pas être dans le futur.
    if (date.getTime() > Date.now()) return new Date(Date.now() - 30 * 60_000).toISOString();
    return date.toISOString();
  };
  db.sales = [
    { id: uid("s"), at: ago(74), label: "Pagne wax 6 yards", client: "Mariam Bamba", reference: "NF-48213", amount: 9000, status: "a_verifier", source: "nafolo" },
    { id: uid("s"), at: at(0, 10, 20), label: "Pagne super wax", client: "Aya Konaté", reference: "", amount: 12000, status: "validee", source: "jokubot" },
    { id: uid("s"), at: at(1, 16, 5), label: "Pagne wax hollandais", client: "Adjoa Mensah", reference: "NF-47990", amount: 15000, status: "validee", source: "nafolo" },
    { id: uid("s"), at: at(2, 11, 40), label: "2 pagnes wax 6 yards", client: "Fatou Diallo", reference: "", amount: 14000, status: "validee", source: "manuel" },
    { id: uid("s"), at: at(6, 18, 15), label: "Pagne wax simple", client: "Serge Kouassi", reference: "", amount: 6000, status: "validee", source: "manuel" },
  ];
  return db;
}

export function replaceDb(next: DB): void {
  update((draft) => {
    Object.assign(draft, next);
  });
}

/* ------------------------------------------------------------------ */
/* Calculs                                                             */
/* ------------------------------------------------------------------ */

export type SalesTotals = {
  today: { count: number; total: number };
  week: { count: number; total: number };
  month: { count: number; total: number };
  pending: { count: number; total: number };
};

export function salesTotals(sales: Sale[], now = new Date()): SalesTotals {
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totals: SalesTotals = {
    today: { count: 0, total: 0 },
    week: { count: 0, total: 0 },
    month: { count: 0, total: 0 },
    pending: { count: 0, total: 0 },
  };
  for (const sale of sales) {
    if (sale.status === "a_verifier") {
      totals.pending.count += 1;
      totals.pending.total += sale.amount;
      continue;
    }
    if (sale.status !== "validee") continue;
    const date = new Date(sale.at);
    if (isSameDay(date, now)) {
      totals.today.count += 1;
      totals.today.total += sale.amount;
    }
    if (date >= weekStart) {
      totals.week.count += 1;
      totals.week.total += sale.amount;
    }
    if (date >= monthStart) {
      totals.month.count += 1;
      totals.month.total += sale.amount;
    }
  }
  return totals;
}

/** État d'une messagerie ; un réseau tout juste ajouté est « non connecté ». */
export function connectionOf(db: DB, id: NetworkId): Connection {
  return db.connections[id] ?? { connected: false };
}

export function connectedNetworks(db: DB): NetworkId[] {
  return (Object.keys(db.connections) as NetworkId[]).filter((id) => db.connections[id].connected);
}
