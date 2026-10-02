import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import {
  api,
  type TelegramLinkProblem,
  type Tenant,
  type WhatsAppLinkProblem,
  type WhatsAppLinkStatus,
  type TelegramLinkStatus,
} from "./api.js";
import { useAuth } from "./auth.js";
import { useT } from "./locale.js";
import type { MessageKey } from "./i18n.js";
import { ConnectedMark } from "./ui.js";
import { ConfirmDialog, useToast } from "./kit/ui.js";

type Translate = (key: MessageKey) => string;

type Tone = "ok" | "warn" | "danger" | "neutral";

export type ChannelCopy = {
  status: string;
  label: string;
  detail: string;
  tone: Tone;
};

function toneFor(status: string): Tone {
  if (status === "connected") {
    return "ok";
  }
  if (status === "disconnected") {
    return "danger";
  }
  return "warn";
}

function shortLabel(
  t: Translate,
  status: string,
  channel: "whatsapp" | "telegram",
): string {
  switch (status) {
    case "connected":
      return t("common.connected");
    case "reconnecting":
      return t("channel.reconnecting");
    case "paused":
      return t("channel.paused");
    case "degraded":
      return t("channel.deliveryFailing");
    case "disconnected":
      return t("channel.disconnected");
    case "pending":
      return channel === "whatsapp" ? t("channel.linkPhone") : t("channel.addToken");
    default:
      return t("common.notConnected");
  }
}

function whatsappDetail(
  t: Translate,
  problem: WhatsAppLinkProblem | null,
  status: WhatsAppLinkStatus,
  number: string | null,
): string {
  if (status === "connected") {
    return number ?? t("common.connected");
  }
  const reason =
    status === "reconnecting"
      ? t("channel.waReconnecting")
      : status === "paused"
        ? t("channel.waPaused")
        : status === "pending"
          ? t("settings.numberSaved")
          : status === "disconnected"
            ? problem === "replaced"
              ? t("channel.waReplaced")
              : problem === "forbidden"
                ? t("channel.waForbidden")
                : problem === "user"
                  ? t("channel.waUser")
                  : t("channel.waLoggedOut")
            : t("overview.notConnectedYet");
  return number ? `${number} — ${reason}` : reason;
}

function telegramDetail(
  t: Translate,
  problem: TelegramLinkProblem | null,
  status: TelegramLinkStatus,
  username: string | null,
): string {
  if (status === "connected") {
    return username ? `@${username}` : t("common.connected");
  }
  if (status === "pending") {
    return username ? `@${username}` : t("overview.notConnectedYet");
  }
  const handle = username ? `@${username}` : null;
  const reason =
    status === "degraded"
      ? t("channel.tgWebhook")
      : status === "disconnected"
        ? problem === "unauthorized"
          ? t("channel.tgUnauthorized")
          : problem === "user"
            ? t("channel.tgUser")
            : t("channel.tgWebhook")
        : t("overview.notConnectedYet");
  return handle ? `${handle} — ${reason}` : reason;
}

export function describeChannel(
  t: Translate,
  channel: "whatsapp" | "telegram",
  tenant: Tenant | undefined,
): ChannelCopy {
  if (channel === "whatsapp") {
    const status = tenant?.whatsappStatus ?? "off";
    return {
      status,
      label: shortLabel(t, status, channel),
      detail: whatsappDetail(
        t,
        tenant?.whatsappLinkProblem ?? null,
        status,
        tenant?.whatsappNumber ?? null,
      ),
      tone: toneFor(status),
    };
  }
  const status = tenant?.telegramStatus ?? "off";
  return {
    status,
    label: shortLabel(t, status, channel),
    detail: telegramDetail(
      t,
      tenant?.telegramLinkProblem ?? null,
      status,
      tenant?.telegramBotUsername ?? null,
    ),
    tone: toneFor(status),
  };
}

export function channelBlockClass(status: string): string {
  if (status === "connected") {
    return "channel-block is-ready";
  }
  if (status === "disconnected") {
    return "channel-block is-down";
  }
  if (status === "reconnecting" || status === "paused" || status === "degraded") {
    return "channel-block is-warn";
  }
  return "channel-block";
}

export function channelStatusClass(status: string): string {
  if (status === "connected") {
    return "connect-status is-on";
  }
  if (status === "disconnected") {
    return "connect-status is-down";
  }
  if (
    status === "reconnecting" ||
    status === "paused" ||
    status === "degraded" ||
    status === "pending"
  ) {
    return "connect-status is-warn";
  }
  return "connect-status";
}

export function ChannelLinkControls({
  channel,
}: {
  channel: "whatsapp" | "telegram";
}) {
  const { pathname } = useLocation();
  const { me, setMe } = useAuth();
  const t = useT();
  const tenant = me?.tenant;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"reconnect" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const toast = useToast();

  if (!tenant) {
    return null;
  }

  const described = describeChannel(t, channel, tenant);
  const channelName = channel === "whatsapp" ? t("common.whatsapp") : t("common.telegram");
  const showDisconnect =
    channel === "whatsapp"
      ? described.status === "connected" ||
        described.status === "reconnecting" ||
        described.status === "paused"
      : described.status === "connected" || described.status === "degraded";
  const showReconnect =
    channel === "whatsapp"
      ? Boolean(tenant.whatsappNumber) &&
        (described.status === "paused" ||
          described.status === "reconnecting" ||
          described.status === "disconnected")
      : described.status === "degraded" ||
        (described.status === "disconnected" && tenant.telegramCanReconnect);

  if (!showDisconnect && !showReconnect) {
    return null;
  }

  async function onReconnect() {
    setBusy("reconnect");
    setError(null);
    setNotice(null);
    setConfirming(false);
    try {
      if (channel === "whatsapp") {
        const result = await api.reconnectWhatsApp();
        setMe((current) =>
          current ? { ...current, tenant: result.tenant } : current,
        );
        if (
          result.pair.status === "waiting" ||
          result.pair.qrDataUrl ||
          result.pair.pairingCode
        ) {
          setNotice(t("channel.pairStarted"));
        }
      } else {
        const result = await api.reconnectTelegram();
        setMe((current) =>
          current ? { ...current, tenant: result.tenant } : current,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("channel.actionError"));
    } finally {
      setBusy(null);
    }
  }

  async function onDisconnect() {
    setBusy("disconnect");
    setError(null);
    setNotice(null);
    try {
      const result =
        channel === "whatsapp"
          ? await api.disconnectWhatsApp()
          : await api.disconnectTelegram();
      setMe((current) =>
        current ? { ...current, tenant: result.tenant } : current,
      );
      setConfirming(false);
      toast({ text: t("chan.disconnected", { channel: channelName }) });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("channel.actionError"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="channel-actions">
      {showReconnect ? (
        <button
          type="button"
          className="secondary compact"
          disabled={busy !== null}
          onClick={() => void onReconnect()}
        >
          {t("channel.reconnect")}
        </button>
      ) : null}
      {showDisconnect ? (
        <button
          type="button"
          className="danger compact"
          disabled={busy !== null}
          onClick={() => setConfirming(true)}
        >
          {t("channel.disconnect")}
        </button>
      ) : null}
      <ConfirmDialog
        open={confirming}
        title={t("chan.disconnectTitle", { channel: channelName })}
        body={t("chan.disconnectBody")}
        confirmLabel={t("channel.disconnect")}
        danger
        busy={busy !== null}
        onConfirm={() => void onDisconnect()}
        onCancel={() => setConfirming(false)}
      />
      {notice ? (
        <p className="hint">
          {notice}
          {pathname === "/channels" ? null : (
            <>
              {" "}
              <Link to="/channels">{t("settings.finishHome")}</Link>
            </>
          )}
        </p>
      ) : null}
      {error ? <p className="banner banner-danger">{error}</p> : null}
    </div>
  );
}

export function ChannelStatusMark({ status }: { status: string }) {
  if (status !== "connected") {
    return null;
  }
  return <ConnectedMark />;
}
