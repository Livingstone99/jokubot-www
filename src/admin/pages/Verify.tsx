import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  api,
  type CreatedVerification,
  type Verification,
  type VerificationPurpose,
} from "../api.js";
import { useAuth } from "../auth.js";
import { WhatsAppNumberField } from "../WhatsAppNumberField.js";
import {
  ChannelBadge,
  CopyButton,
  EmptyState,
  ProofPill,
  StatusPill,
  formatWhen,
} from "../ui.js";
import { useT } from "../locale.js";

type Translate = ReturnType<typeof useT>;

export function VerifyPage() {
  const t = useT();
  const { me } = useAuth();
  const [channel, setChannel] = useState<"whatsapp" | "telegram">("whatsapp");
  const [contact, setContact] = useState("");
  const [prompt, setPrompt] = useState("");
  const [purpose, setPurpose] = useState("authentication");
  const [purposes, setPurposes] = useState<VerificationPurpose[]>([]);
  const [active, setActive] = useState<CreatedVerification | null>(null);
  const [status, setStatus] = useState<"waiting" | "verified" | "expired" | "error">(
    "waiting",
  );
  const [subject, setSubject] = useState<string | null>(null);
  const [items, setItems] = useState<Verification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const result = await api.verifications();
    setItems(result.items);
  }

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : t("sessions.loadError"));
    });
    void api
      .purposes()
      .then((result) => {
        setPurposes(result.items);
        if (
          result.items.length > 0 &&
          !result.items.some((item) => item.slug === purpose)
        ) {
          setPurpose(result.items[0]?.slug ?? "authentication");
        }
      })
      .catch(() => {
        setPurposes([]);
      });
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }
    if (!/^wss?:/i.test(active.realtimeUrl)) {
      return;
    }
    const socket = new WebSocket(active.realtimeUrl);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as {
        type?: string;
        status?: string;
        verifiedSubject?: string;
      };
      if (
        message.type === "verified" ||
        (message.type === "status" && message.status === "verified")
      ) {
        setStatus("verified");
        setSubject(message.verifiedSubject ?? null);
        void refresh();
        socket.close();
      }
      if (
        message.type === "expired" ||
        (message.type === "status" && message.status === "expired")
      ) {
        setStatus("expired");
        socket.close();
      }
    });
    socket.addEventListener("error", () => setStatus("error"));
    return () => socket.close();
  }, [active]);

  const whatsappReady = Boolean(me?.tenant.whatsappLinked);
  const telegramReady = Boolean(me?.tenant.telegramLinked);
  const hasChannelSetup = whatsappReady || telegramReady;
  const hasWebhookSetup = Boolean(me?.tenant.webhookUrl && me?.tenant.hasWebhookSecret);

  useEffect(() => {
    if (channel === "whatsapp" && !whatsappReady && telegramReady) {
      setChannel("telegram");
    } else if (channel === "telegram" && !telegramReady && whatsappReady) {
      setChannel("whatsapp");
    }
  }, [channel, whatsappReady, telegramReady]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!contact) {
      setError(t("verify.contactRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api.createVerification(
        channel,
        contact,
        channel === "whatsapp" ? prompt || undefined : undefined,
        purpose,
      );
      setActive(created);
      setStatus("waiting");
      setSubject(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("verify.createError"));
    } finally {
      setBusy(false);
    }
  }

  const channelReady = channel === "whatsapp" ? whatsappReady : telegramReady;
  const completed = items.filter((item) => item.status === "verified");

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t("nav.verify")}</p>
          <h1>{t("verify.title")}</h1>
          <p className="lede">
            {t("verify.lede")}
          </p>
        </div>
      </header>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>{t("verify.checklist")}</h2>
            <p className="hint">
              {t("verify.checklistHint")}
            </p>
          </div>
        </header>
        {!hasChannelSetup ? (
          <p className="banner banner-warn">
            {t("verify.notReady")}
          </p>
        ) : null}
        <ol className="setup-flow">
          <SetupStep
            n="01"
            title={t("verify.step1Title")}
            body={t("verify.step1Body")}
            to="/channels"
            linkLabel={t("verify.openHome")}
            done={hasChannelSetup}
            status={hasChannelSetup ? t("verify.done") : t("verify.pending")}
            icon={<IconChannel />}
          />
          <SetupStep
            n="02"
            title={t("verify.step2Title")}
            body={t("verify.step2Body")}
            to="/settings"
            linkLabel={t("verify.openSettings")}
            done={hasWebhookSetup}
            status={hasWebhookSetup ? t("verify.done") : t("verify.recommended")}
            icon={<IconWebhook />}
          />
          <SetupStep
            n="03"
            title={t("verify.step3Title")}
            body={t("verify.step3Body")}
            to="/developers"
            linkLabel={t("verify.openDevelopers")}
            done={false}
            status="Required"
            icon={<IconKey />}
          />
          <SetupStep
            n="04"
            title={t("overview.issueCode")}
            body={t("verify.step4Body")}
            to="#issue"
            linkLabel={t("verify.goIssue")}
            done={hasChannelSetup}
            status={hasChannelSetup ? t("overview.ready") : t("ui.waiting")}
            icon={<IconScan />}
          />
        </ol>
      </article>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>{t("verify.howTitle")}</h2>
            <p className="hint">
              {t("verify.howHint")}
            </p>
          </div>
        </header>
        <p className="hint">
          {t("verify.howBody")}
        </p>
      </article>

      <form id="issue" className="panel" onSubmit={(event) => void onCreate(event)}>
        <header className="panel-head">
          <div>
            <h2>{t("verify.issueTitle")}</h2>
            <p className="hint">
              {t("verify.issueHint")}
            </p>
          </div>
        </header>
        <div className="row">
          <label>
            {t("common.channel")}
            <select
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as "whatsapp" | "telegram")
              }
            >
              <option value="whatsapp" disabled={!whatsappReady}>
                {t("common.whatsapp")}
              </option>
              <option value="telegram" disabled={!telegramReady}>
                {t("common.telegram")}
              </option>
            </select>
          </label>
          <label>
            {t("purposes.field")}
            <select
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
            >
              {purposes.length === 0 ? (
                <option value="authentication">authentication</option>
              ) : (
                purposes.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.title}
                  </option>
                ))
              )}
            </select>
            <span className="hint">
              {t("lit.developers.5")}{" "}
              <Link to="/purposes">{t("nav.purposes")}</Link>.
            </span>
          </label>
        </div>
        <WhatsAppNumberField
          label={t("verify.contact")}
          value={contact}
          preferredCountry={me?.tenant.country}
          required
          onChange={setContact}
          hint={
            channel === "telegram"
              ? t("verify.contactHintTelegram")
              : t("verify.contactHintWhatsapp")
          }
        />
        {channel === "whatsapp" ? (
          <label>
            {t("verify.customMessage")}
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={t("verify.customPlaceholder")}
              maxLength={500}
            />
            <span className="hint">
              {t("verify.customHint")}
            </span>
          </label>
        ) : null}
        {!channelReady ? (
          <p className="banner banner-warn">
            {channel === "whatsapp"
              ? t("verify.whatsappBlocked")
              : t("verify.telegramBlocked")}
          </p>
        ) : null}
        {error ? (
          <p className="banner banner-danger" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="primary"
          disabled={busy || !channelReady || !contact}
        >
          {busy ? "Creating…" : t("verify.createCode")}
        </button>
      </form>

      {active ? (
        <article className="panel challenge">
          <div className="qr" dangerouslySetInnerHTML={{ __html: active.qrSvg }} />
          <div>
            <div className={status === "verified" ? "live is-ok" : "live"}>
              <span className="live-dot" aria-hidden="true" />
              <strong>{liveLabel(status, subject, t)}</strong>
            </div>
            <p className="hint">
              {t("lit.verify.66")}
            </p>
            <a className="primary compact" href={active.deepLink} target="_blank" rel="noreferrer">
              {t("lit.developers.20")}{' '}{active.channel === "telegram" ? t("common.telegram") : "WhatsApp"}
            </a>
            <dl className="meta">
              {contact ? (
                <>
                  <dt>{t("verify.customer")}</dt>
                  <dd>
                    <code>{contact}</code>
                  </dd>
                </>
              ) : null}
              <dt>{t("verify.code")}</dt>
              <dd>
                <code>{active.token}</code>
              </dd>
              <dt>{t("verify.send")}</dt>
              <dd>
                <code>{active.messageToSend}</code>{" "}
                <CopyButton value={active.messageToSend} label={t("verify.copyMessage")} />
              </dd>
              <dt>{t("verify.expires")}</dt>
              <dd>{formatWhen(active.expiresAt)}</dd>
              {active.purpose ? (
                <>
                  <dt>{t("purposes.field")}</dt>
                  <dd>
                    <code>{active.purpose}</code>
                  </dd>
                </>
              ) : null}
            </dl>
            <button type="button" className="ghost compact" onClick={() => setActive(null)}>
              {t("verify.another")}
            </button>
          </div>
        </article>
      ) : null}

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>{t("verify.completedTitle")}</h2>
            <p className="hint">
              {t("verify.completedHint")}
            </p>
          </div>
        </header>
        {completed.length === 0 ? (
          <EmptyState
            title={t("verify.completedEmptyTitle")}
            body={t("verify.completedEmptyBody")}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("ui.verified")}</th>
                  <th>{t("common.channel")}</th>
                  <th>{t("purposes.field")}</th>
                  <th>{t("overview.colProved")}</th>
                  <th>{t("verify.customer")}</th>
                  <th>{t("overview.colIdentity")}</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((item) => (
                  <tr key={item.publicId}>
                    <td>{formatWhen(item.verifiedAt ?? item.createdAt)}</td>
                    <td>
                      <ChannelBadge channel={item.channel} />
                    </td>
                    <td>
                      <code>{item.purpose ?? "—"}</code>
                    </td>
                    <td>
                      <ProofPill subject={item.verifiedSubject} />
                    </td>
                    <td>
                      <code>{item.clientRef ?? "—"}</code>
                    </td>
                    <td>
                      <code>
                        {item.identity?.phoneNumber ?? item.identity?.ref ?? "—"}
                      </code>
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
            <h2>{t("verify.allTitle")}</h2>
            <p className="hint">{t("verify.allHint")}</p>
          </div>
        </header>
        {items.length === 0 ? (
          <EmptyState title={t("overview.noSessionsTitle")} body={t("verify.allEmptyBody")} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("verify.colCreated")}</th>
                  <th>{t("common.channel")}</th>
                  <th>{t("nav.status")}</th>
                  <th>{t("purposes.field")}</th>
                  <th>{t("overview.colProved")}</th>
                  <th>{t("verify.customer")}</th>
                  <th>{t("overview.colIdentity")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.publicId}>
                    <td>{formatWhen(item.createdAt)}</td>
                    <td>
                      <ChannelBadge channel={item.channel} />
                    </td>
                    <td>
                      <StatusPill status={item.status} />
                    </td>
                    <td>
                      <code>{item.purpose ?? "—"}</code>
                    </td>
                    <td>
                      <ProofPill subject={item.verifiedSubject} />
                    </td>
                    <td>
                      <code>{item.clientRef ?? "—"}</code>
                    </td>
                    <td>
                      <code>
                        {item.identity?.phoneNumber ?? item.identity?.ref ?? "—"}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}

function SetupStep({
  n,
  title,
  body,
  to,
  linkLabel,
  done,
  status,
  icon,
}: {
  n: string;
  title: string;
  body: string;
  to: string;
  linkLabel: string;
  done: boolean;
  status: string;
  icon: ReactNode;
}) {
  const statusTone = done
    ? "tone-text-ok"
    : status === "Required"
      ? "tone-text-neutral"
      : "tone-text-warn";
  return (
    <li className={`setup-flow-step${done ? " is-done" : ""}`}>
      <div className="setup-flow-rail">
        <span className="setup-flow-mark">{icon}</span>
        <span className="setup-flow-line" aria-hidden="true" />
      </div>
      <p className="setup-flow-kicker">
        <span>{n}</span>
        <span className={`setup-flow-status ${statusTone}`}>{status}</span>
      </p>
      <strong>{title}</strong>
      <p>{body}</p>
      <Link to={to}>{linkLabel}</Link>
    </li>
  );
}

function IconChannel() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M3 3.5h10v7H7.5L4 13v-2.5H3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWebhook() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.5 8h7M7.5 5.5 11 8l-3.5 2.5M12 4.5h2v7h-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconKey() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="6" cy="8" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8.2 8H14v2.2M11.2 8v2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconScan() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.5 5.5V3.5h2M13.5 5.5V3.5h-2M2.5 10.5v2h2M13.5 10.5v2h-2M3 8h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function liveLabel(status: string, subject: string | null, t: Translate): string {
  if (status === "verified") {
    return subject === "phone_number"
      ? t("verify.livePhone")
      : t("verify.liveIdentity");
  }
  if (status === "expired") {
    return "Expired";
  }
  if (status === "error") {
    return t("verify.liveError");
  }
  return t("verify.liveWaiting");
}
