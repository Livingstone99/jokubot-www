// Moteur commun à tous les parcours étape par étape.

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../api.js";
import { t } from "../prefs.js";
import { AppLink, Icon, Spinner } from "../ui.js";
import { Field, fieldId, validateField, type FieldDef, type FieldValue, type Values } from "./fields.js";

export type StepContext = {
  values: Values;
  set: (name: string, value: FieldValue) => void;
  next: () => void;
  back: () => void;
};

export type SubmitResult = void | { patch?: Values; stay?: boolean; notice?: string };

export type StepDef = {
  id: string;
  /** Nom court, dans la liste des étapes. */
  label: string;
  title: string | ((values: Values) => string);
  help?: ReactNode | ((values: Values) => ReactNode);
  fields?: FieldDef[] | ((values: Values) => FieldDef[]);
  /** Contenu propre à l'étape, affiché avant les champs. */
  render?: (context: StepContext) => ReactNode;
  /** Contenu affiché après les champs (ex. « Renvoyer le code »). */
  after?: (context: StepContext) => ReactNode;
  submitLabel?: string | ((values: Values) => string);
  /** L'étape avance seule (ex. téléphone relié) : pas de bouton « Continuer ». */
  hideSubmit?: boolean;
  onEnter?: (values: Values) => Values | void;
  /** Peut lancer une ApiError (avec `field`) pour afficher l'erreur au bon endroit. */
  onSubmit?: (values: Values, context: StepContext) => Promise<SubmitResult>;
};

export type FlowDef = {
  title: string;
  description: ReactNode;
  back: { to: string; label: string };
  steps: StepDef[];
  initial: Values;
  done: {
    title: string | ((values: Values) => string);
    text: ReactNode | ((values: Values) => ReactNode);
    primary: { label: string; to: string };
    secondary: { label: string; to: string };
  };
};

/** Traduit un contenu s'il s'agit d'un simple texte. */
function tx(node: ReactNode): ReactNode {
  return typeof node === "string" ? t(node) : node;
}

function resolve<T>(value: T | ((values: Values) => T), values: Values): T {
  return typeof value === "function" ? (value as (values: Values) => T)(values) : value;
}

type Leaf = Exclude<FieldDef, { kind: "group" }>;

function visibleLeaves(fields: FieldDef[], values: Values): Leaf[] {
  const out: Leaf[] = [];
  for (const field of fields) {
    if (field.when && !field.when(values)) continue;
    if (field.kind === "group") out.push(...visibleLeaves(field.fields, values));
    else out.push(field);
  }
  return out;
}

type WizardProps = {
  flow: FlowDef;
  /** « modal » : le parcours s'affiche dans une fenêtre au-dessus de la page. */
  variant?: "page" | "modal";
  onClose?: () => void;
};

export function Wizard({ flow, variant = "page", onClose }: WizardProps) {
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Values>(flow.initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const total = flow.steps.length + 1;
  const done = index >= flow.steps.length;
  const step = flow.steps[index];

  useEffect(() => {
    if (step?.onEnter) {
      const patch = step.onEnter(values);
      if (patch) setValues((v) => ({ ...v, ...patch }));
    }
    setErrors({});
    setFormError(null);
    setNotice(null);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (variant === "modal") scroller.current?.scrollTo({ top: 0 });
    else window.scrollTo({ top: 0 });
    heading.current?.focus();
    // `values` est volontairement lu une seule fois, à l'arrivée sur l'étape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const set = (name: string, value: FieldValue) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      if (!e[name]) return e;
      const { [name]: _removed, ...rest } = e;
      return rest;
    });
  };
  const next = () => setIndex((i) => Math.min(i + 1, flow.steps.length));
  const back = () => {
    if (index === 0) {
      if (onClose) onClose();
      else navigate(flow.back.to);
    }
    else setIndex((i) => i - 1);
  };
  const context: StepContext = { values, set, next, back };

  const focusField = (name: string) => {
    // Un champ dans un bloc replié : on l'ouvre d'abord.
    const group = (resolve(step?.fields ?? [], values) as FieldDef[]).find(
      (f) => f.kind === "group" && f.fields.some((child) => child.name === name),
    );
    if (group) setOpenGroups((g) => ({ ...g, [group.name]: true }));
    requestAnimationFrame(() => {
      const el = document.getElementById(fieldId(name));
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!step || busy) return;
    const fields = resolve(step.fields ?? [], values);
    const found: Record<string, string> = {};
    for (const field of visibleLeaves(fields, values)) {
      const message = validateField(field, values);
      if (message) found[field.name] = message;
    }
    setErrors(found);
    setFormError(null);
    setNotice(null);
    const firstError = Object.keys(found)[0];
    if (firstError) {
      focusField(firstError);
      return;
    }
    if (!step.onSubmit) return next();
    setBusy(true);
    try {
      const result = await step.onSubmit(values, context);
      if (result?.patch) setValues((v) => ({ ...v, ...result.patch }));
      if (result?.notice) setNotice(result.notice);
      if (!result?.stay) next();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("Une erreur est survenue. Réessayez dans un instant.");
      if (error instanceof ApiError && error.field) {
        setErrors({ [error.field]: message });
        focusField(error.field);
      } else {
        setFormError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const renderFields = (fields: FieldDef[]): ReactNode =>
    fields.map((field) => {
      if (field.when && !field.when(values)) return null;
      if (field.kind === "group") {
        const open = openGroups[field.name] ?? false;
        return (
          <div key={field.name} className={`fold${open ? " is-open" : ""}`}>
            <button
              type="button"
              className="fold-head"
              aria-expanded={open}
              aria-controls={`group-${field.name}`}
              onClick={() => setOpenGroups((g) => ({ ...g, [field.name]: !open }))}
            >
              {t(field.label)}
              <Icon name="chevron" size={18} className="fold-icon" />
            </button>
            <div id={`group-${field.name}`} className="fold-body" hidden={!open}>
              {renderFields(field.fields)}
            </div>
          </div>
        );
      }
      return <Field key={field.name} field={field} value={values[field.name]} error={errors[field.name]} onChange={(v) => set(field.name, v)} />;
    });

  const labels = [...flow.steps.map((s) => t(s.label)), t("Terminé")];
  const stepList = (
    <ol className="wz-steps">
      {labels.map((label, i) => {
        const state = i < index ? "done" : i === index ? "current" : "todo";
        return (
          <li key={label} className={`wz-step is-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="wz-dot" aria-hidden="true">
              {state === "done" ? <Icon name="check" size={14} /> : i + 1}
            </span>
            <span className="wz-step-label">
              {label}
              {state === "done" ? <span className="sr-only"> {t("(fait)")}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );

  // Dans la fenêtre, seules les consignes détaillées (listes, liens) sont gardées ;
  // les simples phrases d'explication sont retirées.
  const resolvedHelp = step?.help ? resolve(step.help, values) : null;
  const help = typeof resolvedHelp === "string" ? t(resolvedHelp) : resolvedHelp;
  const helpNode = variant === "modal" && typeof help === "string" ? null : help;

  const body = done ? (
    <div className="wz-done" key="done">
      <span className="done-check" aria-hidden="true">
        <svg viewBox="0 0 52 52" width="72" height="72">
          <circle cx="26" cy="26" r="24" />
          <path d="M15 27l7 7 15-16" />
        </svg>
      </span>
      <h1 className="wz-title" tabIndex={-1} ref={heading}>
        {t(resolve(flow.done.title, values))}
      </h1>
      <p className="wz-help">{tx(resolve(flow.done.text, values))}</p>
      <div className="wz-done-actions">
        <AppLink to={flow.done.primary.to} className="btn btn-primary">
          {t(flow.done.primary.label)}
        </AppLink>
        <AppLink to={flow.done.secondary.to} className="btn btn-ghost">
          {t(flow.done.secondary.label)}
        </AppLink>
      </div>
    </div>
  ) : step ? (
    <form className="wz-form" key={step.id} onSubmit={submit} noValidate>
      {variant === "modal" ? null : (
        <p className="wz-count">
          {t("Étape {n} sur {total}", { n: index + 1, total })}
        </p>
      )}
      {/* Dans la fenêtre, les étapes du haut suffisent : le titre reste pour les lecteurs d'écran. */}
      <h1 className={variant === "modal" ? "sr-only" : "wz-title"} tabIndex={-1} ref={heading}>
        {t(resolve(step.title, values))}
      </h1>
      {helpNode ? <div className="wz-help">{helpNode}</div> : null}
      {step.render ? step.render(context) : null}
      <div className="wz-fields">{renderFields(resolve(step.fields ?? [], values))}</div>
      {step.after ? step.after(context) : null}
      {notice ? (
        <p className="form-notice" role="status">
          {notice}
        </p>
      ) : null}
      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="wz-actions">
        <button type="button" className="btn btn-ghost" onClick={back} disabled={busy}>
          {index === 0 && variant === "modal" ? t("Annuler") : t("Retour")}
        </button>
        {step.hideSubmit ? null : (
          <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy}>
            {busy ? <Spinner /> : null}
            {t(resolve(step.submitLabel ?? "Continuer", values))}
          </button>
        )}
      </div>
    </form>
  ) : null;

  if (variant === "modal") {
    return (
      <div className="wzm">
        <header className="wzm-head">
          <div className="wzm-head-row">
            <p className="wzm-title" id="wzm-title">
              {t(flow.title)}
            </p>
            <button type="button" className="icon-btn wzm-close" onClick={onClose} aria-label={t("Fermer")}>
              <Icon name="close" />
            </button>
          </div>
          {stepList}
        </header>
        <div className="wzm-body" ref={scroller}>
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="wz">
      <aside className="wz-panel">
        <div className="wz-panel-inner">
          <AppLink to={flow.back.to} className="wz-back">
            <Icon name="back" size={18} />
            {t(flow.back.label)}
          </AppLink>
          <p className="wz-kicker">{t(flow.title)}</p>
          <p className="wz-desc">{tx(flow.description)}</p>
          {stepList}
        </div>
      </aside>
      <main className="wz-main" id="contenu">
        {body}
      </main>
    </div>
  );
}
