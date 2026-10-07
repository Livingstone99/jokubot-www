import { type FormEvent, useEffect, useRef, useState } from "react";

import { api, type WhatsAppPair } from "./api.js";
import { useAuth } from "./auth.js";
import { WhatsAppNumberField } from "./WhatsAppNumberField.js";
import { ConnectedMark, hasChannelSetup } from "./ui.js";
import { useT } from "./locale.js";

type Translate = ReturnType<typeof useT>;

export function ChannelReadyHint() {
  const t = useT();
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
          <span>{t("common.whatsapp")}</span>
          {tenant.whatsappNumber ? (
            <span className="channel-ready-id">{tenant.whatsappNumber}</span>
          ) : null}
        </span>
      ) : null}
      {telegramOn ? (
        <span className="channel channel-telegram">
          <ConnectedMark />
          <span>{t("common.telegram")}</span>
          {tenant.telegramBotUsername ? (
            <span className="channel-ready-id">@{tenant.telegramBotUsername}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export function ChannelConnectCard() {
  const t = useT();
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
      channel === "whatsapp" ? whatsappHint(value, t) : telegramHint(value, t);
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
        err instanceof Error ? err.message : t("connect.saveError");
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
      ? t("channel.linkPhone")
      : pair?.status === "error"
        ? t("connect.linkFailed")
        : tenant.whatsappNumber
          ? t("settings.numberSaved")
          : t("common.notConnected");
  const pairingWhileReady = canVerify && pairingActive;

  return (
    <article className="connect-card">
      <header className="connect-head">
        <div>
          <p className="eyebrow">{t("settings.channels")}</p>
          <h2>{pairingWhileReady ? t("connect.linkWhatsapp") : t("connect.connectTitle")}</h2>
          <p className="lede">
            {pairingWhileReady
              ? t("connect.ledePairing")
              : t("connect.ledeSetup")}
          </p>
        </div>
        {pairingWhileReady ? null : (
          <p className="connect-progress">{t("connect.nothingYet")}</p>
        )}
      </header>

      {canVerify ? null : (
        <ol className="connect-steps" aria-label={t("connect.stepsAria")}>
          <li className="is-current">
            <span aria-hidden="true">1</span>
            {t("verify.step1Title")}
          </li>
          <li>
            <span aria-hidden="true">2</span>
            {t("connect.step2")}
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
                <strong>{t("common.whatsapp")}</strong>
                <span className="connect-status">{whatsappStatus}</span>
              </div>
            </div>
            <div className="connect-tile-split">
              <div className="connect-tile-main">
                <p>
                  {t("connect.waBody")}
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
                      ? t("connect.waitingPhone")
                      : pair?.status === "error"
                        ? t("connect.pairAgain")
                        : tenant.whatsappNumber
                          ? t("connect.linkWhatsapp")
                          : t("connect.connectWa")}
                </button>
              </div>
              <ConnectHowTo
                title={t("settings.howto")}
                current={whatsappHowToStep(false, pairingActive)}
                steps={[
                  t("settings.waStep1"),
                  t("connect.waStep2"),
                  t("connect.waStep3"),
                  t("connect.waStep4"),
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
                <strong>{t("common.telegram")}</strong>
                <span className="connect-status">{t("common.notConnected")}</span>
              </div>
            </div>
            <div className="connect-tile-split">
              <div className="connect-tile-main">
                <p>
                  {t("connect.tgBody")}
                </p>
                <label>
                  {t("settings.botToken")}
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
                  {saving === "telegram" ? "Connecting…" : t("connect.connectTg")}
                </button>
              </div>
              <ConnectHowTo
                title={t("settings.howto")}
                current={telegramToken.trim() ? 3 : 0}
                steps={[
                  t("settings.tgStep1"),
                  t("connect.tgStep2"),
                  t("connect.tgStep3"),
                  t("connect.tgStep4"),
                ]}
              />
            </div>
          </form>
        )}
      </div>

      {canVerify ? null : (
        <p className="hint connect-footnote">
          {t("connect.footnote")}
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
  const t = useT();
  if (linked || !pair || pair.status === "idle" || pair.status === "linked") {
    return null;
  }

  if (pair.status === "error") {
    return (
      <div className="connect-pair" role="alert">
        <p>{pair.message ?? t("connect.qrExpired")}</p>
      </div>
    );
  }

  return (
    <div className="connect-pair" aria-live="polite">
      {pair.qrDataUrl ? (
        <img
          className="connect-pair-qr"
          src={pair.qrDataUrl}
          alt={t("connect.qrAlt")}
          width={180}
          height={180}
        />
      ) : (
        <div className="connect-pair-qr is-pending">
          {/finishing/i.test(pair.message ?? "")
            ? t("connect.finishing")
            : t("connect.preparingQr")}
        </div>
      )}
      <div className="connect-pair-copy">
        <strong>{t("connect.linkNumber")}</strong>
        <p>
          {pair.message ??
            t("connect.pairDefault")}
        </p>
        {pair.pairingCode ? (
          <p className="connect-pair-code">{pair.pairingCode}</p>
        ) : (
          <p className="hint">{t("connect.pairCodeHint")}</p>
        )}
      </div>
    </div>
  );
}

function whatsappHint(value: string, t: Translate): string | null {
  if (!value) {
    return t("connect.waEmpty");
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return t("connect.waInvalid");
  }
  return null;
}

function telegramHint(value: string, t: Translate): string | null {
  if (!value) {
    return t("connect.tgEmpty");
  }
  if (!/^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(value.trim())) {
    return t("connect.tgInvalid");
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
