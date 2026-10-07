import { useDb } from "../../db.js";
import { plural } from "../../format.js";
import { t } from "../../prefs.js";
import { Rich } from "../../ui.js";
import { SalesTable } from "./Compta.js";
import { Section } from "./shared.js";

export function NafoloSpace() {
  const db = useDb();
  const settings = db.engines.nafolo;
  if (!settings) return null;
  const payments = db.sales.filter((s) => s.source === "nafolo");
  const pending = payments.filter((s) => s.status === "a_verifier").length;
  return (
    <div className="space">
      <div className="space-cols">
        <Section title="Ce que reçoivent vos clients">
          <div className="preview-chat">
            <div className="bubble-row is-me">
              <div className="bubble bubble-bot">
                {settings.mode === "lien" ? (
                  <Rich text="Pour payer votre commande, utilisez ce lien : {lien}. Le paiement est au nom de **{nom}**." vars={{ lien: settings.link, nom: settings.displayName }} />
                ) : (
                  <Rich text="Pour payer votre commande, envoyez l'argent au **{numero}**. Le paiement est au nom de **{nom}**." vars={{ numero: settings.number, nom: settings.displayName }} />
                )}
                <br />
                <br />
                {t("Envoyez-moi ensuite la capture d'écran du paiement : je vérifie et je confirme votre commande.")}
                <span className="bubble-meta">JokuBot</span>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Comment JokuBot vérifie une capture">
          <ol className="checks-list">
            <li>
              <Rich text="**Le montant** correspond au prix de la commande." />
            </li>
            <li>
              <Rich text="**La référence** n'a jamais été utilisée : une même capture ne peut pas servir deux fois." />
            </li>
            <li>
              <Rich text="**Le destinataire** est bien vous : {nom}." vars={{ nom: settings.displayName }} />
            </li>
          </ol>
          <p className="muted-text">
            {settings.validation === "auto"
              ? t("Si les trois sont bons, JokuBot confirme la commande seul. Sinon, le paiement attend votre avis ci-dessous.")
              : t("JokuBot met chaque paiement de côté : c'est vous qui le validez ci-dessous.")}
          </p>
        </Section>
      </div>

      <Section
        title="Paiements reçus"
        aside={pending ? <span className="muted-text">{plural(pending, "paiement à vérifier", "paiements à vérifier")}</span> : null}
      >
        <SalesTable sales={payments} currency={db.engines.comptabilite?.currency ?? "FCFA"} showSource={false} />
      </Section>
    </div>
  );
}
