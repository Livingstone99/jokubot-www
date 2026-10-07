import { useState, type FormEvent } from "react";

import * as api from "../../api.js";
import { salesTotals, useDb, type Sale } from "../../db.js";
import { amount, dateTime, plural } from "../../format.js";
import { locale, t } from "../../prefs.js";
import { triggerDownload } from "../../poster.js";
import { Empty, Icon, Spinner, useConfirm, useToast } from "../../ui.js";
import { Field, str, type FieldDef } from "../../wizard/fields.js";
import { useForm } from "../../wizard/useForm.js";
import { SALE_STATUS, SaleStatus, Section } from "./shared.js";

type Leaf = Exclude<FieldDef, { kind: "group" }>;

const FIELDS: Leaf[] = [
  { kind: "text", name: "saleLabel", label: "Ce qui a été vendu", placeholder: "Pagne super wax", required: "Indiquez ce qui a été vendu." },
  {
    kind: "number",
    name: "saleAmount",
    label: "Montant (FCFA)",
    inputMode: "numeric",
    placeholder: "12000",
    required: "Indiquez le montant de la vente.",
    validate: (v) => (Number(str(v)) > 0 ? null : "Le montant doit être un nombre positif, sans espace. Exemple : 12000"),
  },
  { kind: "text", name: "saleClient", label: "Client", optional: true, placeholder: "Aya Konaté" },
  { kind: "text", name: "saleRef", label: "Référence", optional: true, placeholder: "NF-48213" },
];

export function exportCsv(sales: Sale[], currency: string) {
  const rows = [
    [t("Date"), t("Libellé"), t("Client"), t("Référence"), t("Montant ({devise})", { devise: currency }), t("Statut")],
    ...sales.map((s) => [
      new Date(s.at).toLocaleString(locale()),
      s.label,
      s.client,
      s.reference,
      String(s.amount),
      t(SALE_STATUS[s.status].label),
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\r\n");
  // Le BOM permet à Excel de lire les accents correctement.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `ventes-jokubot-${new Date().toISOString().slice(0, 10)}.csv`);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function SalesTable({ sales, currency, showSource = true }: { sales: Sale[]; currency: string; showSource?: boolean }) {
  const confirm = useConfirm();
  const toast = useToast();
  if (sales.length === 0) return <Empty title="Aucune vente pour l'instant">{t("Ajoutez une vente ou dites « j'ai vendu… » à JokuBot.")}</Empty>;
  return (
    <div className="table-scroll" role="region" aria-label={t("Tableau des ventes")} tabIndex={0}>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{t("Date")}</th>
            <th scope="col">{t("Libellé")}</th>
            <th scope="col">{t("Client")}</th>
            <th scope="col">{t("Référence")}</th>
            <th scope="col" className="num">
              {t("Montant")}
            </th>
            <th scope="col">{t("Statut")}</th>
            <th scope="col">
              <span className="sr-only">{t("Actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} className={sale.status === "refusee" ? "is-refused" : undefined}>
              <td className="nowrap">{dateTime(sale.at)}</td>
              <td>
                {sale.label}
                {showSource && sale.source === "jokubot" ? <span className="cell-note">{t("Dicté à JokuBot")}</span> : null}
                {showSource && sale.source === "nafolo" ? <span className="cell-note">{t("Paiement Nafolo")}</span> : null}
              </td>
              <td>{sale.client || <span className="muted">—</span>}</td>
              <td className="mono-text">{sale.reference || <span className="muted">—</span>}</td>
              <td className="num nowrap">
                {amount(sale.amount)} {currency}
              </td>
              <td>
                <SaleStatus status={sale.status} />
              </td>
              <td>
                <div className="row-actions">
                  {sale.status === "a_verifier" ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={async () => {
                          await api.setSaleStatus(sale.id, "validee");
                          toast(sale.client ? t("Paiement de {client} validé", { client: sale.client }) : t("Paiement validé"));
                        }}
                      >
                        {t("Valider")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={async () => {
                          await api.setSaleStatus(sale.id, "refusee");
                          toast(t("Paiement refusé. Il ne compte pas dans vos ventes."));
                        }}
                      >
                        {t("Refuser")}
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t("Supprimer la vente : {vente}", { vente: sale.label })}
                    onClick={async () => {
                      const ok = await confirm({
                        title: t("Supprimer cette vente ?"),
                        text: t("{vente}, {montant}. Elle disparaîtra aussi de vos rapports.", { vente: sale.label, montant: `${amount(sale.amount)} ${currency}` }),
                        confirm: t("Supprimer la vente"),
                        danger: true,
                      });
                      if (!ok) return;
                      await api.removeSale(sale.id);
                      toast(t("Vente supprimée"));
                    }}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ComptaSpace() {
  const db = useDb();
  const toast = useToast();
  const currency = db.engines.comptabilite?.currency ?? "FCFA";
  const totals = salesTotals(db.sales);
  const form = useForm({ saleLabel: "", saleAmount: "", saleClient: "", saleRef: "" });
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.check(FIELDS)) return;
    setAdding(true);
    try {
      await api.addSale({
        label: str(form.values.saleLabel).trim(),
        amount: Math.round(Number(str(form.values.saleAmount))),
        client: str(form.values.saleClient).trim(),
        reference: str(form.values.saleRef).trim(),
      });
      form.setValues({ saleLabel: "", saleAmount: "", saleClient: "", saleRef: "" });
      toast(t("Vente ajoutée"));
    } finally {
      setAdding(false);
    }
  };

  const stats = [
    { label: "Aujourd'hui", value: totals.today.total, note: plural(totals.today.count, "vente", "ventes") },
    { label: "Cette semaine", value: totals.week.total, note: plural(totals.week.count, "vente", "ventes") },
    { label: "Ce mois-ci", value: totals.month.total, note: plural(totals.month.count, "vente", "ventes") },
    { label: "À vérifier", value: totals.pending.total, note: plural(totals.pending.count, "paiement", "paiements"), alert: totals.pending.count > 0 },
  ];

  return (
    <div className="space">
      <div className="stats">
        {stats.map((stat) => (
          <div key={stat.label} className={`stat${stat.alert ? " is-alert" : ""}`}>
            <p className="stat-label">{t(stat.label)}</p>
            <p className="stat-value">
              {amount(stat.value)} <span className="stat-unit">{currency}</span>
            </p>
            <p className="stat-note">{stat.note}</p>
          </div>
        ))}
      </div>

      <div className="space-cols">
        <Section title="Ajouter une vente">
          <form className="card-form" onSubmit={add} noValidate>
            <div className="form-grid">
              {FIELDS.map((field) => (
                <Field key={field.name} {...form.bind(field)} />
              ))}
            </div>
            <button type="submit" className="btn btn-primary" disabled={adding} aria-busy={adding}>
              {adding ? <Spinner /> : <Icon name="plus" size={18} />}
              {t("Ajouter la vente")}
            </button>
          </form>
        </Section>

        <Section title="Rapport">
          <div className="card-form">
            <p className="muted-text">
              {db.engines.comptabilite?.reportFrequency === "lundi"
                ? t("Vous recevez un rapport chaque lundi.")
                : db.engines.comptabilite?.reportFrequency === "mois"
                  ? t("Vous recevez un rapport le 1er de chaque mois.")
                  : t("Vous recevez un rapport chaque soir à 20 h.")}{" "}
              {db.engines.comptabilite?.reportChannel === "email" ? t("Par e-mail.") : t("Sur WhatsApp.")}
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={sending}
                aria-busy={sending}
                onClick={async () => {
                  setSending(true);
                  setError(null);
                  try {
                    toast(await api.sendReport());
                  } catch (err) {
                    setError(err instanceof Error ? err.message : t("L'envoi a échoué. Réessayez."));
                  } finally {
                    setSending(false);
                  }
                }}
              >
                {sending ? <Spinner /> : <Icon name="send" size={18} />}
                {t("Envoyer le rapport maintenant")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => exportCsv(db.sales, currency)} disabled={db.sales.length === 0}>
                <Icon name="download" size={18} />
                {t("Télécharger (Excel)")}
              </button>
            </div>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </Section>
      </div>

      <Section title="Ventes" aside={<span className="muted-text">{plural(db.sales.length, "ligne", "lignes")}</span>}>
        <SalesTable sales={db.sales} currency={currency} />
      </Section>
    </div>
  );
}
