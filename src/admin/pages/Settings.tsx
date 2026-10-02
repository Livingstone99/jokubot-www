import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  api,
  type VerificationReplies,
  type VerificationReplyKey,
  type WebhookDelivery,
} from "../api.js";
import { useAuth } from "../auth.js";
import {
  ChannelLinkControls,
  ChannelStatusMark,
  channelBlockClass,
  channelStatusClass,
  describeChannel,
} from "../ChannelLink.js";
import { useLocale, useT } from "../locale.js";
import { useTheme } from "../theme.js";
import { formatWhen, CopyButton, initials } from "../ui.js";
import { readPrefs, resizePhoto, writePrefs, type Day, type LocalPrefs } from "../kit/prefs.js";
import type { MessageKey } from "../i18n.js";
import { ChannelConnectCard } from "../ChannelConnect.js";
import { IconEye, IconEyeOff, IconSend } from "../kit/icons.js";
import { ChannelIcon, ConfirmDialog, StatusDot, Switch, useToast } from "../kit/ui.js";
import { WhatsAppNumberField } from "../WhatsAppNumberField.js";

const DAYS: Array<[Day, MessageKey]> = [
  ["mon", "set.mon"],
  ["tue", "set.tue"],
  ["wed", "set.wed"],
  ["thu", "set.thu"],
  ["fri", "set.fri"],
  ["sat", "set.sat"],
  ["sun", "set.sun"],
];

const REPLY_KEYS: VerificationReplyKey[] = [
  "verified",
  "expired",
  "already_used",
  "unknown_token",
  "channel_mismatch",
  "sender_mismatch",
];

const REPLY_LABEL: Record<
  VerificationReplyKey,
  | "settings.replies.verified"
  | "settings.replies.expired"
  | "settings.replies.already_used"
  | "settings.replies.unknown_token"
  | "settings.replies.channel_mismatch"
  | "settings.replies.sender_mismatch"
> = {
  verified: "settings.replies.verified",
  expired: "settings.replies.expired",
  already_used: "settings.replies.already_used",
  unknown_token: "settings.replies.unknown_token",
  channel_mismatch: "settings.replies.channel_mismatch",
  sender_mismatch: "settings.replies.sender_mismatch",
};

const FALLBACK_REPLIES: VerificationReplies = {
  verified: "Vérifié.",
  expired: "Ce code a expiré.",
  already_used: "Ce code n’est plus valable.",
  unknown_token: "Ce code n’est pas valide.",
  channel_mismatch:
    "Envoyez ce code depuis l’application pour laquelle il a été émis.",
  sender_mismatch: "Ce code n’est pas destiné à ce numéro.",
};

function repliesFromTenant(
  tenant:
    | {
        verificationReplies?: Partial<VerificationReplies>;
        verificationReplyDefaults?: Partial<VerificationReplies>;
      }
    | undefined,
): VerificationReplies {
  return {
    ...FALLBACK_REPLIES,
    ...tenant?.verificationReplyDefaults,
    ...tenant?.verificationReplies,
  };
}

export function SettingsPage({ view = "settings" }: { view?: "settings" | "channels" }) {
  const isChannels = view === "channels";
  const toast = useToast();
  const navigate = useNavigate();
  const [showToken, setShowToken] = useState(false);
  const [prefs, setPrefs] = useState<LocalPrefs>(readPrefs);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { mode, setMode } = useTheme();
  const [testChannel, setTestChannel] = useState<"whatsapp" | "telegram" | null>(null);
  const [gateway, setGateway] = useState<{ url: string; ready: boolean } | null>(null);
  const { me, setMe } = useAuth();
  const { locale, setLocale } = useLocale();
  const t = useT();
  const isIndividual = me?.tenant.accountKind === "individual";
  const whatsapp = describeChannel(t, "whatsapp", me?.tenant);
  const telegram = describeChannel(t, "telegram", me?.tenant);
  const [name, setName] = useState(me?.tenant.name ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(
    me?.tenant.whatsappNumber ?? "",
  );
  const [telegramToken, setTelegramToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState(me?.tenant.webhookUrl ?? "");
  const [inboundRetentionDays, setInboundRetentionDays] = useState(
    String(me?.tenant.inboundRetentionDays ?? 90),
  );
  const [replies, setReplies] = useState<VerificationReplies>(() =>
    repliesFromTenant(me?.tenant),
  );
  const [deliveries, setDeliveries] = useState<WebhookDelivery[] | null>(null);
  const [replayId, setReplayId] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (!isChannels) return;
    void api
      .overview()
      .then((data) => setGateway({ url: data.gateway.url, ready: data.gateway.ready }))
      .catch(() => setGateway(null));
  }, [isChannels]);

  useEffect(() => {
    void api
      .webhookDeliveries()
      .then((result) => setDeliveries(result.items))
      .catch(() => setDeliveries([]));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await api.saveSettings({
        name,
        whatsappNumber: whatsappNumber || null,
        webhookUrl: webhookUrl || null,
        inboundRetentionDays: Number(inboundRetentionDays),
        verificationReplies: replies,
      });
      if (me) {
        setMe({ ...me, tenant: result.tenant });
      }
      setReplies(repliesFromTenant(result.tenant));
      if (telegramToken.trim()) {
        const connected = await api.connectTelegram(telegramToken.trim());
        setMe((current) =>
          current ? { ...current, tenant: connected.tenant } : current,
        );
        setTelegramToken("");
      }
      if (result.webhookSecret) {
        setWebhookSecret(result.webhookSecret);
      }
      if (!isChannels && !writePrefs(prefs)) {
        throw new Error(t("set.photoTooBig"));
      }
      setSaved(true);
      toast({ text: isChannels ? t("chan.saved") : t("settings.savedToast") });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.saveError"));
      toast({ text: t("settings.saveErrorToast"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const photo = await resizePhoto(file);
      setPrefs((current) => ({ ...current, photo }));
    } catch {
      toast({ text: t("set.photoError"), tone: "error" });
    }
  }

  async function onLogoutEverywhere() {
    setConfirmLogout(false);
    await api.logout().catch(() => undefined);
    setMe(null);
    navigate("/login");
  }

  async function onReplay(id: string) {
    setReplayId(id);
    setTestError(null);
    try {
      const updated = await api.replayWebhook(id);
      setDeliveries((current) =>
        (current ?? []).map((row) => (row.id === updated.id ? updated : row)),
      );
    } catch (err) {
      setTestError(
        err instanceof Error ? err.message : t("settings.replayError"),
      );
    } finally {
      setReplayId(null);
    }
  }

  async function onTestWebhook() {
    setTestBusy(true);
    setTestError(null);
    setTestResult(null);
    try {
      const result = await api.testWebhook();
      setTestResult(t("settings.testOk", { status: result.status }));
      const latest = await api.webhookDeliveries();
      setDeliveries(latest.items);
    } catch (err) {
      setTestError(
        err instanceof Error ? err.message : t("settings.testError"),
      );
    } finally {
      setTestBusy(false);
    }
  }

  const pairing = Boolean(
    me?.tenant.whatsappNumber && !me.tenant.whatsappLinked && whatsapp.status !== "disconnected",
  );

  return (
    <section className={isChannels ? "page channels-page" : "page settings-page"}>
      <p className="lede page-intro">{isChannels ? t("chan.lede") : t("settings.lede2")}</p>

      {isChannels && pairing ? (
        <div className="connect-slot">
          <ChannelConnectCard />
        </div>
      ) : null}

      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        {isChannels ? (
          <>
            <div className="channel-panels">
              <article className="panel channel-panel">
                <header className="channel-panel-head">
                  <ChannelIcon channel="whatsapp" size={22} />
                  <div className="channel-panel-title">
                    <h2>{t("common.whatsapp")}</h2>
                    <span>{me?.tenant.whatsappNumber || t("home.notConnected")}</span>
                  </div>
                  <StatusDot tone={whatsapp.status === "connected" ? "ok" : "off"} label={whatsapp.label} />
                </header>
                {whatsapp.status === "connected" ? null : <p className="hint">{whatsapp.detail}</p>}
                <div className="channel-panel-actions">
                  <button
                    type="button"
                    className="secondary compact"
                    disabled={!(whatsapp.status === "connected")}
                    onClick={() => setTestChannel("whatsapp")}
                  >
                    <IconSend size={16} />
                    {t("chan.sendTest")}
                  </button>
                  <ChannelLinkControls channel="whatsapp" />
                </div>
                {whatsapp.status === "connected" ? (
                  <details className="channel-change">
                    <summary>{t("chan.changeNumber")}</summary>
                    <WhatsAppNumberField
                      value={whatsappNumber}
                      preferredCountry={me?.tenant.country}
                      onChange={setWhatsappNumber}
                      hint={t("settings.waHintLinked")}
                    />
                  </details>
                ) : (
                  <div className="connect-tile-split">
                    <WhatsAppNumberField
                      value={whatsappNumber}
                      preferredCountry={me?.tenant.country}
                      onChange={setWhatsappNumber}
                      hint={t("settings.waHintSetup")}
                    />
                    <aside className="connect-howto">
                      <p className="connect-howto-title">{t("settings.howto")}</p>
                      <ol>
                        <li>{t("chan.wa1")}</li>
                        <li>{t("chan.wa2")}</li>
                        <li>{t("chan.wa3")}</li>
                      </ol>
                    </aside>
                  </div>
                )}
              </article>

              <article className="panel channel-panel">
                <header className="channel-panel-head">
                  <ChannelIcon channel="telegram" size={22} />
                  <div className="channel-panel-title">
                    <h2>{t("common.telegram")}</h2>
                    <span>
                      {me?.tenant.telegramBotUsername ? `@${me.tenant.telegramBotUsername}` : t("home.notConnected")}
                    </span>
                  </div>
                  <StatusDot tone={telegram.status === "connected" ? "ok" : "off"} label={telegram.label} />
                </header>
                {telegram.status === "connected" ? null : <p className="hint">{telegram.detail}</p>}
                <div className="channel-panel-actions">
                  <button
                    type="button"
                    className="secondary compact"
                    disabled={!(telegram.status === "connected")}
                    onClick={() => setTestChannel("telegram")}
                  >
                    <IconSend size={16} />
                    {t("chan.sendTest")}
                  </button>
                  <ChannelLinkControls channel="telegram" />
                </div>
                <div className="connect-tile-split">
                  <label className="field-block">
                    {t("settings.botToken")}
                    <span className="secret-field">
                      <input
                        value={telegramToken}
                        onChange={(event) => setTelegramToken(event.target.value)}
                        type={showToken ? "text" : "password"}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="123456789:AAH..."
                      />
                      <button
                        type="button"
                        className="header-icon is-small"
                        aria-label={showToken ? t("chan.hideToken") : t("chan.showToken")}
                        aria-pressed={showToken}
                        onClick={() => setShowToken((value) => !value)}
                      >
                        {showToken ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                      </button>
                    </span>
                    <span className="hint">
                      {telegram.status === "connected" || telegram.status === "degraded"
                        ? t("settings.tgHintReplace")
                        : telegram.status === "disconnected" && me?.tenant.telegramCanReconnect
                          ? t("settings.tgHintReconnect")
                          : t("settings.tgHintSetup")}
                    </span>
                  </label>
                  {telegram.status === "connected" ? null : (
                    <aside className="connect-howto">
                      <p className="connect-howto-title">{t("settings.howto")}</p>
                      <ol>
                        <li>{t("chan.tg1")}</li>
                        <li>{t("chan.tg2")}</li>
                        <li>{t("chan.tg3")}</li>
                      </ol>
                    </aside>
                  )}
                </div>
              </article>
            </div>

            <details className="advanced-block">
              <summary>{t("chan.advanced")}</summary>
              <div className="stack">
                <article className="panel">
                  <header className="panel-head">
                    <div>
                      <h2>{t("chan.gateway")}</h2>
                      <p className="hint">{t("chan.gatewayHint")}</p>
                    </div>
                  </header>
                  {gateway ? (
                    <div className="copy-row">
                      <code>{gateway.url}</code>
                      <CopyButton value={gateway.url} />
                      <StatusDot tone={gateway.ready ? "ok" : "warn"} label={gateway.ready ? t("chan.gatewayReady") : t("chan.gatewayNotReady")} />
                    </div>
                  ) : (
                    <p className="hint">{t("chan.gatewayUnknown")}</p>
                  )}
                </article>
                <article className="panel">
                  <header className="panel-head">
                    <div>
                      <h2>{t("overview.webhookName")}</h2>
                      <p className="hint">
                        {t("lit.settings.44")}{' '}<code>verification.completed</code>{' '}{t("lit.settings.45")}{' '}<code>message.received</code>{' '}{t("lit.settings.46")}
                      </p>
                    </div>
                  </header>
                  <label>
                    {t("settings.webhookUrl")}
                    <input
                      value={webhookUrl}
                      onChange={(event) => setWebhookUrl(event.target.value)}
                      placeholder="https://your-app.example/webhooks/verify"
                    />
                  </label>
                  {webhookSecret ? (
                    <p className="secret">
                      <span>
                        {t("settings.webhookSecretOnce")}{' '}<code>{webhookSecret}</code>
                      </span>
                    </p>
                  ) : me?.tenant.hasWebhookSecret ? (
                    <p className="hint">{t("settings.webhookSecretStored")}</p>
                  ) : (
                    <p className="hint">{t("settings.webhookSecretNew")}</p>
                  )}
                  {me?.tenant.webhookUrl ? (
                    <div className="panel-actions">
                      <button
                        type="button"
                        className="secondary compact"
                        disabled={testBusy || busy}
                        onClick={() => void onTestWebhook()}
                      >
                        {testBusy ? t("settings.sending") : t("settings.sendTest")}
                      </button>
                    </div>
                  ) : null}
                  {testError ? (
                    <p className="banner banner-danger" role="alert">
                      {testError}
                    </p>
                  ) : null}
                  {testResult ? <p className="ok">{testResult}</p> : null}
                </article>

                <article className="panel">
                  <header className="panel-head">
                    <div>
                      <h2>{t("settings.deliveries")}</h2>
                      <p className="hint">{t("settings.deliveriesHint")}</p>
                    </div>
                  </header>
                  {deliveries === null ? (
                    <div className="skeleton-table" aria-hidden="true" />
                  ) : deliveries.length === 0 ? (
                    <p className="hint">{t("settings.deliveriesEmpty")}</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("settings.colWhen")}</th>
                            <th>{t("settings.colEvent")}</th>
                            <th>{t("settings.colStatus")}</th>
                            <th>{t("settings.colAttempts")}</th>
                            <th>{t("settings.colError")}</th>
                            <th>{t("settings.colReplay")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveries.map((row) => (
                            <tr key={row.id}>
                              <td>{formatWhen(row.createdAt)}</td>
                              <td>
                                <code>{row.event}</code>
                              </td>
                              <td>
                                <span className={`pill pill-${deliveryTone(row.status)}`}>
                                  {row.status}
                                </span>
                              </td>
                              <td>{row.attemptCount}</td>
                              <td className="muted">
                                {row.lastError ?? t("common.dash")}
                              </td>
                              <td>
                                {row.status === "delivered" ? (
                                  t("common.dash")
                                ) : (
                                  <button
                                    type="button"
                                    className="ghost compact"
                                    disabled={replayId === row.id || busy}
                                    onClick={() => void onReplay(row.id)}
                                  >
                                    {replayId === row.id
                                      ? t("settings.replaying")
                                      : t("settings.replay")}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>

              </div>
            </details>
          </>
        ) : (
          <>
            <article className="panel settings-section">
              <h2>{t("set.profile")}</h2>
              <div className="profile-row">
                {prefs.photo ? (
                  <img className="profile-photo" src={prefs.photo} alt={t("set.photoAlt")} />
                ) : (
                  <span className="profile-photo is-initials" aria-hidden="true">
                    {initials(me?.name || me?.email || "u")}
                  </span>
                )}
                <div className="profile-photo-actions">
                  <label className="secondary compact file-button">
                    {t("set.photoChange")}
                    <input type="file" accept="image/*" onChange={(event) => void onPhoto(event.target.files?.[0])} />
                  </label>
                  {prefs.photo ? (
                    <button type="button" className="secondary compact" onClick={() => setPrefs((p) => ({ ...p, photo: null }))}>
                      {t("set.photoRemove")}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="field-grid">
                <label className="field-block">
                  {t("set.yourName")}
                  <input value={me?.name ?? ""} readOnly aria-describedby="profile-ro" />
                </label>
                <label className="field-block">
                  {t("common.email")}
                  <input value={me?.email ?? ""} readOnly aria-describedby="profile-ro" />
                </label>
              </div>
              <p className="hint" id="profile-ro">{t("set.profileReadonly")}</p>
              <label className="field-block">
                {isIndividual ? t("settings.accountName") : t("settings.businessName")}
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
            </article>

            <article className="panel settings-section">
              <h2>{t("set.langTheme")}</h2>
              <fieldset className="segmented-set">
                <legend>{t("header.language")}</legend>
                <div className="segmented-group">
                  {(["fr", "en"] as const).map((code) => (
                    <label key={code} className={locale === code ? "seg is-on" : "seg"}>
                      <input type="radio" name="locale" checked={locale === code} onChange={() => setLocale(code)} />
                      {code === "fr" ? "Français" : "English"}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="segmented-set">
                <legend>{t("set.theme")}</legend>
                <div className="segmented-group">
                  {(["light", "dark", "auto"] as const).map((value) => (
                    <label key={value} className={mode === value ? "seg is-on" : "seg"}>
                      <input type="radio" name="theme" checked={mode === value} onChange={() => setMode(value)} />
                      {value === "light" ? t("theme.light") : value === "dark" ? t("theme.dark") : t("theme.auto")}
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="hint">{t("set.instant")}</p>
            </article>

            <article className="panel settings-section">
              <h2>{t("set.hours")}</h2>
              <p className="hint">{t("set.hoursHint")}</p>
              <fieldset className="days">
                <legend className="sr-only">{t("set.days")}</legend>
                {DAYS.map(([day, label]) => (
                  <label key={day} className={prefs.days.includes(day) ? "day is-on" : "day"}>
                    <input
                      type="checkbox"
                      checked={prefs.days.includes(day)}
                      onChange={(event) =>
                        setPrefs((p) => ({
                          ...p,
                          days: event.target.checked ? [...p.days, day] : p.days.filter((d) => d !== day),
                        }))
                      }
                    />
                    {t(label)}
                  </label>
                ))}
              </fieldset>
              <div className="field-grid">
                <label className="field-block">
                  {t("set.opensAt")}
                  <input type="time" value={prefs.opensAt} onChange={(event) => setPrefs((p) => ({ ...p, opensAt: event.target.value }))} />
                </label>
                <label className="field-block">
                  {t("set.closesAt")}
                  <input type="time" value={prefs.closesAt} onChange={(event) => setPrefs((p) => ({ ...p, closesAt: event.target.value }))} />
                </label>
              </div>
            </article>

            <article className="panel settings-section">
              <h2>{t("set.greeting")}</h2>
              <label className="field-block">
                <span className="hint">{t("set.greetingHint")}</span>
                <textarea
                  rows={3}
                  value={prefs.greeting}
                  placeholder={t("set.greetingPlaceholder")}
                  onChange={(event) => setPrefs((p) => ({ ...p, greeting: event.target.value }))}
                />
              </label>
            </article>

            <article className="panel settings-section">
              <h2>{t("set.notifications")}</h2>
              <div className="switch-row">
                <span>
                  <strong>{t("set.notifyMessage")}</strong>
                  <span className="hint">{t("set.notifyMessageHint")}</span>
                </span>
                <Switch
                  checked={prefs.notifyMessage}
                  label={t("set.notifyMessage")}
                  onChange={(next) => setPrefs((p) => ({ ...p, notifyMessage: next }))}
                />
              </div>
              <div className="switch-row">
                <span>
                  <strong>{t("set.notifyChannel")}</strong>
                  <span className="hint">{t("set.notifyChannelHint")}</span>
                </span>
                <Switch
                  checked={prefs.notifyChannel}
                  label={t("set.notifyChannel")}
                  onChange={(next) => setPrefs((p) => ({ ...p, notifyChannel: next }))}
                />
              </div>
            </article>

            <article className="panel settings-section">
              <h2>{t("set.security")}</h2>
              <div className="switch-row">
                <span>
                  <strong>{t("set.password")}</strong>
                  <span className="hint">{t("set.passwordHint")}</span>
                </span>
                <button type="button" className="secondary compact" disabled>
                  {t("auto.soon")}
                </button>
              </div>
              <div className="switch-row">
                <span>
                  <strong>{t("set.sessions")}</strong>
                  <span className="hint">{t("set.thisDevice")}</span>
                </span>
                <StatusDot tone="ok" label={t("set.activeNow")} />
              </div>
              <div>
                <button type="button" className="danger" onClick={() => setConfirmLogout(true)}>
                  {t("set.logoutEverywhere")}
                </button>
              </div>
            </article>

            <article className="panel">
              <header className="panel-head">
                <div>
                  <h2>{t("settings.replies")}</h2>
                  <p className="hint">{t("settings.repliesHint")}</p>
                </div>
              </header>
              <div className="reply-fields">
                {REPLY_KEYS.map((key) => {
                  const defaults = {
                    ...FALLBACK_REPLIES,
                    ...me?.tenant.verificationReplyDefaults,
                  };
                  const isCustom = replies[key] !== defaults[key];
                  const fieldId = `verification-reply-${key}`;
                  return (
                    <div key={key} className="reply-field">
                      <div className="label-row">
                        <label htmlFor={fieldId}>{t(REPLY_LABEL[key])}</label>
                        {isCustom ? (
                          <button
                            type="button"
                            className="ghost compact"
                            onClick={() =>
                              setReplies((current) => ({
                                ...current,
                                [key]: defaults[key],
                              }))
                            }
                          >
                            {t("settings.repliesReset")}
                          </button>
                        ) : null}
                      </div>
                      <textarea
                        id={fieldId}
                        className="compact"
                        rows={2}
                        maxLength={1000}
                        value={replies[key]}
                        placeholder={defaults[key]}
                        onChange={(event) =>
                          setReplies((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="panel">
              <header className="panel-head">
                <div>
                  <h2>{t("settings.retention")}</h2>
                  <p className="hint">{t("settings.retentionHint")}</p>
                </div>
              </header>
              <label>
                {t("settings.retentionDays")}
                <input
                  type="number"
                  min={7}
                  max={365}
                  value={inboundRetentionDays}
                  onChange={(event) => setInboundRetentionDays(event.target.value)}
                />
                <span className="hint">{t("settings.retentionBounds")}</span>
              </label>
            </article>

          </>
        )}

        {error ? (
          <p className="banner banner-danger" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? <p className="ok">{isChannels ? t("chan.saved") : t("settings.saved")}</p> : null}
        <div>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? t("settings.saving") : isChannels ? t("chan.save") : t("settings.save")}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmLogout}
        title={t("set.logoutTitle")}
        body={t("set.logoutBody")}
        confirmLabel={t("set.logoutEverywhere")}
        danger
        onConfirm={() => void onLogoutEverywhere()}
        onCancel={() => setConfirmLogout(false)}
      />

      <ConfirmDialog
        open={testChannel !== null}
        title={t("chan.testTitle")}
        body={
          testChannel === "telegram"
            ? t("chan.testBodyTelegram", { bot: `@${me?.tenant.telegramBotUsername ?? ""}` })
            : t("chan.testBodyWhatsapp", { number: me?.tenant.whatsappNumber ?? "" })
        }
        confirmLabel={t("chan.openMessages")}
        onConfirm={() => {
          setTestChannel(null);
          navigate("/messages");
        }}
        onCancel={() => setTestChannel(null)}
      />
    </section>
  );
}

function deliveryTone(status: WebhookDelivery["status"]) {
  if (status === "delivered") return "verified";
  if (status === "dead") return "expired";
  return "pending";
}

