import { useEffect, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { NETWORKS } from "../catalog.js";
import { connectionOf, useDb, type NetworkId } from "../db.js";
import { CHANNEL_FLOWS } from "../flows/channels.js";
import { t } from "../prefs.js";
import { isSocial, SOCIAL_IDS, SocialLogo } from "../social.js";
import { AppLink, Monogram, PageHeader, Rich } from "../ui.js";
import { FlowModal } from "../wizard/FlowModal.js";

const MESSAGING: NetworkId[] = ["whatsapp", "telegram"];

function MessagingCards() {
  const db = useDb();
  return (
    <ul className="net-grid">
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

/** Les 4 réseaux sociaux : logo, nom, statut, et « Connecter » ou « Gérer ». */
function SocialCards() {
  const db = useDb();
  return (
    <ul className="social-grid">
      {SOCIAL_IDS.map((id, i) => {
        const net = NETWORKS.find((n) => n.id === id);
        if (!net) return null;
        const connection = connectionOf(db, id);
        return (
          <li key={id} className="net-item" style={{ "--i": i } as CSSProperties}>
            <div className={`social-card${connection.connected ? " is-on" : ""}`}>
              {/* Un clic sur la carte ouvre l'espace du réseau (voir .social-open::after). */}
              <AppLink to={`/reseaux/${id}`} className="social-open">
                <span className="social-logo" aria-hidden="true">
                  <SocialLogo id={id} size={26} />
                </span>
                <span className="social-name">{net.name}</span>
              </AppLink>
              <p className="net-state">
                <span className={`dot${connection.connected ? " is-on" : ""}`} aria-hidden="true" />
                {connection.connected ? t("Connecté") : t("Non connecté")}
              </p>
              <p className="social-account">{connection.connected && connection.account ? connection.account : " "}</p>
              {connection.connected ? (
                <AppLink to={`/reseaux/${id}`} className="btn btn-block btn-ghost social-btn">
                  {t("Gérer")}
                </AppLink>
              ) : (
                <AppLink to={`/connecter/${id}`} className="btn btn-block btn-primary social-btn">
                  {t("Connecter")}
                </AppLink>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ConnectionsPage() {
  const db = useDb();
  const navigate = useNavigate();
  const { network: opened } = useParams();
  const openedId = opened && NETWORKS.some((n) => n.id === opened) ? (opened as NetworkId) : null;
  const count = NETWORKS.filter((n) => connectionOf(db, n.id).connected).length;

  useEffect(() => {
    // Adresse d'un réseau inconnu : retour à la liste.
    if (opened && !openedId) navigate("/", { replace: true });
  }, [opened, openedId, navigate]);

  useEffect(() => {
    document.title = `${t("Connexions")} · JokuBot`;
  }, []);

  const flow = openedId ? CHANNEL_FLOWS[openedId] : undefined;
  // Fermer la connexion d'un réseau social ramène à son espace.
  const closeTo = openedId && isSocial(openedId) ? `/reseaux/${openedId}` : "/";

  return (
    <div className="page">
      <PageHeader
        title={t("Connexions")}
        subtitle={t("Reliez les messageries où vos clients vous écrivent. JokuBot leur répond à votre place.")}
        aside={
          <p className="counter" aria-live="polite">
            <Rich text={count > 1 ? "**{n}** connectés sur {total}" : "**{n}** connecté sur {total}"} vars={{ n: count, total: NETWORKS.length }} />
          </p>
        }
      />

      <section className="net-group" aria-labelledby="group-messageries">
        <div className="net-group-head">
          <h2 id="group-messageries" className="net-group-title">
            {t("Messageries")}
          </h2>
          <p className="net-group-sub">{t("Vos clients vous écrivent ici. JokuBot leur répond.")}</p>
        </div>
        <MessagingCards />
      </section>

      <section className="net-group" aria-labelledby="group-reseaux">
        <div className="net-group-head">
          <h2 id="group-reseaux" className="net-group-title">
            {t("Réseaux sociaux")}
          </h2>
          <p className="net-group-sub">{t("Gérés par PostFast. Touchez un réseau pour voir ses options.")}</p>
        </div>
        <SocialCards />
      </section>

      {openedId && flow ? <FlowModal key={openedId} flow={flow} onClose={() => navigate(closeTo)} /> : null}
    </div>
  );
}
