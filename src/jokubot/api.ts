// API de démonstration. Chaque fonction imite un appel serveur (délai,
// erreurs en français) : il suffira de remplacer le corps par un `fetch`.

import { teach } from "./bot.js";
import {
  getDb,
  seed,
  update,
  type Campaign,
  type Creation,
  type EngineId,
  type EngineSettings,
  type NetworkId,
  type Post,
  type Sale,
  type SaleStatus,
  type SocialId,
  type SocialPost,
  type SocialPrefs,
  type VisualFormat,
} from "./db.js";
import { fold, money, uid } from "./format.js";
import { mockPosts } from "./social.js";
import { t } from "./prefs.js";
import { makeCaption, makePoster } from "./poster.js";

export class ApiError extends Error {
  field: string | undefined;
  /** Le message est écrit en français et traduit selon la langue choisie. */
  constructor(message: string, field?: string) {
    super(t(message));
    this.field = field;
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function call<T>(work: () => T, ms = 350): Promise<T> {
  await wait(ms + Math.random() * 200);
  return work();
}

/* ---------------------------- Compte ---------------------------- */

export function signup(input: { firstName: string; email: string; password: string }) {
  return call(() => {
    const db = getDb();
    if (db.account && fold(db.account.email) === fold(input.email)) {
      throw new ApiError("Un compte existe déjà avec cette adresse. Connectez-vous plutôt.", "email");
    }
    const next = seed({ firstName: input.firstName.trim(), lastName: "", email: input.email.trim(), password: input.password });
    update((draft) => Object.assign(draft, next));
  }, 600);
}

export function login(input: { email: string; password: string }) {
  return call(() => {
    const account = getDb().account;
    if (!account || fold(account.email) !== fold(input.email.trim())) {
      throw new ApiError("Aucun compte avec cette adresse sur cet appareil. Vérifiez l'adresse ou créez un compte.", "email");
    }
    if (account.password !== input.password) {
      throw new ApiError("Ce mot de passe n'est pas le bon. Réessayez.", "password");
    }
    update((draft) => {
      draft.loggedIn = true;
    });
  }, 500);
}

export function logout() {
  update((draft) => {
    draft.loggedIn = false;
  });
}

export function saveProfile(input: { firstName: string; lastName: string; email: string }) {
  return call(() =>
    update((draft) => {
      if (!draft.account) return;
      draft.account.firstName = input.firstName.trim();
      draft.account.lastName = input.lastName.trim();
      draft.account.email = input.email.trim();
    }),
  );
}

/* --------------------------- Connexions -------------------------- */

function connect(network: NetworkId, account: string) {
  update((draft) => {
    draft.connections[network] = { connected: true, account, since: new Date().toISOString() };
  });
}

export function disconnect(network: NetworkId) {
  return call(() =>
    update((draft) => {
      draft.connections[network] = { connected: false };
      const service = draft.engines["service-client"];
      if (service) service.channels = service.channels.filter((c) => c !== network);
    }),
  );
}

const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let whatsapp: { phone: string; code: string; startedAt: number } | null = null;

export function whatsappStart(phone: string) {
  return call(() => {
    let code = "";
    for (let i = 0; i < 8; i += 1) code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
    whatsapp = { phone, code: `${code.slice(0, 4)}-${code.slice(4)}`, startedAt: Date.now() };
    return { code: whatsapp.code };
  }, 700);
}

export const QR_LIFETIME = 20;

/** Interrogé toutes les 2 s. En démonstration, le téléphone se relie seul. */
export function whatsappStatus() {
  return call(() => {
    if (!whatsapp) throw new ApiError("La liaison a expiré. Revenez à l'étape précédente pour recommencer.");
    const elapsed = (Date.now() - whatsapp.startedAt) / 1000;
    const linked = elapsed > 9;
    if (linked) connect("whatsapp", whatsapp.phone);
    return {
      linked,
      qrSeed: `${whatsapp.code}-${Math.floor(elapsed / QR_LIFETIME)}`,
      secondsLeft: QR_LIFETIME - Math.floor(elapsed % QR_LIFETIME),
    };
  }, 150);
}

/* -------------------- Réseaux sociaux (données fictives) -------------------- */

const DEMO_ACCOUNT: Record<SocialId, string> = {
  facebook: "Boutique Awa",
  instagram: "@boutiqueawa",
  x: "@boutiqueawa",
  tiktok: "@boutique.awa",
};

/** Moment où la connexion fictive aboutit, par réseau. */
const socialPending: Partial<Record<SocialId, number>> = {};

/** Démarre la connexion d'un réseau. Elle aboutit seule après quelques secondes. */
export function socialStart(network: SocialId) {
  return call(() => {
    socialPending[network] = Date.now() + 4000;
  }, 500);
}

/** Interrogé toutes les 3 s pendant la connexion. */
export function socialStatus(network: SocialId) {
  return call((): { connected: boolean; account?: string } => {
    const readyAt = socialPending[network];
    if (readyAt === undefined) throw new ApiError("La connexion a expiré. Touchez de nouveau le bouton pour recommencer.");
    if (Date.now() < readyAt) return { connected: false };
    delete socialPending[network];
    const account = DEMO_ACCOUNT[network];
    update((draft) => {
      draft.connections[network] = { connected: true, account, since: new Date().toISOString() };
      if (!draft.socialPosts.some((p) => p.network === network)) draft.socialPosts.unshift(...mockPosts(network));
    });
    return { connected: true, account };
  }, 150);
}

/** Publie (ou programme) une publication fictive sur un réseau. */
export function socialPublish(input: { network: SocialId; text: string; media?: SocialPost["media"]; scheduledFor?: string }) {
  return call(() => {
    const scheduled = Boolean(input.scheduledFor && new Date(input.scheduledFor).getTime() > Date.now());
    const post: SocialPost = {
      id: uid("sp"),
      network: input.network,
      text: input.text.trim(),
      at: new Date().toISOString(),
      status: scheduled ? "programme" : "publie",
      likes: 0,
      comments: 0,
      ...(input.media ? { media: input.media } : {}),
      ...(scheduled && input.scheduledFor ? { scheduledFor: new Date(input.scheduledFor).toISOString() } : {}),
    };
    update((draft) => {
      draft.socialPosts.unshift(post);
    });
    return post;
  }, 900);
}

export function saveSocialPrefs(network: SocialId, prefs: SocialPrefs) {
  return call(() =>
    update((draft) => {
      draft.socialPrefs[network] = prefs;
    }),
  );
}

export function removeSocialPost(id: string) {
  return call(() =>
    update((draft) => {
      draft.socialPosts = draft.socialPosts.filter((p) => p.id !== id);
    }),
  200);
}

let telegram: { phone: string; needPassword: boolean } | null = null;

export function telegramSendCode(phone: string) {
  return call(() => {
    // En démonstration, un numéro qui finit par 0 a un mot de passe Telegram.
    telegram = { phone, needPassword: phone.replace(/\D/g, "").endsWith("0") };
  }, 700);
}

export function telegramVerify(code: string) {
  return call(() => {
    if (!telegram) throw new ApiError("Le code a expiré. Revenez en arrière pour en recevoir un nouveau.");
    if (code !== "12345") {
      throw new ApiError("Ce code n'est pas le bon. Recopiez le code reçu dans Telegram (en démonstration : 12345).", "code");
    }
    if (telegram.needPassword) return { needPassword: true };
    connect("telegram", telegram.phone);
    return { needPassword: false };
  }, 600);
}

export function telegramPassword(password: string) {
  return call(() => {
    if (!telegram) throw new ApiError("Le code a expiré. Revenez en arrière pour en recevoir un nouveau.");
    if (password.length < 4) {
      throw new ApiError("Ce mot de passe est refusé par Telegram. C'est celui de la « validation en deux étapes ».", "password");
    }
    connect("telegram", telegram.phone);
  }, 600);
}

/* ---------------------------- Moteurs ---------------------------- */

export function saveEngine<K extends EngineId>(id: K, settings: EngineSettings[K]) {
  return call(() =>
    update((draft) => {
      draft.engines[id] = settings;
      if (id === "service-client") draft.autoReplies = true;
    }),
  );
}

export function setAutoReplies(on: boolean) {
  return call(() =>
    update((draft) => {
      draft.autoReplies = on;
    }),
  200);
}

/* ------------------------- Avec JokuBot -------------------------- */

export async function teachSend(text: string) {
  update((draft) => {
    draft.teach.push({ id: uid("t"), from: "me", text, at: new Date().toISOString() });
  });
  await wait(900 + Math.min(text.length * 8, 900));
  const result = teach(getDb(), text);
  update((draft) => {
    const now = new Date().toISOString();
    for (const fact of result.facts) {
      draft.facts.unshift({ id: uid("f"), text: fact, at: now });
    }
    if (result.sale) draft.sales.unshift({ ...result.sale, id: uid("s"), at: now });
    draft.teachTopic = result.topic;
    draft.teach.push({ id: uid("t"), from: "bot", text: result.reply, at: now });
  });
}

/* -------------------------- Comptabilité ------------------------- */

export function addSale(input: Omit<Sale, "id" | "at" | "status" | "source">) {
  return call(() =>
    update((draft) => {
      draft.sales.unshift({ ...input, id: uid("s"), at: new Date().toISOString(), status: "validee", source: "manuel" });
    }),
  );
}

export function setSaleStatus(id: string, status: SaleStatus) {
  return call(() =>
    update((draft) => {
      const sale = draft.sales.find((s) => s.id === id);
      if (sale) sale.status = status;
    }),
  200);
}

export function removeSale(id: string) {
  return call(() =>
    update((draft) => {
      draft.sales = draft.sales.filter((s) => s.id !== id);
    }),
  200);
}

export function sendReport() {
  return call(() => {
    const db = getDb();
    const compta = db.engines.comptabilite;
    if (compta?.reportChannel === "email") return t("Rapport envoyé à {adresse}.", { adresse: db.account?.email ?? "" });
    const phone = db.connections.whatsapp.account;
    if (!phone) throw new ApiError("WhatsApp n'est pas connecté. Connectez-le, ou choisissez l'e-mail dans les réglages.");
    return t("Rapport envoyé sur WhatsApp au {numero}.", { numero: phone });
  }, 800);
}

/* ------------------------- Création, réseaux ------------------------- */

export function createVisual(description: string, format: VisualFormat) {
  return call(() => {
    const db = getDb();
    const business = db.engines["service-client"]?.businessName ?? db.engines.comptabilite?.company ?? "Ma boutique";
    const delivery = db.facts.find((f) => /livr/i.test(f.text))?.text ?? null;
    const creation: Creation = {
      id: uid("v"),
      at: new Date().toISOString(),
      description: description.trim(),
      caption: makeCaption(description, business, delivery),
      format,
      svg: makePoster(description, format, business),
    };
    update((draft) => {
      draft.creations.unshift(creation);
    });
    return creation;
  }, 1600);
}

export function publishPost(input: { text: string; creationId?: string; scheduledFor?: string }) {
  return call(() => {
    const db = getDb();
    if (!db.engines.reseaux) throw new ApiError("Réglez d'abord la gestion des réseaux pour publier sur Facebook.");
    const scheduled = input.scheduledFor && new Date(input.scheduledFor).getTime() > Date.now();
    const post: Post = {
      id: uid("p"),
      at: new Date().toISOString(),
      text: input.text.trim(),
      status: scheduled ? "programme" : "publie",
      result: scheduled ? "Sera publié à l'heure prévue" : "Publié sur votre page Facebook",
      ...(input.creationId ? { creationId: input.creationId } : {}),
      ...(scheduled && input.scheduledFor ? { scheduledFor: new Date(input.scheduledFor).toISOString() } : {}),
    };
    update((draft) => {
      draft.posts.unshift(post);
    });
    return post;
  }, 900);
}

export function createCampaign(input: Omit<Campaign, "id" | "at" | "status" | "name"> & { launchNow: boolean }) {
  return call(() => {
    if (input.budget < 1000) throw new ApiError("Le budget minimum est de 1 000 FCFA par jour.", "adBudget");
    const db = getDb();
    const number = db.campaigns.length + 1;
    const campaign: Campaign = {
      id: uid("a"),
      at: new Date().toISOString(),
      name: `Campagne ${number} · ${money(input.budget)} par jour`,
      text: input.text,
      budget: input.budget,
      days: input.days,
      status: input.launchNow ? "active" : "pause",
      ...(input.creationId ? { creationId: input.creationId } : {}),
    };
    update((draft) => {
      draft.campaigns.unshift(campaign);
    });
    return campaign;
  }, 1000);
}

export function setCampaignStatus(id: string, status: Campaign["status"]) {
  return call(() =>
    update((draft) => {
      const campaign = draft.campaigns.find((c) => c.id === id);
      if (campaign) campaign.status = status;
    }),
  200);
}
