import { type FormEvent, useEffect, useRef, useState } from "react";

import { api, type WhatsAppPair } from "./api.js";
import { useAuth } from "./auth.js";
import { WhatsAppNumberField } from "./WhatsAppNumberField.js";
import { ConnectedMark, hasChannelSetup } from "./ui.js";

export function ChannelReadyHint() {
  const { me } = useAuth();
  const tenant = me?.tenant;
  const whatsappOn = tenant?.whatsappStatus === "connected";
  const telegramOn = tenant?.telegramStatus === "connected";
  if (!tenant || (!whatsappOn && !telegramOn)) {
    return null;
  }

  return (
    <div className="channel-ready" role="status">
      {whatsappOn ? (
        <span className="channel channel-whatsapp">
          <ConnectedMark />
          <span>WhatsApp</span>
          {tenant.whatsappNumber ? (
            <span className="channel-ready-id">{tenant.whatsappNumber}</span>
          ) : null}
        </span>
      ) : null}
      {telegramOn ? (
        <span className="channel channel-telegram">
          <ConnectedMark />
          <span>Telegram</span>
          {tenant.telegramBotUsername ? (
            <span className="channel-ready-id">@{tenant.telegramBotUsername}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export function ChannelConnectCard() {
  const { me, setMe } = useAuth();
  const tenant = me?.tenant;
  const whatsappReady = Boolean(tenant?.whatsappLinked);
  const telegramReady = Boolean(tenant?.telegramLinked);
  const canVerify = hasChannelSetup(tenant);

  const [whatsapp, setWhatsapp] = useState(tenant?.whatsappNumber ?? "");
  const [telegramToken, setTelegramToken] = useState("");
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"whatsapp" | "telegram" | null>(null);
  const [pair, setPair] = useState<WhatsAppPair | null>(null);
  const autoStarted = useRef(false);

  useEffect(() => {
    setWhatsapp(tenant?.whatsappNumber ?? "");
  }, [tenant?.whatsappNumber]);

  useEffect(() => {
    if (tenant?.telegramLinked) {
      setTelegramToken("");
    }
  }, [tenant?.telegramLinked]);

  useEffect(() => {
    if (!tenant?.whatsappNumber || tenant.whatsappLinked || tenant.whatsappStatus === "disconnected") {
      return;
    }
    let cancelled = false;
    async function tick() {
      try {
        const result = await api.whatsappPair();
        if (cancelled) {
          return;
        }
        setPair(result.pair);
        setMe((current) =>
          current ? { ...current, tenant: result.tenant } : current,
        );
        if (
          !autoStarted.current &&
          result.pair.status === "idle" &&
          result.tenant.whatsappNumber &&
          !result.tenant.whatsappLinked &&
          result.tenant.whatsappStatus !== "disconnected"
        ) {
          autoStarted.current = true;
          const started = await api.startWhatsAppPair(result.tenant.whatsappNumber);
          if (cancelled) {
            return;
          }
          setPair(started.pair);
          setMe((current) =>
            current ? { ...current, tenant: started.tenant } : current,
          );
        }
      } catch {
        // Keep the last pairing panel if a poll fails.
      }
    }
    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [setMe, tenant?.whatsappLinked, tenant?.whatsappNumber, tenant?.whatsappStatus]);

  if (!tenant) {
    return null;
  }

  const whatsappUnchanged = whatsapp.trim() === (tenant.whatsappNumber ?? "");
  const pairingActive =
    !whatsappReady &&
    tenant.whatsappStatus !== "disconnected" &&
    (pair?.status === "waiting" ||
      pair?.status === "error" ||
      Boolean(pair?.qrDataUrl || pair?.pairingCode) ||
      Boolean(tenant.whatsappNumber));

  async function saveChannel(
    channel: "whatsapp" | "telegram",
    event: FormEvent,
  ) {
    event.preventDefault();
    if (!me) {
      return;
    }
    const value = channel === "whatsapp" ? whatsapp.trim() : telegramToken.trim();
    const error =
      channel === "whatsapp" ? whatsappHint(value) : telegramHint(value);
    if (error) {
      if (channel === "whatsapp") {
        setWhatsappError(error);
      } else {
        setTelegramError(error);
      }
      return;
    }

    setSaving(channel);
    if (channel === "whatsapp") {
      setWhatsappError(null);
    } else {
      setTelegramError(null);
    }
    try {
      if (channel === "whatsapp") {
        const result = await api.startWhatsAppPair(value);
        setMe({ ...me, tenant: result.tenant });
        setPair(result.pair);
      } else {
        const result = await api.connectTelegram(value);
        setMe({ ...me, tenant: result.tenant });
        setTelegramToken("");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save this channel.";
      if (channel === "whatsapp") {
        setWhatsappError(message);
      } else {
        setTelegramError(message);
      }
    } finally {
      setSaving(null);
    }
  }

  if (canVerify && !pairingActive) {
    return null;
  }

  const whatsappStatus = whatsappReady
    ? "Connected"
    : pair?.status === "waiting"
      ? "Link your phone"
      : pair?.status === "error"
        ? "Link failed"
        : tenant.whatsappNumber
          ? "Number saved — not linked"
          : "Not connected";
  const pairingWhileReady = canVerify && pairingActive;

  return (
    <article className="connect-card">
      <header className="connect-head">
        <div>
          <p className="eyebrow">Channels</p>
          <h2>{pairingWhileReady ? "Link WhatsApp" : "Connect WhatsApp or Telegram"}</h2>
          <p className="lede">
            {pairingWhileReady
              ? "Scan the QR or enter the pairing code on your phone. Telegram is already receiving codes."
              : "Connect one channel to issue codes. The customer sends the code from that app. You do not reply to complete the check."}
          </p>
        </div>
        {pairingWhileReady ? null : (
          <p className="connect-progress">Nothing connected yet</p>
        )}
      </header>

      {canVerify ? null : (
        <ol className="connect-steps" aria-label="Setup steps">
          <li className="is-current">
            <span aria-hidden="true">1</span>
            Connect a channel
          </li>
          <li>
            <span aria-hidden="true">2</span>
            Start verifying
          </li>
        </ol>
      )}

      <div className="connect-grid">
        {whatsappReady ? null : (
          <form
            className={`connect-tile is-whatsapp${pairingActive ? " is-pairing" : ""}`}
            onSubmit={(event) => void saveChannel("whatsapp", event)}
          >
            <div className="connect-tile-head">
              <span className="connect-icon" aria-hidden="true">
                <WhatsAppIcon />
              </span>
              <div>
                <strong>WhatsApp</strong>
                <span className="connect-status">{whatsappStatus}</span>
              </div>
            </div>
            <div className="connect-tile-split">
              <div className="connect-tile-main">
                <p>
                  Use the business number people already message. After you save
                  it, scan the QR or enter the pairing code on your phone.
                </p>
                <WhatsAppNumberField
                  value={whatsapp}
                  preferredCountry={tenant.country}
                  onChange={(next) => {
                    setWhatsapp(next);
                    setWhatsappError(null);
                  }}
                />
                {whatsappError ? (
                  <p className="error" role="alert">
                    {whatsappError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="primary"
                  disabled={
                    saving === "whatsapp" ||
                    !whatsapp.trim() ||
                    (pair?.status === "waiting" && whatsappUnchanged)
                  }
                >
                  {saving === "whatsapp"
                    ? "Connecting…"
                    : pair?.status === "waiting" && whatsappUnchanged
                      ? "Waiting for phone"
                      : pair?.status === "error"
                        ? "Pair again"
                        : tenant.whatsappNumber
                          ? "Link WhatsApp"
                          : "Connect WhatsApp"}
                </button>
              </div>
              <ConnectHowTo
                title="What to do"
                current={whatsappHowToStep(false, pairingActive)}
                steps={[
                  "Select the country, then enter the WhatsApp number.",
                  "Click Connect WhatsApp to start linking.",
                  "On your phone, open WhatsApp → Settings → Linked devices → Link a device.",
                  "Scan the QR, or choose Link with phone number and type the 8-character code.",
                ]}
              />
            </div>
            <WhatsAppPairPanel pair={pair} linked={whatsappReady} />
          </form>
        )}

        {telegramReady ? null : (
          <form
            className="connect-tile is-telegram"
            onSubmit={(event) => void saveChannel("telegram", event)}
          >
            <div className="connect-tile-head">
              <span className="connect-icon" aria-hidden="true">
                <TelegramIcon />
              </span>
              <div>
                <strong>Telegram</strong>
                <span className="connect-status">Not connected</span>
              </div>
            </div>
            <div className="connect-tile-split">
              <div className="connect-tile-main">
                <p>
                  Paste the bot token from BotFather. We confirm the bot with
                  Telegram and save its username for customer links.
                </p>
                <label>
                  Bot token
                  <input
                    value={telegramToken}
                    onChange={(event) => {
                      setTelegramToken(event.target.value);
                      setTelegramError(null);
                    }}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="123456789:AAH..."
                  />
                </label>
                {telegramError ? (
                  <p className="error" role="alert">
                    {telegramError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="primary"
                  disabled={saving === "telegram" || !telegramToken.trim()}
                >
                  {saving === "telegram" ? "Connecting…" : "Connect Telegram"}
                </button>
              </div>
              <ConnectHowTo
                title="What to do"
                current={telegramToken.trim() ? 3 : 0}
                steps={[
                  "Open Telegram and message BotFather.",
                  "Create a bot with /newbot, or pick one you already have.",
                  "Copy the bot token BotFather shows you. It looks like 123456:AAH…",
                  "Paste the token here and click Connect Telegram.",
                ]}
              />
            </div>
          </form>
        )}
      </div>

      {canVerify ? null : (
        <p className="hint connect-footnote">
          You only need one channel. WhatsApp is connected after you link your
          phone. Telegram is connected after we verify the bot token.
        </p>
      )}
    </article>
  );
}

function ConnectHowTo({
  title,
  steps,
  current,
}: {
  title: string;
  steps: string[];
  current: number;
}) {
  return (
    <aside className="connect-howto">
      <p className="connect-howto-title">{title}</p>
      <ol>
        {steps.map((step, index) => (
          <li
            key={step}
            className={
              current < 0 || index < current
                ? "is-done"
                : index === current
                  ? "is-current"
                  : undefined
            }
          >
            {step}
          </li>
        ))}
      </ol>
    </aside>
  );
}

function whatsappHowToStep(linked: boolean, pairing: boolean): number {
  if (linked) {
    return -1;
  }
  if (pairing) {
    return 2;
  }
  return 0;
}

function WhatsAppPairPanel({
  pair,
  linked,
}: {
  pair: WhatsAppPair | null;
  linked: boolean;
}) {
  if (linked || !pair || pair.status === "idle" || pair.status === "linked") {
    return null;
  }

  if (pair.status === "error") {
    return (
      <div className="connect-pair" role="alert">
        <p>{pair.message ?? "The QR expired. Start pairing again."}</p>
      </div>
    );
  }

  return (
    <div className="connect-pair" aria-live="polite">
      {pair.qrDataUrl ? (
        <img
          className="connect-pair-qr"
          src={pair.qrDataUrl}
          alt="WhatsApp pairing QR code"
          width={180}
          height={180}
        />
      ) : (
        <div className="connect-pair-qr is-pending">
          {/finishing/i.test(pair.message ?? "")
            ? "Finishing link…"
            : "Preparing QR…"}
        </div>
      )}
      <div className="connect-pair-copy">
        <strong>Link this number on your phone</strong>
        <p>
          {pair.message ??
            "Open WhatsApp → Settings → Linked devices → Link a device, then scan the QR. Or choose Link with phone number and enter the code below."}
        </p>
        {pair.pairingCode ? (
          <p className="connect-pair-code">{pair.pairingCode}</p>
        ) : (
          <p className="hint">A pairing code will appear here if your phone asks for one.</p>
        )}
      </div>
    </div>
  );
}

function whatsappHint(value: string): string | null {
  if (!value) {
    return "Enter the WhatsApp number customers already message.";
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return "Select a country and enter the rest of the number.";
  }
  return null;
}

function telegramHint(value: string): string | null {
  if (!value) {
    return "Paste the bot token BotFather gave you.";
  }
  if (!/^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(value.trim())) {
    return "Paste the bot token BotFather gave you, not the @username.";
  }
  return null;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.4-1.4a10.1 10.1 0 0 0 4.64 1.13h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2zm5.76 14.13c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.12.1-1.81-.11-.42-.13-.95-.31-1.64-.6-2.89-1.25-4.77-4.16-4.92-4.35-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.2-.14.31-.28.48-.14.16-.3.37-.42.5-.14.14-.29.29-.12.56.16.27.73 1.2 1.56 1.95 1.07.96 1.97 1.26 2.24 1.4.27.14.43.12.58-.07.16-.2.66-.77.84-1.03.18-.27.36-.22.6-.13.24.08 1.53.72 1.79.85.27.14.44.2.51.31.07.11.07.64-.17 1.32z"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="currentColor"
        d="M21.9 4.3 18.7 20c-.24 1.07-.87 1.33-1.77.83l-4.88-3.6-2.36 2.27c-.26.26-.48.48-.98.48l.35-4.97 9.05-8.18c.39-.35-.09-.54-.6-.2L5.7 13.17 1.02 11.7c-1.02-.32-1.04-1.02.21-1.51L20.6 3.5c.85-.32 1.59.2 1.3.8z"
      />
    </svg>
  );
}
