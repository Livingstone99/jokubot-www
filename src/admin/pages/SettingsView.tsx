import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api.js";
import { useAuth } from "../auth.js";
import { describeChannel } from "../ChannelLink.js";
import { IconChevronRight, IconCode, IconCopy, IconEye, IconPencil, IconPhone, IconShieldCheck } from "../jk/icons.js";
import { Badge, Card, ConfirmModal, Field, Modal, PageTitle, Switch, useToast } from "../jk/ui.js";
import { useT } from "../locale.js";

const NOTIF_KEY = "joku.notifications";

type Notif = { messages: boolean; verifications: boolean; alerts: boolean };

function readNotif(): Notif {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return { messages: true, verifications: true, alerts: false, ...(JSON.parse(raw) as Partial<Notif>) };
  } catch {
    // Stockage indisponible : valeurs par défaut.
  }
  return { messages: true, verifications: true, alerts: false };
}

export function SettingsViewPage() {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const { me, setMe } = useAuth();
  const tenant = me?.tenant;

  // Mon commerce
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tenant?.name ?? "");
  const [savingName, setSavingName] = useState(false);

  // Notifications (enregistrées sur l'appareil, voir docs/ui-hypotheses.md)
  const [notif, setNotif] = useState<Notif>(readNotif);

  // Sécurité
  const [password, setPassword] = useState(false);
  const [sessions, setSessions] = useState(false);

  // Développeur
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [revealHint, setRevealHint] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [webhook, setWebhook] = useState(tenant?.webhookUrl ?? "");
  const [savingHook, setSavingHook] = useState(false);

  async function saveName() {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const result = await api.saveSettings({ name: name.trim() });
      setMe((current) => (current ? { ...current, tenant: result.tenant } : current));
      setEditing(false);
      toast({ text: t("jk.set.saved") });
    } catch {
      toast({ text: t("jk.set.saveError"), tone: "error" });
    } finally {
      setSavingName(false);
    }
  }

  function toggleNotif(key: keyof Notif, value: boolean) {
    const next = { ...notif, [key]: value };
    setNotif(next);
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      toast({ text: t("jk.set.notifSaved") });
    } catch {
      toast({ text: t("jk.set.saveError"), tone: "error" });
    }
  }

  async function rotateKey() {
    setRotating(true);
    try {
      const result = await api.rotateApiKey();
      setApiKey(result.apiKey);
      setConfirmRotate(false);
      toast({ text: t("jk.set.keyRotated") });
    } catch {
      toast({ text: t("jk.set.saveError"), tone: "error" });
    } finally {
      setRotating(false);
    }
  }

  async function saveWebhook() {
    setSavingHook(true);
    try {
      const result = await api.saveSettings({ webhookUrl: webhook.trim() || null });
      setMe((current) => (current ? { ...current, tenant: result.tenant } : current));
      toast({ text: t("jk.set.saved") });
    } catch {
      toast({ text: t("jk.set.webhookError"), tone: "error" });
    } finally {
      setSavingHook(false);
    }
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    setMe(null);
    navigate("/login");
  }

  const channels = (["whatsapp", "telegram"] as const).map((id) => ({ id, state: describeChannel(t, id, tenant) }));

  return (
    <div className="jk-page jk-settings">
      <PageTitle title={t("jk.nav.settings")} subtitle={t("jk.set.subtitle")} />

      <Card
        title={t("jk.set.business")}
        action={
          editing ? null : (
            <button type="button" className="jk-btn is-secondary is-small" onClick={() => setEditing(true)}>
              <IconPencil size={16} />
              {t("jk.edit")}
            </button>
          )
        }
      >
        {editing ? (
          <div className="jk-form">
            <Field label={t("jk.set.businessName")}>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <div className="jk-form-actions">
              <button type="button" className="jk-btn is-secondary" onClick={() => { setEditing(false); setName(tenant?.name ?? ""); }}>
                {t("jk.cancel")}
              </button>
              <button type="button" className="jk-btn is-primary" disabled={savingName || !name.trim()} onClick={() => void saveName()}>
                {savingName ? t("jk.saving") : t("jk.save")}
              </button>
            </div>
          </div>
        ) : (
          <dl className="jk-details">
            <div>
              <dt>{t("jk.set.businessName")}</dt>
              <dd>{tenant?.name || "—"}</dd>
            </div>
            <div>
              <dt>{t("jk.set.phone")}</dt>
              <dd>{tenant?.whatsappNumber || t("jk.set.noPhone")}</dd>
            </div>
            <div>
              <dt>{t("jk.set.email")}</dt>
              <dd>{me?.email ?? "—"}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card title={t("jk.set.notifications")}>
        <ul className="jk-settings-list">
          {([
            ["messages", "jk.set.nMessages", "jk.set.nMessagesD"],
            ["verifications", "jk.set.nVerifications", "jk.set.nVerificationsD"],
            ["alerts", "jk.set.nAlerts", "jk.set.nAlertsD"],
          ] as const).map(([key, label, desc]) => (
            <li key={key}>
              <span>
                <strong>{t(label)}</strong>
                <span className="jk-muted">{t(desc)}</span>
              </span>
              <Switch checked={notif[key]} label={t(label)} onChange={(value) => toggleNotif(key, value)} />
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t("jk.set.security")}>
        <ul className="jk-settings-list">
          <li>
            <span>
              <strong>{t("jk.set.password")}</strong>
              <span className="jk-muted">{t("jk.set.passwordD")}</span>
            </span>
            <button type="button" className="jk-btn is-secondary is-small" onClick={() => setPassword(true)}>
              {t("jk.edit")}
            </button>
          </li>
          <li>
            <span>
              <strong>{t("jk.set.sessions")}</strong>
              <span className="jk-muted">{t("jk.set.sessionsD")}</span>
            </span>
            <button type="button" className="jk-btn is-secondary is-small" onClick={() => setSessions(true)}>
              {t("jk.set.seeSessions")}
            </button>
          </li>
        </ul>
      </Card>

      <Card
        title={t("jk.set.connections")}
        action={
          <Link className="jk-btn is-text is-small" to="/channels">
            {t("jk.set.manageChannels")}
          </Link>
        }
      >
        <ul className="jk-settings-list">
          {channels.map(({ id, state }) => (
            <li key={id}>
              <span>
                <strong>{id === "whatsapp" ? "WhatsApp" : "Telegram"}</strong>
                <span className="jk-muted">
                  {id === "whatsapp" ? tenant?.whatsappNumber ?? "—" : tenant?.telegramBotUsername ? `@${tenant.telegramBotUsername}` : "—"}
                </span>
              </span>
              <Badge tone={state.status === "connected" ? "solid" : state.status === "off" || state.status === "disconnected" ? "muted" : "outline"}>
                {state.label}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <details className="jk-card jk-dev">
        <summary>
          <IconCode size={18} />
          <span>
            <strong>{t("jk.set.developer")}</strong>
            <span className="jk-muted">{t("jk.set.developerD")}</span>
          </span>
          <IconChevronRight size={18} className="jk-dev-chevron" />
        </summary>
        <div className="jk-form">
          <Field label={t("jk.set.apiKey")} hint={apiKey ? t("jk.set.keyOnce") : revealHint ? t("jk.set.keyHidden") : undefined}>
            <span className="jk-input-icon">
              <input readOnly value={apiKey ?? "••••••••••••••••••••"} className="jk-mono" />
              {apiKey ? (
                <button
                  type="button"
                  className="jk-icon-btn"
                  aria-label={t("jk.copy")}
                  onClick={() => void navigator.clipboard.writeText(apiKey).then(() => toast({ text: t("jk.copied") }))}
                >
                  <IconCopy size={18} />
                </button>
              ) : null}
            </span>
          </Field>
          <div className="jk-form-actions is-start">
            <button type="button" className="jk-btn is-secondary is-small" disabled={Boolean(apiKey)} onClick={() => setRevealHint(true)}>
              <IconEye size={16} />
              {t("jk.show")}
            </button>
            <button type="button" className="jk-btn is-secondary is-small" onClick={() => setConfirmRotate(true)}>
              {t("jk.set.rotate")}
            </button>
          </div>
          <Field label={t("jk.set.webhook")} hint={t("jk.set.webhookD")}>
            <input type="url" value={webhook} placeholder="https://…" onChange={(event) => setWebhook(event.target.value)} />
          </Field>
          <div className="jk-form-actions is-start">
            <button type="button" className="jk-btn is-primary is-small" disabled={savingHook} onClick={() => void saveWebhook()}>
              {savingHook ? t("jk.saving") : t("jk.save")}
            </button>
          </div>
          <p className="jk-muted jk-small">
            <Link to="/developers">{t("jk.set.allDev")}</Link> · <Link to="/settings/advanced">{t("jk.set.advanced")}</Link>
          </p>
        </div>
      </details>

      <Modal
        open={password}
        title={t("jk.set.password")}
        onClose={() => setPassword(false)}
        footer={
          <button type="button" className="jk-btn is-primary" onClick={() => setPassword(false)}>
            {t("jk.done")}
          </button>
        }
      >
        <div className="jk-notice">
          <IconShieldCheck size={20} />
          <p>{t("jk.set.passwordSoon")}</p>
        </div>
      </Modal>

      <Modal
        open={sessions}
        title={t("jk.set.sessions")}
        onClose={() => setSessions(false)}
        footer={
          <>
            <button type="button" className="jk-btn is-secondary" onClick={() => setSessions(false)}>
              {t("jk.close")}
            </button>
            <button type="button" className="jk-btn is-primary" onClick={() => void logout()}>
              {t("jk.logout")}
            </button>
          </>
        }
      >
        <ul className="jk-settings-list">
          <li>
            <span className="jk-session">
              <IconPhone size={20} />
              <span>
                <strong>{t("jk.set.thisDevice")}</strong>
                <span className="jk-muted">{t("jk.set.activeNow")}</span>
              </span>
            </span>
            <Badge tone="solid">{t("jk.set.current")}</Badge>
          </li>
        </ul>
      </Modal>

      <ConfirmModal
        open={confirmRotate}
        title={t("jk.set.rotateTitle")}
        body={t("jk.set.rotateBody")}
        confirmLabel={t("jk.set.rotate")}
        busy={rotating}
        onConfirm={() => void rotateKey()}
        onClose={() => setConfirmRotate(false)}
      />
    </div>
  );
}
