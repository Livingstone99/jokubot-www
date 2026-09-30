import { useState, type ReactNode } from "react";

import { localeTag, t } from "./i18n.js";
import { useT } from "./locale.js";

export function formatWhen(value: string): string {
  const date = new Date(value);
  const delta = Date.now() - date.getTime();
  if (Number.isNaN(delta)) {
    return value;
  }
  const abs = Math.abs(delta);
  const suffix = (n: string) =>
    delta < 0 ? t("ui.timeIn", { n }) : t("ui.timeAgo", { n });
  if (abs < 45_000) {
    return delta < 0 ? t("ui.soon") : t("ui.justNow");
  }
  if (abs < 3_600_000) {
    return suffix(`${Math.max(1, Math.floor(abs / 60_000))}m`);
  }
  if (abs < 86_400_000) {
    return suffix(`${Math.floor(abs / 3_600_000)}h`);
  }
  return date.toLocaleString(localeTag(), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function senderLabel(row: {
  channel: string;
  senderRef: string;
  phoneNumber?: string | null;
  displayName?: string | null;
}): string {
  if (row.phoneNumber) {
    return row.phoneNumber;
  }
  if (row.displayName) {
    return row.displayName;
  }
  const jidUser = row.senderRef.split("@")[0]?.split(":")[0] ?? "";
  if (row.channel === "whatsapp" && /^\d{7,15}$/.test(jidUser)) {
    return `+${jidUser}`;
  }
  return row.senderRef;
}

export function senderPreview(row: {
  lastBody: string | null;
  lastReplyText: string | null;
  lastOutcome: string;
}): string {
  const body = row.lastBody?.trim();
  if (body) {
    return body;
  }
  const reply = row.lastReplyText?.trim();
  if (reply) {
    return reply;
  }
  return outcomeLabel(row.lastOutcome);
}

export function channelLabel(channel: string): string {
  if (channel === "both") {
    return t("ui.whatsappAndTelegram");
  }
  return channel === "telegram" ? t("common.telegram") : t("common.whatsapp");
}

export function hasChannelSetup(tenant?: {
  whatsappLinked?: boolean;
  whatsappNumber: string | null;
  telegramBotUsername: string | null;
  telegramLinked?: boolean;
} | null): boolean {
  return Boolean(tenant?.whatsappLinked || tenant?.telegramLinked);
}

export function statusLabel(status: string): string {
  if (status === "pending") {
    return t("ui.waiting");
  }
  if (status === "verified") {
    return t("ui.verified");
  }
  if (status === "expired") {
    return t("ui.expired");
  }
  return status;
}

export function proofLabel(subject: string | null | undefined): string {
  if (subject === "phone_number") {
    return t("ui.proofPhone");
  }
  if (subject === "messaging_identity") {
    return t("ui.proofIdentity");
  }
  return t("common.dash");
}

export function outcomeLabel(outcome: string): string {
  const keys: Record<string, "ui.outcome.verified" | "ui.outcome.triggered" | "ui.outcome.no_token" | "ui.outcome.unknown_token" | "ui.outcome.expired" | "ui.outcome.already_used" | "ui.outcome.channel_mismatch" | "ui.outcome.sender_mismatch" | "ui.outcome.rate_limited" | "ui.outcome.processing"> = {
    verified: "ui.outcome.verified",
    triggered: "ui.outcome.triggered",
    no_token: "ui.outcome.no_token",
    unknown_token: "ui.outcome.unknown_token",
    expired: "ui.outcome.expired",
    already_used: "ui.outcome.already_used",
    channel_mismatch: "ui.outcome.channel_mismatch",
    sender_mismatch: "ui.outcome.sender_mismatch",
    rate_limited: "ui.outcome.rate_limited",
    processing: "ui.outcome.processing",
  };
  const key = keys[outcome];
  return key ? t(key) : outcome;
}

export function StatusPill({ status }: { status: string }) {
  useT();
  return <span className={`pill pill-${status}`}>{statusLabel(status)}</span>;
}

export function ChannelBadge({ channel }: { channel: string }) {
  useT();
  return (
    <span className={`channel channel-${channel}`}>
      {channel === "both" ? (
        <>
          <span className="channel-dot is-whatsapp" aria-hidden="true" />
          <span className="channel-dot is-telegram" aria-hidden="true" />
        </>
      ) : (
        <span className="channel-dot" aria-hidden="true" />
      )}
      <span>{channelLabel(channel)}</span>
    </span>
  );
}

export function ProofPill({ subject }: { subject: string | null | undefined }) {
  useT();
  if (!subject) {
    return <span className="muted">{t("common.dash")}</span>;
  }
  return (
    <span className={`pill pill-proof-${subject === "phone_number" ? "phone" : "identity"}`}>
      {proofLabel(subject)}
    </span>
  );
}

export function OutcomePill({ outcome }: { outcome: string }) {
  useT();
  const tone =
    outcome === "verified" || outcome === "triggered"
      ? "verified"
      : outcome === "processing"
        ? "pending"
        : "expired";
  return <span className={`pill pill-${tone}`}>{outcomeLabel(outcome)}</span>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function CopyButton({
  value,
  label,
  title,
}: {
  value: string;
  label?: string;
  title?: string;
}) {
  const translate = useT();
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      className="secondary compact"
      title={title}
      onClick={() => void onCopy()}
    >
      {copied ? translate("common.copied") : (label ?? translate("common.copy"))}
    </button>
  );
}

export function ConnectedMark() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M5.4 8.1 7.1 9.8l3.5-3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function initials(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (/^\+?\d[\d\s-]*$/.test(value.trim()) && digits.length >= 7) {
    return digits.slice(-2);
  }
  const source = value.includes("@")
    ? (value.split("@")[0] ?? value)
    : value.trim();
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
