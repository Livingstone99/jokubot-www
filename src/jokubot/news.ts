// Actualités : flux RSS publics de médias francophones, lus via le relais du serveur
// (voir vite.config.ts). Titre, résumé court, image et lien vers l'article d'origine.

import { fold } from "./format.js";

export type Topic = "une" | "afrique" | "monde" | "economie" | "sport" | "science" | "sante";

type Feed = { source: string; path: string };

const RFI = "RFI";
const F24 = "France 24";
const LM = "Le Monde";
const BBC = "BBC Afrique";
const JA = "Jeune Afrique";

const FEEDS: Record<Exclude<Topic, "une">, Feed[]> = {
  afrique: [
    { source: RFI, path: "/news/rfi/fr/afrique/rss" },
    { source: F24, path: "/news/f24/fr/afrique/rss" },
    { source: LM, path: "/news/lemonde/afrique/rss_full.xml" },
    { source: BBC, path: "/news/bbc/afrique/rss.xml" },
    { source: JA, path: "/news/ja/feed/" },
  ],
  monde: [
    { source: RFI, path: "/news/rfi/fr/monde/rss" },
    { source: F24, path: "/news/f24/fr/rss" },
    { source: LM, path: "/news/lemonde/international/rss_full.xml" },
  ],
  economie: [
    { source: RFI, path: "/news/rfi/fr/economie/rss" },
    { source: F24, path: "/news/f24/fr/economie/rss" },
    { source: LM, path: "/news/lemonde/economie/rss_full.xml" },
  ],
  sport: [
    { source: RFI, path: "/news/rfi/fr/sports/rss" },
    { source: F24, path: "/news/f24/fr/sports/rss" },
    { source: LM, path: "/news/lemonde/sport/rss_full.xml" },
  ],
  science: [
    { source: RFI, path: "/news/rfi/fr/science/rss" },
    { source: LM, path: "/news/lemonde/pixels/rss_full.xml" },
  ],
  sante: [{ source: LM, path: "/news/lemonde/sante/rss_full.xml" }],
};

export const TOPICS: { id: Topic; name: string }[] = [
  { id: "une", name: "À la une" },
  { id: "afrique", name: "Afrique" },
  { id: "monde", name: "Monde" },
  { id: "economie", name: "Économie" },
  { id: "sport", name: "Sport" },
  { id: "science", name: "Sciences et tech" },
  { id: "sante", name: "Santé" },
];

/** Mots qui désignent chaque pays dans les articles (nom et habitants). */
export const COUNTRY_WORDS: Record<string, string[]> = {
  CI: ["Côte d'Ivoire", "Côte d’Ivoire", "ivoirien", "Abidjan"],
  SN: ["Sénégal", "sénégalais", "Dakar"],
  ML: ["Mali", "malien", "Bamako"],
  BF: ["Burkina", "burkinabè", "Ouagadougou"],
  BJ: ["Bénin", "béninois", "Cotonou"],
  TG: ["Togo", "togolais", "Lomé"],
  GN: ["Guinée", "guinéen", "Conakry"],
  CM: ["Cameroun", "camerounais", "Yaoundé", "Douala"],
  FR: ["France", "français", "Paris"],
};

export type Article = {
  id: string;
  title: string;
  summary: string;
  link: string;
  image: string | null;
  date: Date | null;
  source: string;
};

const MAX_SUMMARY = 240;

function clean(text: string | null | undefined): string {
  if (!text) return "";
  // Certaines descriptions contiennent du HTML : on ne garde que le texte.
  const doc = new DOMParser().parseFromString(text, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

function shorten(text: string) {
  if (text.length <= MAX_SUMMARY) return text;
  const cut = text.slice(0, MAX_SUMMARY);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function imageOf(item: Element): string | null {
  for (const el of Array.from(item.getElementsByTagName("*"))) {
    const name = el.localName;
    const url = el.getAttribute("url");
    if (url && (name === "content" || name === "thumbnail")) return url;
    if (name === "enclosure" && url && (el.getAttribute("type") ?? "image").startsWith("image")) return url;
  }
  // Sinon, une image dans la description.
  const html = item.getElementsByTagName("description")[0]?.textContent ?? "";
  return /<img[^>]+src="([^"]+)"/.exec(html)?.[1] ?? null;
}

async function readFeed(feed: Feed): Promise<Article[]> {
  const response = await fetch(feed.path);
  if (!response.ok) throw new Error(feed.source);
  const xml = new DOMParser().parseFromString(await response.text(), "text/xml");
  return Array.from(xml.getElementsByTagName("item")).map((item) => {
    const text = (tag: string) => item.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";
    const link = text("link") || text("guid");
    const when = text("pubDate") || text("dc:date");
    const date = when ? new Date(when) : null;
    return {
      id: link,
      title: clean(text("title")),
      summary: shorten(clean(text("description"))),
      link,
      image: imageOf(item),
      date: date && !Number.isNaN(date.getTime()) ? date : null,
      source: feed.source,
    };
  });
}

export class NewsError extends Error {}

/** Articles d'un sujet, du plus récent au plus ancien, sans doublon. */
export async function loadNews(topic: Topic): Promise<{ articles: Article[]; failed: string[] }> {
  const feeds = topic === "une" ? [...FEEDS.afrique, ...FEEDS.monde] : FEEDS[topic];
  const results = await Promise.allSettled(feeds.map(readFeed));
  const failed = feeds.filter((_, i) => results[i]!.status === "rejected").map((f) => f.source);
  const seen = new Set<string>();
  const articles = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((a) => a.title && a.link && !seen.has(a.link) && seen.add(a.link))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
  if (!articles.length)
    throw new NewsError("Les actualités ne sont pas disponibles pour le moment. Vérifiez votre connexion internet, puis réessayez.");
  return { articles, failed: [...new Set(failed)] };
}

/** Articles de l'Afrique et du monde qui parlent du pays choisi. */
export async function loadCountryNews(code: string): Promise<{ articles: Article[]; failed: string[] }> {
  const words = (COUNTRY_WORDS[code] ?? []).map(fold);
  const { articles, failed } = await loadNews("une");
  return {
    articles: articles.filter((a) => {
      const text = fold(`${a.title} ${a.summary}`);
      return words.some((w) => text.includes(w));
    }),
    failed,
  };
}
