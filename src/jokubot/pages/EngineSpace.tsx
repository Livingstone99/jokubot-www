import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";

import { engine, engineState } from "../catalog.js";
import { useDb } from "../db.js";
import { t } from "../prefs.js";
import { AppLink, Icon, PageHeader } from "../ui.js";
import { ComptaSpace } from "./spaces/Compta.js";
import { CreationSpace } from "./spaces/Creation.js";
import { MetaSpace } from "./spaces/Meta.js";
import { NafoloSpace } from "./spaces/Nafolo.js";
import { ReseauxSpace } from "./spaces/Reseaux.js";

export function EngineSpacePage() {
  const { id = "" } = useParams();
  const db = useDb();
  const info = engine(id);

  useEffect(() => {
    if (info) document.title = `${t(info.name)} · JokuBot`;
  }, [info]);

  if (!info) return <Navigate to="/moteurs" replace />;
  // Pas encore réglé : on ouvre le parcours de réglage.
  if (engineState(db, info.id) === "off")
    return <Navigate to={`/moteurs/${info.id}/reglages`} replace />;

  return (
    <div className="page">
      <PageHeader
        back={{ to: "/moteurs", label: t("Services") }}
        title={t(info.name)}
        subtitle={t(info.description)}
        aside={
          // Le service client a déjà son bouton vers le même formulaire.
          info.id === "service-client" ? undefined : (
            <AppLink to={`/moteurs/${info.id}/reglages`} className="btn btn-ghost btn-sm">
              <Icon name="settings" size={18} />
              {t("Réglages")}
            </AppLink>
          )
        }
      />
      {info.id === "service-client" ? <ServiceClientSpace /> : null}
      {info.id === "comptabilite" ? <ComptaSpace /> : null}
      {info.id === "nafolo" ? <NafoloSpace /> : null}
      {info.id === "creation" ? <CreationSpace /> : null}
      {info.id === "reseaux" ? <ReseauxSpace /> : null}
      {info.id === "meta" ? <MetaSpace /> : null}
    </div>
  );
}

function ServiceClientSpace() {
  const db = useDb();
  const settings = db.engines["service-client"];
  if (!settings) return null;

  return (
    <div className="space">
      <div className="space-links">
        {/* Même formulaire que le bouton « Réglages ». */}
        <AppLink
          to="/moteurs/service-client/reglages"
          className="btn btn-primary"
        >
          {t("Apprendre mon activité à JokuBot")}
        </AppLink>
      </div>
    </div>
  );
}
