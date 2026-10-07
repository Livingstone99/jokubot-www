// Le « cerveau » de démonstration de JokuBot : il apprend l'activité du
// commerçant, enregistre les ventes dictées et répond aux clients.
// Le vrai service remplacera ces règles par l'IA ; l'interface ne change pas.

import { salesTotals, type DB, type Sale } from "./db.js";
import { fold, money, plural } from "./format.js";
import { t } from "./prefs.js";

export const SUGGESTIONS = [
  "Voici mes produits et mes prix",
  "Mes horaires et mon adresse",
  "Comment se passe la livraison",
  "Les moyens de paiement acceptés",
  "J'ai vendu quelque chose aujourd'hui",
] as const;

const PROMPTS: Record<(typeof SUGGESTIONS)[number], { topic: string; reply: string }> = {
  "Voici mes produits et mes prix": {
    topic: "produits",
    reply:
      "Avec plaisir. Envoyez-moi vos produits, un par ligne, avec leur prix. Par exemple :\nPagne wax hollandais : 15 000 FCFA\nPagne super wax : 12 000 FCFA",
  },
  "Mes horaires et mon adresse": {
    topic: "horaires",
    reply:
      "Quels jours et à quelles heures êtes-vous ouvert, et où se trouve votre boutique ? Par exemple : du lundi au samedi, de 8 h à 19 h, à Marcory près du marché.",
  },
  "Comment se passe la livraison": {
    topic: "livraison",
    reply: "Où livrez-vous, à quel prix et en combien de temps ? Par exemple : Abidjan 1 000 FCFA, livré le jour même avant 18 h.",
  },
  "Les moyens de paiement acceptés": {
    topic: "paiement",
    reply: "Quels paiements acceptez-vous ? Par exemple : Wave, Orange Money, MTN MoMo, ou espèces à la livraison.",
  },
  "J'ai vendu quelque chose aujourd'hui": {
    topic: "vente",
    reply: "Bravo ! Dites-moi ce que vous avez vendu et à quel prix. Par exemple : j'ai vendu un pagne wax à 12 000.",
  },
};

export type TeachResult = {
  reply: string;
  facts: string[];
  sale: Omit<Sale, "id" | "at"> | null;
  topic: string | null;
};

function parseAmount(raw: string, unit: string | undefined): number {
  const compact = raw.trim().replace(/[\s\u00a0\u202f]/g, "");
  // « 12.000 » ou « 12,000 » : séparateurs de milliers (français ou anglais).
  const digits = /^\d{1,3}([.,]\d{3})+$/.test(compact) ? compact.replace(/[.,]/g, "") : compact.replace(",", ".");
  let value = Number.parseFloat(digits);
  if (!Number.isFinite(value)) return Number.NaN;
  if (unit && /^(k|mille)$/i.test(unit)) value *= 1000;
  return Math.round(value);
}

// « j'ai vendu un pagne à 12 000 », ou en anglais « I sold a wax print for 12,000 ».
const SALE_WITH_VERB =
  /(?:vendu|sold)\s+(.+?)\s+(?:à|a|pour|au prix de|for|at)\s+(\d[\d\s., ]*)\s*(k|mille|f\s?cfa|fcfa|f|francs?)?\b/i;
const SALE_SHORT = /^(.+?)\s+(?:à|a|pour|for|at)\s+(\d[\d\s., ]*)\s*(k|mille|f\s?cfa|fcfa|f|francs?)?\b/i;

function cleanLabel(label: string): string {
  const text = label.replace(/^(un|une|des|le|la|les|l'|a|an|the|some)\s+/i, "").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function salesSummary(db: DB): string {
  const totals = salesTotals(db.sales);
  const lines = [
    t("Aujourd'hui : {ventes}, {montant}.", { ventes: plural(totals.today.count, "vente", "ventes"), montant: money(totals.today.total) }),
    t("Cette semaine : {ventes}, {montant}.", { ventes: plural(totals.week.count, "vente", "ventes"), montant: money(totals.week.total) }),
    t("Ce mois-ci : {ventes}, {montant}.", { ventes: plural(totals.month.count, "vente", "ventes"), montant: money(totals.month.total) }),
  ];
  if (totals.pending.count > 0) {
    lines.push(
      t("{paiements} votre vérification dans Comptabilité.", {
        paiements: plural(totals.pending.count, "paiement attend", "paiements attendent"),
      }),
    );
  }
  return lines.join("\n");
}

function findFacts(db: DB, text: string): string[] {
  const words = fold(text)
    .split(/[^a-z0-9]+/)
    .filter(
      (w) =>
        w.length >= 4 &&
        !["vous", "votre", "quel", "quels", "quelle", "est-ce", "comment", "combien", "what", "your", "which", "does", "much", "when", "where"].includes(w),
    );
  return db.facts
    .filter((fact) => {
      const haystack = fold(fact.text);
      return words.some((word) => haystack.includes(word.slice(0, 5)));
    })
    .map((fact) => fact.text);
}

function sentenceCase(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?…:]$/.test(capped) ? capped : `${capped}.`;
}

export function teach(db: DB, input: string): TeachResult {
  const text = input.trim();
  const folded = fold(text);
  const topic = db.teachTopic;

  // Une suggestion touchée, en français ou dans sa version traduite.
  const suggestion = SUGGESTIONS.find((s) => s === text || t(s) === text);
  if (suggestion) {
    const prompt = PROMPTS[suggestion];
    return { reply: t(prompt.reply), facts: [], sale: null, topic: prompt.topic };
  }

  // « J'ai vendu un pagne à 12 000 »
  const saleMatch = SALE_WITH_VERB.exec(text) ?? (topic === "vente" ? SALE_SHORT.exec(text) : null);
  if (saleMatch) {
    const value = parseAmount(saleMatch[2] ?? "", saleMatch[3]);
    if (Number.isFinite(value) && value > 0) {
      const label = cleanLabel(saleMatch[1] ?? t("Vente"));
      const sale: TeachResult["sale"] = {
        label,
        client: "",
        reference: "",
        amount: value,
        status: "validee",
        source: "jokubot",
      };
      const totals = salesTotals([...db.sales, { ...sale, id: "new", at: new Date().toISOString() }]);
      return {
        reply: t("C'est noté dans votre comptabilité : {vente}, {montant}.\nAujourd'hui : {ventes} pour {total}.", {
          vente: label,
          montant: money(value),
          ventes: plural(totals.today.count, "vente", "ventes"),
          total: money(totals.today.total),
        }),
        facts: [],
        sale,
        topic: null,
      };
    }
  }
  if (topic === "vente" && /vendu|sold/.test(folded)) {
    return {
      reply: t("Je n'ai pas trouvé le prix. Écrivez-le comme ceci : j'ai vendu un pagne wax à 12 000."),
      facts: [],
      sale: null,
      topic: "vente",
    };
  }

  // « Combien j'ai vendu ? »
  if (/combien.*vend|mes ventes|chiffre d.affaire|bilan|how much.*sold|how much.*sell|my sales|revenue/.test(folded)) {
    return { reply: salesSummary(db), facts: [], sale: null, topic: null };
  }

  if (/^(bonjour|bonsoir|salut|hello|coucou|hi|hey|good (morning|evening))\b/.test(folded) && text.length < 25) {
    const name = db.account?.firstName ?? "";
    return {
      reply: t("Bonjour {prenom} ! Que voulez-vous m'apprendre aujourd'hui ? Un nouveau produit, un prix qui change, vos horaires ?", { prenom: name }),
      facts: [],
      sale: null,
      topic,
    };
  }
  if (/^(merci|ok|d.accord|super|parfait|thanks|thank you|great|perfect)\b/.test(folded) && text.length < 25) {
    return { reply: t("Avec plaisir ! Je reste là si vous avez autre chose à m'apprendre."), facts: [], sale: null, topic: null };
  }

  if (text.endsWith("?")) {
    const known = findFacts(db, text);
    if (known.length > 0) {
      return {
        reply: `${t("Voici ce que je sais :")}\n${known.map((k) => `• ${k}`).join("\n")}`,
        facts: [],
        sale: null,
        topic: null,
      };
    }
    return {
      reply: t("Je ne le sais pas encore. Donnez-moi la réponse et je m'en souviendrai pour vos clients."),
      facts: [],
      sale: null,
      topic,
    };
  }

  if (text.length < 8) {
    return { reply: t("Pouvez-vous m'en dire un peu plus ? Une phrase complète m'aide à bien répondre à vos clients."), facts: [], sale: null, topic };
  }

  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length >= 3);
  const facts = (lines.length > 1 ? lines : [text]).map((line) => sentenceCase(line.slice(0, 280)));
  return {
    reply: `${t("Merci, c'est retenu :")}\n${facts.map((f) => `• ${f}`).join("\n")}\n${t("Je m'en servirai pour répondre à vos clients.")}`,
    facts,
    sale: null,
    topic: null,
  };
}
