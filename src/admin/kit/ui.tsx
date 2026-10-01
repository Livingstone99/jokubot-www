import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";

import { useT } from "../locale.js";
import { initials } from "../ui.js";
import { IconTelegram, IconWhatsApp, IconX } from "./icons.js";

/* Composants partagés de la refonte (section 6 du cahier des charges). */

/* ---------- Badge et pastille d'état ---------- */

/** Badge rouge des non-lus. */
export function Badge({ count, label }: { count: number; label?: string }) {
  if (count <= 0) return null;
  return (
    <span className="kit-badge" aria-label={label}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export type DotTone = "ok" | "off" | "warn" | "danger";

/** Petite pastille d'état (verte = connecté). Toujours accompagnée d'un texte. */
export function StatusDot({ tone, label }: { tone: DotTone; label: string }) {
  return (
    <span className={`kit-status is-${tone}`}>
      <span className="kit-status-mark" aria-hidden="true" />
      {label}
    </span>
  );
}

/* ---------- Avatar ---------- */

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span className="kit-avatar" style={{ width: size, height: size }} aria-hidden="true">
      {initials(name || "?")}
    </span>
  );
}

/* ---------- Icône de canal ---------- */

export function ChannelIcon({ channel, size = 20 }: { channel: string; size?: number }) {
  return (
    <span className={`channel-icon is-${channel}`} aria-hidden="true">
      {channel === "telegram" ? <IconTelegram size={size} /> : <IconWhatsApp size={size} />}
    </span>
  );
}

/* ---------- États : chargement, vide, erreur ---------- */

export function Skeleton({ lines = 3, height = 56 }: { lines?: number; height?: number }) {
  const t = useT();
  return (
    <div className="kit-skeleton" role="status" aria-label={t("common.loading")}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} style={{ height }} />
      ))}
    </div>
  );
}

export function EmptyBlock({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="kit-empty">
      {icon ? <span className="kit-empty-icon">{icon}</span> : null}
      <strong>{title}</strong>
      {body ? <p>{body}</p> : null}
      {action}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div className="kit-error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="secondary compact" onClick={onRetry}>
          {t("kit.retry")}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Cartes ---------- */

export function StatCard({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: number | string | null | undefined;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div className="stat-card">
      <span className="stat-card-label">{label}</span>
      <strong className={alert ? "stat-card-value is-alert" : "stat-card-value"}>
        {value ?? "—"}
      </strong>
      {hint ? <span className="stat-card-hint">{hint}</span> : null}
    </div>
  );
}

/** Carte d'un canal : icône colorée, nom, identifiant, statut et action. */
export function ChannelCard({
  channel,
  name,
  value,
  connected,
  statusLabel,
  to,
}: {
  channel: "whatsapp" | "telegram";
  name: string;
  value: string | null;
  connected: boolean;
  statusLabel: string;
  to: string;
}) {
  const t = useT();
  return (
    <article className="channel-card2">
      <ChannelIcon channel={channel} size={22} />
      <div className="channel-card2-body">
        <strong>{name}</strong>
        <span className="channel-card2-value">{value ?? t("home.notConnected")}</span>
        <StatusDot tone={connected ? "ok" : "off"} label={statusLabel} />
      </div>
      <Link className={connected ? "secondary compact" : "primary compact"} to={to}>
        {connected ? t("home.manage") : t("home.step1Cta")}
      </Link>
    </article>
  );
}

/* ---------- Interrupteur ---------- */

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="kit-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="kit-switch-thumb" aria-hidden="true" />
    </button>
  );
}

/* ---------- Toasts ---------- */

type ToastInput = {
  text: string;
  tone?: "ok" | "error";
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-2), { ...toast, id }]);
      // Les erreurs restent plus longtemps : il faut le temps de lire et de réessayer.
      window.setTimeout(() => dismiss(id), toast.tone === "error" ? 8000 : 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="kit-toasts" aria-live="polite" aria-atomic="false">
        {items.map((item) => (
          <div key={item.id} className={`kit-toast tone-${item.tone ?? "ok"}`} role={item.tone === "error" ? "alert" : "status"}>
            <span>{item.text}</span>
            {item.action ? (
              <button
                type="button"
                className="kit-toast-action"
                onClick={() => {
                  dismiss(item.id);
                  item.action?.onClick();
                }}
              >
                {item.action.label}
              </button>
            ) : null}
            <button
              type="button"
              className="kit-toast-close"
              aria-label={t("help.close")}
              onClick={() => dismiss(item.id)}
            >
              <IconX size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error("useToast must be used inside ToastProvider");
  return push;
}

/* ---------- Boîte de confirmation ---------- */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="kit-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <p>{body}</p>
      <div className="kit-dialog-actions">
        <button type="button" className="secondary" onClick={onCancel} autoFocus>
          {t("kit.cancel")}
        </button>
        <button
          type="button"
          className={danger ? "danger" : "primary"}
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

/* ---------- Graphique en barres ---------- */

/** Barres noires, la barre du pic en rouge. Une liste cachée donne les valeurs aux lecteurs d'écran. */
export function BarChart({
  data,
  label,
}: {
  data: Array<{ label: string; value: number }>;
  label: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = useMemo(() => {
    let best = -1;
    let at = -1;
    data.forEach((d, i) => {
      if (d.value > best) {
        best = d.value;
        at = i;
      }
    });
    return best > 0 ? at : -1;
  }, [data]);
  return (
    <figure className="kit-chart">
      <div className="kit-chart-bars" role="img" aria-label={label}>
        {data.map((d, i) => (
          <div key={d.label} className="kit-chart-col">
            <span
              className={i === peak ? "kit-chart-bar is-peak" : "kit-chart-bar"}
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
              title={`${d.label} : ${d.value}`}
            />
            <span className="kit-chart-label" aria-hidden="true">
              {d.label}
            </span>
          </div>
        ))}
      </div>
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.label}>
            {d.label} : {d.value}
          </li>
        ))}
      </ul>
    </figure>
  );
}
