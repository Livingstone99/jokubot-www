// Éléments communs aux espaces des moteurs.

import type { ReactNode } from "react";

import type { Creation, Sale } from "../../db.js";
import { posterUrl } from "../../poster.js";
import { t } from "../../prefs.js";
import { StatusPill } from "../../ui.js";

export function Section({ title, aside, children, id }: { title: string; aside?: ReactNode; children: ReactNode; id?: string }) {
  const headingId = id ?? `s-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section className="section" aria-labelledby={headingId}>
      <div className="section-head">
        <h2 id={headingId} className="section-title">
          {t(title)}
        </h2>
        {aside ? <div className="section-aside">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Thumb({ creation, size = 56 }: { creation: Creation | undefined; size?: number }) {
  if (!creation) {
    return (
      <span className="thumb thumb-none" style={{ width: size, height: size }} aria-hidden="true">
        {t("Texte")}
      </span>
    );
  }
  return (
    <img
      className="thumb"
      src={posterUrl(creation.svg)}
      alt=""
      width={size}
      height={creation.format === "vertical" ? Math.round(size * 1.6) : size}
      loading="lazy"
    />
  );
}

/** Choix d'un visuel parmi les créations, en cartes radio. */
export function VisualPicker({
  name,
  creations,
  value,
  onChange,
  allowNone,
}: {
  name: string;
  creations: Creation[];
  value: string;
  onChange: (id: string) => void;
  allowNone?: boolean;
}) {
  const options = [...(allowNone ? [{ id: "", label: t("Sans visuel") }] : []), ...creations.slice(0, 8).map((c) => ({ id: c.id, label: c.description }))];
  return (
    <fieldset className="field">
      <legend className="field-label">{t("Visuel")}</legend>
      <div className="visuals">
        {options.map((option, index) => {
          const creation = creations.find((c) => c.id === option.id);
          const checked = value === option.id;
          return (
            <label key={option.id || "none"} className={`visual-opt${checked ? " is-checked" : ""}`}>
              <input
                id={index === 0 ? `f-${name}` : undefined}
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange(option.id)}
                className="sr-only"
              />
              <Thumb creation={creation} size={72} />
              <span className="visual-label">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export const SALE_STATUS: Record<Sale["status"], { label: string; tone: "solid" | "outline" | "muted" }> = {
  validee: { label: "Validée", tone: "solid" },
  a_verifier: { label: "À vérifier", tone: "outline" },
  refusee: { label: "Refusée", tone: "muted" },
};

export function SaleStatus({ status }: { status: Sale["status"] }) {
  const info = SALE_STATUS[status];
  return <StatusPill tone={info.tone}>{t(info.label)}</StatusPill>;
}
