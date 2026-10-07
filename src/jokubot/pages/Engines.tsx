import { useEffect, useState, type CSSProperties } from "react";

import * as api from "../api.js";
import { ENGINES, engineState } from "../catalog.js";
import { useDb } from "../db.js";
import { t } from "../prefs.js";
import { AppLink, Icon, PageHeader, Switch, useToast } from "../ui.js";

export function EnginesPage() {
  const db = useDb();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const serviceReady = Boolean(db.engines["service-client"]);

  useEffect(() => {
    document.title = `${t("Services")} · JokuBot`;
  }, []);

  return (
    <div className="page">
      <PageHeader title={t("Services")} subtitle={t("Les services que JokuBot fait tourner pour votre activité. Touchez une carte pour le régler.")} />

      <div className="auto-switch">
        <Switch
          label={t("Réponses automatiques")}
          description={
            !serviceReady
              ? t("Activez d'abord le service client pour que JokuBot réponde à vos clients.")
              : db.autoReplies
                ? t("JokuBot répond seul à vos clients.")
                : t("En pause : vos clients ne reçoivent plus de réponse automatique.")
          }
          checked={serviceReady && db.autoReplies}
          disabled={!serviceReady || saving}
          onChange={async (next) => {
            setSaving(true);
            await api.setAutoReplies(next);
            setSaving(false);
            toast(next ? t("Réponses automatiques activées") : t("Réponses automatiques en pause"));
          }}
        />
      </div>

      <ul className="engine-grid">
        {ENGINES.map((info, i) => {
          const configured = engineState(db, info.id) !== "off";
          const to = configured ? `/moteurs/${info.id}` : `/moteurs/${info.id}/reglages`;
          const action = configured ? t("Ouvrir") : t("Configurer");
          return (
            <li key={info.id} className="engine-item" style={{ "--i": i } as CSSProperties}>
              {/* Toute la carte est un lien : un clic n'importe où l'ouvre. */}
              <AppLink to={to} className="engine-card">
                <div className="engine-head">
                  <span className="engine-num" aria-hidden="true">
                    {info.number}
                  </span>
                  <h2 className="engine-name">{t(info.name)}</h2>
                </div>
                <p className="engine-desc">{t(info.description)}</p>
                <span className="engine-foot">
                  <span className="engine-btn">
                    {action}
                    <Icon name="arrow" size={18} />
                  </span>
                </span>
              </AppLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
