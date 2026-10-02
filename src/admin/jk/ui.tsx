import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useT } from "../locale.js";
import { initials } from "../ui.js";
import {
  IconAlert,
  IconCircleCheck,
  IconSearch,
  IconTelegram,
  IconWhatsApp,
  IconX,
  type IconComponent,
} from "./icons.js";

/* Composants de l'espace connecté. Noir, blanc et gris uniquement :
   les états se distinguent par le contraste, une icône et un mot. */

/* ---------- En-tête de page ---------- */

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="jk-page-head">
      <div className="jk-page-head-text">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="jk-page-head-actions">{actions}</div> : null}
    </header>
  );
}

/* ---------- Carte ---------- */

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={["jk-card", className].filter(Boolean).join(" ")}>
      {title || action ? (
        <header className="jk-card-head">
          {title ? <h2>{title}</h2> : <span />}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/* ---------- Badge d'état ---------- */

export type BadgeTone = "solid" | "outline" | "muted";

/** Plein = fait / actif ; contour = en cours ; gris = terminé / coupé. */
export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`jk-badge is-${tone}`}>{children}</span>;
}

/* ---------- Avatar ---------- */

export function Avatar({ name, size = 40, photo }: { name: string; size?: number; photo?: string | null }) {
  return (
    <span className="jk-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : initials(name || "?")}
    </span>
  );
}

/* ---------- Canal ---------- */

export function ChannelMark({ channel, size = 16 }: { channel: string; size?: number }) {
  return (
    <span className="jk-channel-mark" aria-hidden="true">
      {channel === "telegram" ? <IconTelegram size={size} /> : <IconWhatsApp size={size} />}
    </span>
  );
}

/* ---------- Statistique ---------- */

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: IconComponent;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="jk-stat">
      <span className="jk-stat-icon">
        <Icon size={18} />
      </span>
      <span className="jk-stat-label">{label}</span>
      <strong className="jk-stat-value">{value}</strong>
      {hint ? <span className="jk-stat-hint">{hint}</span> : null}
    </div>
  );
}

/* ---------- Recherche ---------- */

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="jk-search">
      <IconSearch size={18} />
      <span className="jk-sr">{placeholder}</span>
      <input type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

/* ---------- Champ ---------- */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className={error ? "jk-field has-error" : "jk-field"}>
      <span className="jk-field-label">{label}</span>
      {children}
      {error ? (
        <span className="jk-field-error" role="alert">
          <IconAlert size={14} />
          {error}
        </span>
      ) : hint ? (
        <span className="jk-field-hint">{hint}</span>
      ) : null}
    </label>
  );
}

/* ---------- Choix (boutons radio en cartes) ---------- */

export function Choice({
  name,
  checked,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  icon?: IconComponent;
  title: string;
  description?: string;
}) {
  return (
    <label className={checked ? "jk-choice is-on" : "jk-choice"}>
      <input type="radio" name={name} checked={checked} onChange={onSelect} />
      {Icon ? (
        <span className="jk-choice-icon">
          <Icon size={20} />
        </span>
      ) : null}
      <span className="jk-choice-text">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </span>
      <span className="jk-choice-dot" aria-hidden="true" />
    </label>
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
      className="jk-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="jk-switch-thumb" aria-hidden="true" />
    </button>
  );
}

/* ---------- États ---------- */

export function Loading({ rows = 3, height = 64, label }: { rows?: number; height?: number; label?: string }) {
  const t = useT();
  return (
    <div className="jk-loading" role="status" aria-label={label ?? t("jk.loading")}>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} style={{ height }} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: IconComponent;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="jk-empty">
      <span className="jk-empty-icon">
        <Icon size={22} />
      </span>
      <strong>{title}</strong>
      {body ? <p>{body}</p> : null}
      {action}
    </div>
  );
}

/** Erreur lisible, jamais de message technique. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div className="jk-error" role="alert">
      <IconAlert size={20} />
      <div>
        <strong>{message}</strong>
        <p>{t("jk.retryHint")}</p>
      </div>
      {onRetry ? (
        <button type="button" className="jk-btn is-secondary is-small" onClick={onRetry}>
          {t("jk.retry")}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Modale ---------- */

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
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
      className={`jk-modal is-${size}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clic sur le fond : fermer.
        if (event.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className="jk-modal-box">
          <header className="jk-modal-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="jk-icon-btn" aria-label={t("jk.close")} onClick={onClose}>
              <IconX size={18} />
            </button>
          </header>
          <div className="jk-modal-body">{children}</div>
          {footer ? <footer className="jk-modal-foot">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="jk-btn is-secondary" onClick={onClose}>
            {t("jk.cancel")}
          </button>
          <button type="button" className="jk-btn is-primary" disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="jk-muted">{body}</p>
    </Modal>
  );
}

/* ---------- Menu déroulant ---------- */

export function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function Dropdown({
  label,
  trigger,
  children,
  align = "right",
  className,
}: {
  label: string;
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  return (
    <div className={["jk-dropdown", className].filter(Boolean).join(" ")} ref={ref}>
      <button
        type="button"
        className="jk-dropdown-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>
      {open ? (
        <div className={`jk-menu is-${align}`} role="menu">
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Toasts ---------- */

type ToastInput = { text: string; tone?: "ok" | "error" };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setItems((all) => all.filter((item) => item.id !== id)), []);
  const push = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setItems((all) => [...all.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), toast.tone === "error" ? 7000 : 3500);
    },
    [dismiss],
  );
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="jk-toasts" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className="jk-toast" role={item.tone === "error" ? "alert" : "status"}>
            {item.tone === "error" ? <IconAlert size={18} /> : <IconCircleCheck size={18} />}
            <span>{item.text}</span>
            <button type="button" className="jk-toast-close" aria-label={t("jk.close")} onClick={() => dismiss(item.id)}>
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

/* ---------- Graphique en barres (noir et gris) ---------- */

export function BarChart({ data, label }: { data: Array<{ label: string; value: number; tick?: string }>; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="jk-chart">
      <div className="jk-chart-bars" role="img" aria-label={label}>
        {data.map((d, i) => (
          <div key={i} className="jk-chart-col">
            <span
              className={d.value === max && d.value > 0 ? "jk-chart-bar is-peak" : "jk-chart-bar"}
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
              title={`${d.label} : ${d.value}`}
            />
            <span className="jk-chart-tick" aria-hidden="true">
              {d.tick ?? d.label}
            </span>
          </div>
        ))}
      </div>
      <ul className="jk-sr">
        {data.map((d, i) => (
          <li key={i}>
            {d.label} : {d.value}
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ---------- Bouton flottant (mobile) ---------- */

export function Fab({ label, onClick, icon: Icon }: { label: string; onClick: () => void; icon: IconComponent }) {
  return (
    <button type="button" className="jk-fab" aria-label={label} onClick={onClick}>
      <Icon size={24} />
    </button>
  );
}
