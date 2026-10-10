// Accueil : une carte par partie de l'espace.

import { useEffect } from "react";

import { useDb } from "../db.js";
import { t } from "../prefs.js";
import { AppLink, Icon, PageHeader, type IconName } from "../ui.js";

// `soon` : outil pas encore ouvert, la carte annonce « À venir » et ne mène nulle part.
type Card = { to: string; title: string; text: string; icon: IconName; soon?: boolean };

/** Les outils de l'Accueil, après Connexions. */
const FEATURES: Card[] = [
  {
    to: "/audio",
    title: "Audio",
    text: "Parlez, JokuBot clone votre voix et répète vos mots dans la langue de votre choix.",
    icon: "mic",
  },
  {
    to: "/images",
    title: "Génération d'images",
    text: "Décrivez une image, JokuBot la crée pour vos produits et vos publications.",
    icon: "image",
    soon: true,
  },
  {
    to: "/videos",
    title: "Génération de vidéos",
    text: "Transformez une idée ou une photo en courte vidéo pour vos réseaux.",
    icon: "video",
    soon: true,
  },
  {
    to: "/actualites",
    title: "Actualités",
    text: "Les informations du monde, résumées pour vous chaque jour.",
    icon: "news",
  },
];

const CARDS: Card[] = [
  { to: "/", title: "Connexions", text: "WhatsApp, Telegram et vos réseaux sociaux.", icon: "plug" },
  ...FEATURES,
];

export function HomePage() {
  const db = useDb();

  useEffect(() => {
    document.title = `${t("Accueil")} · JokuBot`;
  }, []);

  return (
    <div className="page">
      <PageHeader
        title={db.account?.firstName ? t("Bonjour {prenom}", { prenom: db.account.firstName }) : t("Accueil")}
        subtitle={t("Tout votre espace JokuBot, en un coup d'œil.")}
      />
      <div className="home-grid">
        {CARDS.map((card) => {
          const body = (
            <>
              <span className="home-card-icon" aria-hidden="true">
                <Icon name={card.icon} size={22} />
              </span>
              <span className="home-card-title">{t(card.title)}</span>
              <span className="home-card-text">{t(card.text)}</span>
            </>
          );
          return card.soon ? (
            <div key={card.to} className="home-card is-soon">
              {body}
              <span className="home-card-soon">{t("À venir")}</span>
            </div>
          ) : (
            <AppLink key={card.to} to={card.to} className="home-card">
              {body}
              <span className="home-card-cta">
                {t("Ouvrir")}
                <Icon name="arrow" size={18} />
              </span>
            </AppLink>
          );
        })}
      </div>
    </div>
  );
}
