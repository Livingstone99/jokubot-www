// Actualités : les nouvelles du monde, de l'Afrique et du pays choisi, en résumés courts.

import { useCallback, useEffect, useRef, useState } from "react";

import { COUNTRIES, dateTime, fold } from "../format.js";
import { loadCountryNews, loadNews, NewsError, TOPICS, type Article, type Topic } from "../news.js";
import { t } from "../prefs.js";
import { Icon, PageHeader, Spinner } from "../ui.js";

const COUNTRY_KEY = "jokubot.news.country";
const FRESH_MS = 5 * 60 * 1000; // un sujet déjà chargé est gardé 5 minutes

type Tab = Topic | "pays";
type Loaded = { articles: Article[]; failed: string[]; at: number };

function readCountry() {
  try {
    return localStorage.getItem(COUNTRY_KEY) ?? "CI";
  } catch {
    return "CI";
  }
}

function speakArticle(article: Article) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`${article.title}. ${article.summary}`);
  utterance.lang = "fr-FR";
  window.speechSynthesis.speak(utterance);
}

export function NewsPage() {
  const [tab, setTab] = useState<Tab>("une");
  const [country, setCountry] = useState(readCountry);
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const cache = useRef(new Map<string, Loaded>());
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    document.title = `${t("Actualités")} · JokuBot`;
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const key = tab === "pays" ? `pays:${country}` : tab;

  const load = useCallback(
    async (force = false) => {
      const cached = cache.current.get(key);
      if (cached && !force && Date.now() - cached.at < FRESH_MS) {
        setData(cached);
        setError("");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const result = tab === "pays" ? await loadCountryNews(country) : await loadNews(tab);
        const loaded = { ...result, at: Date.now() };
        cache.current.set(key, loaded);
        setData(loaded);
      } catch (e) {
        setData(null);
        setError(e instanceof NewsError ? t(e.message) : t("Les actualités ne sont pas disponibles pour le moment. Vérifiez votre connexion internet, puis réessayez."));
      } finally {
        setLoading(false);
      }
    },
    [key, tab, country],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const chooseCountry = (code: string) => {
    setCountry(code);
    try {
      localStorage.setItem(COUNTRY_KEY, code);
    } catch {
      // Stockage indisponible : le choix vaut pour cette visite.
    }
  };

  const needle = fold(query.trim());
  const articles = (data?.articles ?? []).filter((a) => !needle || fold(`${a.title} ${a.summary}`).includes(needle));
  const [first, ...rest] = articles;
  const countryName = COUNTRIES.find((c) => c.code === country)?.name ?? "";

  return (
    <div className="page">
      <PageHeader
        title={t("Actualités")}
        subtitle={t("Les informations du monde, résumées pour vous chaque jour.")}
        back={{ to: "/accueil", label: t("Accueil") }}
        aside={
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load(true)} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="refresh" size={16} />}
            {t("Actualiser")}
          </button>
        }
      />

      <div className="news-bar">
        <div className="news-tabs" role="tablist" aria-label={t("Sujets")}>
          {[...TOPICS, { id: "pays" as const, name: "Mon pays" }].map((topic) => (
            <button
              key={topic.id}
              type="button"
              role="tab"
              aria-selected={tab === topic.id}
              className={`chip${tab === topic.id ? " is-on" : ""}`}
              onClick={() => setTab(topic.id)}
            >
              {t(topic.name)}
            </button>
          ))}
        </div>

        <div className="news-tools">
          {tab === "pays" ? (
            <div className="select-wrap news-country">
              <label className="sr-only" htmlFor="news-country">
                {t("Votre pays")}
              </label>
              <select id="news-country" className="input select" value={country} onChange={(e) => chooseCountry(e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {t(c.name)}
                  </option>
                ))}
              </select>
              <Icon name="chevron" size={18} className="select-icon" />
            </div>
          ) : null}
          <label className="sr-only" htmlFor="news-search">
            {t("Chercher dans les actualités")}
          </label>
          <input
            id="news-search"
            className="input news-search"
            type="search"
            value={query}
            placeholder={t("Chercher : CAN, cacao, élections…")}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {data && !loading ? (
        <p className="field-hint news-meta" aria-live="polite">
          {t("{n} articles · mis à jour à {heure}", {
            n: articles.length,
            heure: new Date(data.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          })}
          {data.failed.length ? ` · ${t("Indisponible pour le moment : {sources}", { sources: data.failed.join(", ") })}` : ""}
        </p>
      ) : null}

      {loading ? (
        <div className="news-grid" aria-busy="true" aria-label={t("Chargement des actualités")}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="news-card news-skeleton" aria-hidden="true">
              <span className="news-skel-img" />
              <span className="news-skel-line" />
              <span className="news-skel-line is-short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="empty">
          <p className="empty-title">{t("Pas d'actualités pour l'instant")}</p>
          <p className="empty-text">{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => void load(true)}>
            {t("Réessayer")}
          </button>
        </div>
      ) : !first ? (
        <div className="empty">
          <p className="empty-title">
            {needle ? t("Aucun article ne parle de « {mot} »", { mot: query.trim() }) : t("Rien sur {pays} pour le moment", { pays: t(countryName) })}
          </p>
          <p className="empty-text">
            {needle ? t("Essayez un autre mot, ou un autre sujet.") : t("Les médias suivis n'en parlent pas aujourd'hui. Regardez l'Afrique ou revenez plus tard.")}
          </p>
          {needle ? (
            <button type="button" className="btn btn-ghost" onClick={() => setQuery("")}>
              {t("Effacer la recherche")}
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setTab("afrique")}>
              {t("Voir l'Afrique")}
            </button>
          )}
        </div>
      ) : (
        <div className="news-grid">
          {[first, ...rest].map((article, i) => (
            <article key={article.id} className={`news-card${i === 0 ? " is-featured" : ""}`}>
              {article.image ? (
                <img
                  className="news-img"
                  src={article.image}
                  alt=""
                  loading={i < 3 ? "eager" : "lazy"}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.hidden = true;
                  }}
                />
              ) : null}
              <div className="news-body">
                <p className="news-source">
                  {article.source}
                  {article.date ? ` · ${dateTime(article.date.toISOString())}` : ""}
                </p>
                <h2 className="news-title">
                  <a href={article.link} target="_blank" rel="noreferrer">
                    {article.title}
                  </a>
                </h2>
                {article.summary ? <p className="news-summary">{article.summary}</p> : null}
                <div className="news-actions">
                  <a className="btn btn-ghost btn-sm" href={article.link} target="_blank" rel="noreferrer">
                    <Icon name="external" size={16} />
                    {t("Lire l'article")}
                  </a>
                  {canSpeak ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => speakArticle(article)} aria-label={t("Écouter : {titre}", { titre: article.title })}>
                      <Icon name="play" size={16} />
                      {t("Écouter")}
                    </button>
                  ) : null}
                  <a
                    className="btn btn-ghost btn-sm"
                    href={`https://wa.me/?text=${encodeURIComponent(`${article.title}\n${article.link}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t("Partager sur WhatsApp : {titre}", { titre: article.title })}
                  >
                    <Icon name="send" size={16} />
                    {t("WhatsApp")}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="field-hint news-credits">
        {t("Sources : RFI, France 24, Le Monde, BBC Afrique et Jeune Afrique. Chaque article s'ouvre sur le site du média.")}
      </p>
    </div>
  );
}
