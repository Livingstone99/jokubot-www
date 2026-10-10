// Les types de champs du moteur de parcours, et leur validation.

import { useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";

import { COUNTRIES, countryByDial, phoneDigits } from "../format.js";
import { getLang, t } from "../prefs.js";
import { Icon } from "../ui.js";

export type PhoneValue = { dial: string; number: string };
export type RangeValue = { from: string; to: string };
export type FieldValue = string | string[] | PhoneValue | RangeValue | undefined;
export type Values = Record<string, FieldValue>;

export type Option = { value: string; label: string; description?: string; disabled?: boolean; badge?: string };

type Base = {
  name: string;
  label: string;
  hint?: ReactNode;
  optional?: boolean;
  when?: (values: Values) => boolean;
  validate?: (value: FieldValue, values: Values) => string | null;
  /** Message quand le champ obligatoire est vide. */
  required?: string;
};

export type InputField = Base & {
  kind: "text" | "email" | "time" | "url" | "number" | "datetime";
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "decimal" | "email" | "url" | "tel";
};
export type FieldDef =
  | InputField
  | (Base & { kind: "phone" })
  | (Base & { kind: "secret"; placeholder?: string; autoComplete?: string })
  | (Base & { kind: "textarea"; placeholder?: string; rows?: number })
  | (Base & { kind: "select"; options: Option[] })
  | (Base & { kind: "radio"; options: Option[]; columns?: 1 | 2 | 3 })
  | (Base & { kind: "checks"; options: Option[]; empty?: ReactNode; columns?: 1 | 2 | 3 })
  | (Base & { kind: "code"; length: number })
  | (Base & { kind: "range" })
  | { kind: "group"; name: string; label: string; fields: FieldDef[]; when?: (values: Values) => boolean };

export function str(value: FieldValue): string {
  return typeof value === "string" ? value : "";
}
export function list(value: FieldValue): string[] {
  return Array.isArray(value) ? value : [];
}
export function phone(value: FieldValue): PhoneValue {
  return value && typeof value === "object" && "dial" in value ? value : { dial: "+225", number: "" };
}
export function range(value: FieldValue): RangeValue {
  return value && typeof value === "object" && "from" in value ? value : { from: "", to: "" };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Renvoie le message d'erreur du champ, ou null s'il est valide. */
export function validateField(field: Exclude<FieldDef, { kind: "group" }>, values: Values): string | null {
  const value = values[field.name];
  const isEmpty = (() => {
    switch (field.kind) {
      case "checks":
        return list(value).length === 0;
      case "phone":
        return phone(value).number.trim() === "";
      case "range": {
        const r = range(value);
        return !r.from || !r.to;
      }
      default:
        return str(value).trim() === "";
    }
  })();

  if (isEmpty) {
    if (field.optional) return null;
    if (field.required) return t(field.required);
    switch (field.kind) {
      case "checks":
        return t("Choisissez au moins une option.");
      case "radio":
      case "select":
        return t("Choisissez une option pour continuer.");
      case "code":
        return t("Saisissez les {n} chiffres du code.", { n: field.length });
      case "range":
        return t("Indiquez l'heure de début et l'heure de fin.");
      case "phone":
        return t("Indiquez votre numéro de téléphone.");
      case "email":
        return t("Indiquez votre adresse e-mail. Exemple : awa@gmail.com");
      default:
        return t("Remplissez « {champ} » pour continuer.", { champ: t(field.label) });
    }
  }

  switch (field.kind) {
    case "email":
      if (!EMAIL.test(str(value).trim())) return t("Cette adresse semble incomplète. Exemple : awa@gmail.com");
      break;
    case "url":
      if (!/^https?:\/\/\S+\.\S+/.test(str(value).trim())) return t("Collez le lien complet, qui commence par https://");
      break;
    case "phone": {
      const p = phone(value);
      const country = countryByDial(p.dial);
      const digits = phoneDigits(p.number, p.dial);
      if (digits.length !== country.digits) {
        return t("Le numéro doit avoir {n} chiffres pour {pays}. Exemple : {exemple}", {
          n: country.digits,
          pays: country.name === "France" ? t("la France") : t(country.name),
          exemple: country.example,
        });
      }
      break;
    }
    case "code":
      if (!new RegExp(`^\\d{${field.length}}$`).test(str(value))) return t("Saisissez les {n} chiffres du code.", { n: field.length });
      break;
    case "range": {
      const r = range(value);
      if (r.from >= r.to) return t("L'heure de fin doit être après l'heure de début.");
      break;
    }
    default:
      break;
  }
  const custom = field.validate ? field.validate(value, values) : null;
  return custom ? t(custom) : null;
}

/* ------------------------------------------------------------------ */

type FieldProps<F> = {
  field: F;
  value: FieldValue;
  error: string | undefined;
  onChange: (value: FieldValue) => void;
};

function Label({ id, field }: { id: string; field: Base }) {
  return (
    <label className="field-label" htmlFor={id}>
      {t(field.label)}
      {field.optional ? <span className="field-optional"> {t("(facultatif)")}</span> : null}
    </label>
  );
}

function Help({ id, field, error }: { id: string; field: Base; error: string | undefined }) {
  return (
    <>
      {field.hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {typeof field.hint === "string" ? t(field.hint) : field.hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </>
  );
}

function describedBy(id: string, field: Base, error: string | undefined) {
  const ids = [field.hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ");
  return ids || undefined;
}

export function fieldId(name: string) {
  return `f-${name}`;
}

export function Field({ field, value, error, onChange }: FieldProps<Exclude<FieldDef, { kind: "group" }>>) {
  const id = fieldId(field.name);
  const aria = {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy(id, field, error),
  } as const;

  switch (field.kind) {
    case "time":
      return <TimeField field={field} value={value} error={error} onChange={onChange} />;
    case "text":
    case "email":
    case "url":
    case "number":
    case "datetime":
      return (
        <div className={`field${error ? " has-error" : ""}`}>
          <Label id={id} field={field} />
          <input
            id={id}
            className="input"
            type={field.kind === "datetime" ? "datetime-local" : field.kind}
            value={str(value)}
            placeholder={field.placeholder ? t(field.placeholder) : undefined}
            autoComplete={field.autoComplete ?? "off"}
            inputMode={field.inputMode ?? (field.kind === "email" ? "email" : undefined)}
            spellCheck={field.kind === "text" ? undefined : false}
            onChange={(event) => onChange(event.target.value)}
            {...aria}
          />
          <Help id={id} field={field} error={error} />
        </div>
      );
    case "secret":
      return <SecretField field={field} value={value} error={error} onChange={onChange} />;
    case "textarea":
      return (
        <div className={`field${error ? " has-error" : ""}`}>
          <Label id={id} field={field} />
          <textarea
            id={id}
            className="input textarea"
            rows={field.rows ?? 4}
            value={str(value)}
            placeholder={field.placeholder ? t(field.placeholder) : undefined}
            onChange={(event) => onChange(event.target.value)}
            {...aria}
          />
          <Help id={id} field={field} error={error} />
        </div>
      );
    case "select":
      return (
        <div className={`field${error ? " has-error" : ""}`}>
          <Label id={id} field={field} />
          <div className="select-wrap">
            <select id={id} className="input select" value={str(value)} onChange={(event) => onChange(event.target.value)} {...aria}>
              {str(value) === "" ? <option value="">{t("Choisir…")}</option> : null}
              {field.options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {t(option.label)}
                </option>
              ))}
            </select>
            <Icon name="chevron" size={18} className="select-icon" />
          </div>
          <Help id={id} field={field} error={error} />
        </div>
      );
    case "radio":
    case "checks":
      return <ChoiceField field={field} value={value} error={error} onChange={onChange} />;
    case "phone":
      return <PhoneField field={field} value={value} error={error} onChange={onChange} />;
    case "code":
      return <CodeField field={field} value={value} error={error} onChange={onChange} />;
    case "range":
      return <RangeField field={field} value={value} error={error} onChange={onChange} />;
  }
}

function SecretField({ field, value, error, onChange }: FieldProps<Base & { kind: "secret"; placeholder?: string; autoComplete?: string }>) {
  const id = fieldId(field.name);
  const [shown, setShown] = useState(false);
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <Label id={id} field={field} />
      <div className="input-affix">
        <input
          id={id}
          className="input"
          type={shown ? "text" : "password"}
          value={str(value)}
          placeholder={field.placeholder ? t(field.placeholder) : undefined}
          autoComplete={field.autoComplete ?? "off"}
          spellCheck={false}
          autoCapitalize="off"
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, field, error)}
        />
        <button type="button" className="affix-btn" onClick={() => setShown((s) => !s)} aria-pressed={shown}>
          {shown ? t("Masquer") : t("Afficher")}
        </button>
      </div>
      <Help id={id} field={field} error={error} />
    </div>
  );
}

function ChoiceField({
  field,
  value,
  error,
  onChange,
}: FieldProps<(Base & { kind: "radio"; options: Option[]; columns?: 1 | 2 | 3 }) | (Base & { kind: "checks"; options: Option[]; empty?: ReactNode; columns?: 1 | 2 | 3 })>) {
  const id = fieldId(field.name);
  const multiple = field.kind === "checks";
  const selected = multiple ? list(value) : [str(value)];
  const columns = field.columns ?? 1;
  return (
    <fieldset
      className={`field choice${error ? " has-error" : ""}`}
      aria-describedby={describedBy(id, field, error)}
      aria-invalid={error ? true : undefined}
    >
      <legend className="field-label">
        {t(field.label)}
        {field.optional ? <span className="field-optional"> {t("(facultatif)")}</span> : null}
      </legend>
      {field.kind === "checks" && field.options.length === 0 && field.empty ? (
        <div className="choice-empty">{field.empty}</div>
      ) : (
        <div className={`choice-grid cols-${columns}`}>
          {field.options.map((option, index) => {
            const checked = selected.includes(option.value);
            return (
              <label key={option.value} className={`choice-card${checked ? " is-checked" : ""}${option.disabled ? " is-disabled" : ""}`}>
                <input
                  id={index === 0 ? id : undefined}
                  type={multiple ? "checkbox" : "radio"}
                  name={field.name}
                  value={option.value}
                  checked={checked}
                  disabled={option.disabled}
                  onChange={() => {
                    if (!multiple) return onChange(option.value);
                    onChange(checked ? selected.filter((v) => v !== option.value) : [...selected, option.value]);
                  }}
                />
                <span className={`choice-mark${multiple ? " is-box" : ""}`} aria-hidden="true">
                  {multiple ? <Icon name="check" size={14} /> : null}
                </span>
                <span className="choice-text">
                  <span className="choice-label">
                    {t(option.label)}
                    {option.badge ? <span className="choice-badge">{t(option.badge)}</span> : null}
                  </span>
                  {option.description ? <span className="choice-desc">{t(option.description)}</span> : null}
                </span>
              </label>
            );
          })}
        </div>
      )}
      <Help id={id} field={field} error={error} />
    </fieldset>
  );
}

function PhoneField({ field, value, error, onChange }: FieldProps<Base & { kind: "phone" }>) {
  const id = fieldId(field.name);
  const current = phone(value);
  const country = countryByDial(current.dial);
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <Label id={id} field={field} />
      <div className="phone">
        <div className="select-wrap phone-dial">
          <select
            className="input select"
            aria-label={t("Indicatif du pays")}
            value={current.dial}
            onChange={(event) => onChange({ ...current, dial: event.target.value })}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.dial}>
                {t(c.name)} ({c.dial})
              </option>
            ))}
          </select>
          <Icon name="chevron" size={18} className="select-icon" />
        </div>
        <input
          id={id}
          className="input"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={country.example}
          value={current.number}
          onChange={(event) => onChange({ ...current, number: event.target.value })}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, field, error)}
        />
      </div>
      <Help id={id} field={field} error={error} />
    </div>
  );
}

function CodeField({ field, value, error, onChange }: FieldProps<Base & { kind: "code"; length: number }>) {
  const id = fieldId(field.name);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length: field.length }, (_, i) => str(value)[i] ?? "");

  const setAt = (index: number, char: string) => {
    const next = [...chars];
    next[index] = char;
    onChange(next.join("").replace(/\s/g, ""));
  };

  const fill = (text: string, from: number) => {
    const digits = text.replace(/\D/g, "").slice(0, field.length - from);
    if (!digits) return;
    const next = [...chars];
    for (let i = 0; i < digits.length; i += 1) next[from + i] = digits[i] ?? "";
    onChange(next.join(""));
    boxes.current[Math.min(from + digits.length, field.length - 1)]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !chars[index] && index > 0) {
      event.preventDefault();
      setAt(index - 1, "");
      boxes.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      boxes.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < field.length - 1) {
      event.preventDefault();
      boxes.current[index + 1]?.focus();
    }
  };

  return (
    <fieldset className={`field${error ? " has-error" : ""}`} aria-describedby={describedBy(id, field, error)}>
      <legend className="field-label">{t(field.label)}</legend>
      <div className="code">
        {chars.map((char, index) => (
          <input
            key={index}
            id={index === 0 ? id : undefined}
            ref={(el) => {
              boxes.current[index] = el;
            }}
            className="input code-box"
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={field.length}
            aria-label={t("Chiffre {n} sur {total}", { n: index + 1, total: field.length })}
            aria-invalid={error ? true : undefined}
            value={char}
            onFocus={(event) => event.target.select()}
            onKeyDown={(event) => onKeyDown(event, index)}
            onPaste={(event: ClipboardEvent<HTMLInputElement>) => {
              event.preventDefault();
              fill(event.clipboardData.getData("text"), index);
            }}
            onChange={(event) => {
              const typed = event.target.value.replace(/\D/g, "");
              if (typed.length > 1) return fill(typed, index);
              setAt(index, typed);
              if (typed && index < field.length - 1) boxes.current[index + 1]?.focus();
            }}
          />
        ))}
      </div>
      <Help id={id} field={field} error={error} />
    </fieldset>
  );
}

/* ------------------------------ Créneaux ------------------------------ */

/** Heures proposées, de 5 h à 23 h 30, toutes les demi-heures. */
const SLOTS = Array.from({ length: 38 }, (_, i) => {
  const minutes = 5 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
});

/** « 08:00 » devient « 8 h » (« 8:00 » en anglais), « 08:30 » devient « 8 h 30 ». */
export function hourLabel(time: string): string {
  const [h = "0", m = "00"] = time.split(":");
  if (getLang() === "en") return `${Number(h)}:${m}`;
  return `${Number(h)} h${m === "00" ? "" : ` ${m}`}`;
}

function SlotSelect({
  id,
  label,
  value,
  invalid,
  onChange,
}: {
  id?: string;
  label: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const options = value && !SLOTS.includes(value) ? [value, ...SLOTS] : SLOTS;
  return (
    <div className="select-wrap">
      <select
        id={id}
        className="input select"
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {value === "" ? <option value="">{t("Choisir…")}</option> : null}
        {options.map((slot) => (
          <option key={slot} value={slot}>
            {hourLabel(slot)}
          </option>
        ))}
      </select>
      <Icon name="chevron" size={18} className="select-icon" />
    </div>
  );
}

const RANGE_PRESETS: RangeValue[] = [
  { from: "08:00", to: "18:00" },
  { from: "08:00", to: "20:00" },
  { from: "09:00", to: "19:00" },
  { from: "07:00", to: "22:00" },
];

/** Plage horaire : créneaux tout prêts en un clic, ou heures au choix. */
function RangeField({ field, value, error, onChange }: FieldProps<Base & { kind: "range" }>) {
  const id = fieldId(field.name);
  const current = range(value);
  return (
    <fieldset className={`field${error ? " has-error" : ""}`} aria-describedby={describedBy(id, field, error)}>
      <legend className="field-label">{t(field.label)}</legend>
      <div className="slots" role="group" aria-label={t("Créneaux fréquents")}>
        {RANGE_PRESETS.map((preset) => {
          const active = preset.from === current.from && preset.to === current.to;
          return (
            <button
              key={preset.from + preset.to}
              type="button"
              className={`slot${active ? " is-active" : ""}`}
              aria-pressed={active}
              onClick={() => onChange(preset)}
            >
              {hourLabel(preset.from)} – {hourLabel(preset.to)}
            </button>
          );
        })}
      </div>
      <div className="range">
        <div className="range-part">
          <span className="range-word" aria-hidden="true">
            {t("De")}
          </span>
          <SlotSelect id={id} label={t("Heure d'ouverture")} value={current.from} invalid={Boolean(error)} onChange={(from) => onChange({ ...current, from })} />
        </div>
        <div className="range-part">
          <span className="range-word" aria-hidden="true">
            {t("à")}
          </span>
          <SlotSelect label={t("Heure de fermeture")} value={current.to} invalid={Boolean(error)} onChange={(to) => onChange({ ...current, to })} />
        </div>
      </div>
      <Help id={id} field={field} error={error} />
    </fieldset>
  );
}

const TIME_PRESETS = ["08:00", "12:00", "18:00", "20:00"];

/** Une heure : créneaux tout prêts en un clic, ou heure au choix. */
function TimeField({ field, value, error, onChange }: FieldProps<InputField>) {
  const id = fieldId(field.name);
  const current = str(value);
  return (
    <fieldset className={`field${error ? " has-error" : ""}`} aria-describedby={describedBy(id, field, error)}>
      <legend className="field-label">{t(field.label)}</legend>
      <div className="slots" role="group" aria-label={t("Heures fréquentes")}>
        {TIME_PRESETS.map((slot) => (
          <button
            key={slot}
            type="button"
            className={`slot${slot === current ? " is-active" : ""}`}
            aria-pressed={slot === current}
            onClick={() => onChange(slot)}
          >
            {hourLabel(slot)}
          </button>
        ))}
      </div>
      <div className="time-other">
        <span className="range-word">{t("Autre heure")}</span>
        <SlotSelect id={id} label={t(field.label)} value={current} invalid={Boolean(error)} onChange={onChange} />
      </div>
      <Help id={id} field={field} error={error} />
    </fieldset>
  );
}
