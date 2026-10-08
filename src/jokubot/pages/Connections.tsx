import { useEffect, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { NETWORKS } from "../catalog.js";
import { connectionOf, useDb, type NetworkId } from "../db.js";
import { CHANNEL_FLOWS, postfastFlow } from "../flows/channels.js";
import { t } from "../prefs.js";
import { isSocial, SocialLogo } from "../social.js";
import { AppLink, Monogram, PageHeader, Rich } from "../ui.js";
import { FlowModal } from "../wizard/FlowModal.js";

const MESSAGING: NetworkId[] = ["whatsapp", "telegram"];

function MessagingCards() {
  const db = useDb();
  return (
    <ul className="net-grid net-grid-2">
      {NETWORKS.filter((net) => MESSAGING.includes(net.id)).map((net, i) => {
        const connection = connectionOf(db, net.id);
        return (
          <li key={net.id} className="net-item" style={{ "--i": i } as CSSProperties}>
            <div className={`net-card is-clickable${connection.connected ? " is-on" : ""}`}>
              <p className="net-state">
                <span className={`dot${connection.connected ? " is-on" : ""}`} aria-hidden="true" />
                {connection.connected ? t("Connecté") : t("Non connecté")}
              </p>
              <div className="net-top">
                <Monogram id={net.id} filled={connection.connected} />
                <div className="net-heading">
                  <h3 className="net-name">{net.name}</h3>
                  {connection.connected && connection.account ? <p className="net-account">{connection.account}</p> : null}
                </div>
              </div>
              <AppLink
                to={`/connecter/${net.id}`}
                className={`btn btn-block net-cta ${connection.connected ? "btn-ghost" : "btn-primary"}`}
              >
                {connection.connected ? t("Reconnecter {reseau}", { reseau: net.cta }) : t("Connecter {reseau}", { reseau: net.cta })}
              </AppLink>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function YouTubeGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4v11H3zM9.5 9.5h3.8v1.6c.6-1 1.9-1.9 3.8-1.9 3.6 0 4.4 2.3 4.4 5.4v5.9h-4v-5.2c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.3h-4z" />
    </svg>
  );
}

/** Une case PostFast : tous les réseaux sociaux avec une seule clé. */
function PostFastCard() {
  const db = useDb();
  const connected = Boolean(db.postfast?.connected);
  const firstNetwork = db.postfast?.networks[0] ?? "facebook";
  const logos = [
    <SocialLogo key="facebook" id="facebook" size={22} />,
    <SocialLogo key="instagram" id="instagram" size={22} />,
    <YouTubeGlyph key="youtube" />,
    <SocialLogo key="x" id="x" size={20} />,
    <LinkedInGlyph key="linkedin" />,
    <SocialLogo key="tiktok" id="tiktok" size={20} />,
  ];
  return (
    // Connectée, la case ouvre l'espace du premier réseau relié ; sinon, la connexion.
    <AppLink to={connected ? `/reseaux/${firstNetwork}` : "/connecter/postfast"} className={`postfast-card${connected ? " is-on" : ""}`}>
      <p className="net-state">
        <span className={`dot${connected ? " is-on" : ""}`} aria-hidden="true" />
        {connected ? t("Connecté") : t("Non connecté")}
      </p>
      <span className="postfast-logos" aria-hidden="true">
        {logos.map((logo, i) => (
          <span key={i} className="postfast-logo">
            {logo}
          </span>
        ))}
      </span>
      <span className="postfast-name">PostFast</span>
      <span className="postfast-sub">
        {connected
          ? t("{n} réseaux reliés", { n: db.postfast?.networks.length ?? 0 })
          : t("Tous vos réseaux sociaux avec une seule clé")}
      </span>
      <span className={`btn btn-block ${connected ? "btn-ghost" : "btn-primary"}`}>
        {connected ? t("Gérer mes réseaux") : t("Connecter PostFast")}
      </span>
    </AppLink>
  );
}

export function ConnectionsPage() {
  const db = useDb();
  const navigate = useNavigate();
  const { network: opened } = useParams();
  const isPostFast = opened === "postfast";
  const openedId = opened && NETWORKS.some((n) => n.id === opened) ? (opened as NetworkId) : null;
  // Compteur : WhatsApp, Telegram et PostFast (qui regroupe les réseaux sociaux).
  const count = MESSAGING.filter((id) => connectionOf(db, id).connected).length + (db.postfast?.connected ? 1 : 0);
  const total = MESSAGING.length + 1;

  useEffect(() => {
    // Adresse d'un réseau inconnu : retour à la liste.
    if (opened && !openedId && !isPostFast) navigate("/", { replace: true });
  }, [opened, openedId, isPostFast, navigate]);

  useEffect(() => {
    document.title = `${t("Connexions")} · JokuBot`;
  }, []);

  const flow = isPostFast ? postfastFlow : openedId ? CHANNEL_FLOWS[openedId] : undefined;
  // Fermer la connexion d'un réseau social ramène à son espace.
  const closeTo = openedId && isSocial(openedId) ? `/reseaux/${openedId}` : "/";

  return (
    <div className="page">
      <PageHeader
        title={t("Connexions")}
        back={{ to: "/accueil", label: t("Accueil") }}
        subtitle={t("Reliez les messageries où vos clients vous écrivent. JokuBot leur répond à votre place.")}
        aside={
          <p className="counter" aria-live="polite">
            <Rich text={count > 1 ? "**{n}** connectés sur {total}" : "**{n}** connecté sur {total}"} vars={{ n: count, total }} />
          </p>
        }
      />

      {/* Messageries et PostFast, côte à côte sur ordinateur. */}
      <div className="connect-top">
        <section className="net-group" aria-label={t("Messageries")}>
          <MessagingCards />
        </section>

        <section className="net-group" aria-label={t("Tous les réseaux")}>
          <PostFastCard />
        </section>
      </div>


      {flow ? <FlowModal key={opened} flow={flow} onClose={() => navigate(closeTo)} /> : null}
    </div>
  );
}
