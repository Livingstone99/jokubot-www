import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
import { formatWhen } from "../ui.js";
import { WhatsAppNumberField } from "../WhatsAppNumberField.js";

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

export function SettingsPage() {
  const { me, setMe } = useAuth();
  const { theme, setTheme } = useTheme();
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
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.saveError"));
    } finally {
      setBusy(false);
    }
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

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t("settings.eyebrow")}</p>
          <h1>{isIndividual ? t("settings.titleIndividual") : t("settings.title")}</h1>
          <p className="lede">
            {isIndividual ? t("settings.ledeIndividual") : t("settings.lede")}
          </p>
        </div>
      </header>

      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <article className="panel">
          <header className="panel-head">
            <div>
              <h2>Appearance</h2>
              <p className="hint">Light or dark. Saved on this device.</p>
            </div>
          </header>
          <div className="theme-choices">
            <button
              type="button"
              className={theme === "light" ? "primary compact" : "secondary compact"}
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
            >
              Light
            </button>
            <button
              type="button"
              className={theme === "dark" ? "primary compact" : "secondary compact"}
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
            >
              Dark
            </button>
          </div>
        </article>

        <article className="panel">
          <header className="panel-head">
            <div>
              <h2>{isIndividual ? t("settings.account") : t("settings.business")}</h2>
              <p className="hint">
                {isIndividual ? t("settings.accountHint") : t("settings.businessHint")}
              </p>
            </div>
          </header>
          <label>
            {isIndividual ? t("settings.accountName") : t("settings.businessName")}
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
        </article>

        <article className="panel">
          <header className="panel-head">
            <div>
              <h2>Channels</h2>
              <p className="hint">
                Customers send a verification code from these apps. You only
                need one to start.
              </p>
            </div>
          </header>
          <div className="channel-setup">
            <div className={channelBlockClass(whatsapp.status)}>
              <div className="channel-block-head">
                <div>
                  <strong>WhatsApp</strong>
                  <span className={channelStatusClass(whatsapp.status)}>
                    <ChannelStatusMark status={whatsapp.status} />
                    {whatsapp.label}
                  </span>
                </div>
                {me?.tenant.whatsappLinked && me.tenant.whatsappNumber ? (
                  <p className="connect-done-id">{me.tenant.whatsappNumber}</p>
                ) : null}
              </div>
              <ChannelLinkControls channel="whatsapp" />
              {whatsapp.status === "connected" ? null : (
                <p className="hint">{whatsapp.detail}</p>
              )}
              <div className="connect-tile-split">
                <WhatsAppNumberField
                  value={whatsappNumber}
                  preferredCountry={me?.tenant.country}
                  onChange={setWhatsappNumber}
                  hint={
                    whatsapp.status === "connected" ||
                    whatsapp.status === "reconnecting" ||
                    whatsapp.status === "paused"
                      ? "Change this only if you need to link a different number from Home."
                      : "WhatsApp is connected only after you link the number on your phone."
                  }
                />
                {whatsapp.status === "connected" ||
                whatsapp.status === "reconnecting" ||
                whatsapp.status === "paused" ? (
                  <p className="hint">
                    This number is already linked. Save a different number, then
                    finish pairing from Home.
                  </p>
                ) : (
                  <aside className="connect-howto">
                    <p className="connect-howto-title">What to do</p>
                    <ol>
                      <li>Select the country, then enter the WhatsApp number.</li>
                      <li>Save, then finish linking from Home.</li>
                      <li>On your phone: WhatsApp → Settings → Linked devices.</li>
                      <li>Scan the QR or enter the pairing code.</li>
                    </ol>
                  </aside>
                )}
              </div>
            </div>
            <div className={channelBlockClass(telegram.status)}>
              <div className="channel-block-head">
                <div>
                  <strong>Telegram</strong>
                  <span className={channelStatusClass(telegram.status)}>
                    <ChannelStatusMark status={telegram.status} />
                    {telegram.label}
                  </span>
                </div>
                {me?.tenant.telegramBotUsername ? (
                  <p className="connect-done-id">@{me.tenant.telegramBotUsername}</p>
                ) : null}
              </div>
              {telegram.status === "connected" ? null : (
                <p className="hint">{telegram.detail}</p>
              )}
              <ChannelLinkControls channel="telegram" />
              <div className="connect-tile-split">
                <label>
                  Bot token
                  <input
                    value={telegramToken}
                    onChange={(event) => setTelegramToken(event.target.value)}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="123456789:AAH..."
                  />
                  <span className="hint">
                    {telegram.status === "connected" || telegram.status === "degraded"
                      ? t("settings.tgHintReplace")
                      : telegram.status === "disconnected" && me?.tenant.telegramCanReconnect
                        ? t("settings.tgHintReconnect")
                        : t("settings.tgHintSetup")}
                  </span>
                </label>
                {telegram.status === "connected" || telegram.status === "degraded" ? (
                  <p className="hint">
                    Inbound messages already go to this bot. Leave the token
                    blank to keep the current connection.
                  </p>
                ) : (
                  <aside className="connect-howto">
                    <p className="connect-howto-title">What to do</p>
                    <ol>
                      <li>Open Telegram and message BotFather.</li>
                      <li>Create a bot with /newbot, or use an existing one.</li>
                      <li>Copy the bot token BotFather shows you.</li>
                      <li>Paste the token here and save.</li>
                    </ol>
                  </aside>
                )}
              </div>
            </div>
          </div>
          {whatsapp.status === "pending" ? (
            <p className="banner banner-warn">
              This WhatsApp number is saved but not linked yet.{" "}
              <Link to="/overview">Finish linking from Home</Link> with the QR or
              pairing code on your phone.
            </p>
          ) : null}
          {telegram.status === "pending" ? (
            <p className="banner banner-warn">
              Telegram needs a bot token from BotFather, not only a username.
              Paste the token above or on Home.
            </p>
          ) : null}
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
              <h2>Completion webhook</h2>
              <p className="hint">
                Signed <code>verification.completed</code> when a code is
                claimed, and <code>message.received</code> when a trigger
                matches. Trust this, not the browser websocket.
              </p>
            </div>
          </header>
          <label>
            Webhook URL
            <input
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://your-app.example/webhooks/verify"
            />
          </label>
          {webhookSecret ? (
            <p className="secret">
              <span>
                Webhook secret (shown once): <code>{webhookSecret}</code>
              </span>
            </p>
          ) : me?.tenant.hasWebhookSecret ? (
            <p className="hint">A webhook secret is already stored. Saving a new URL will not rotate it.</p>
          ) : (
            <p className="hint">A secret is generated the first time you save a URL.</p>
          )}
          {me?.tenant.webhookUrl ? (
            <div className="panel-actions">
              <button
                type="button"
                className="secondary compact"
                disabled={testBusy || busy}
                onClick={() => void onTestWebhook()}
              >
                {testBusy ? "Sending…" : "Send test event"}
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

        {error ? (
          <p className="banner banner-danger" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? <p className="ok">Saved.</p> : null}
        <div>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </section>
  );
}

function deliveryTone(status: WebhookDelivery["status"]) {
  if (status === "delivered") return "verified";
  if (status === "dead") return "expired";
  return "pending";
}

