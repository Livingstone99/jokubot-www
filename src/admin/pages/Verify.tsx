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

export function VerifyPage() {
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
      setError(err instanceof Error ? err.message : "Could not load sessions.");
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
      setError("Select a country and enter the customer number.");
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
      setError(err instanceof Error ? err.message : "Could not create session.");
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
          <p className="eyebrow">Verify</p>
          <h1>Verification workspace</h1>
          <p className="lede">
            This page lets your team issue one-time codes manually and track the
            verifications completed for this business.
          </p>
        </div>
      </header>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>Setup checklist</h2>
            <p className="hint">
              Complete these steps once. After setup, operators can verify users from
              this page.
            </p>
          </div>
        </header>
        {!hasChannelSetup ? (
          <p className="banner banner-warn">
            Verification is not ready yet. Connect WhatsApp or Telegram first.
          </p>
        ) : null}
        <ol className="setup-flow">
          <SetupStep
            n="01"
            title="Connect a channel"
            body="Link WhatsApp or Telegram on Home so inbound codes can arrive."
            to="/overview"
            linkLabel="Open Home"
            done={hasChannelSetup}
            status={hasChannelSetup ? "Done" : "Pending"}
            icon={<IconChannel />}
          />
          <SetupStep
            n="02"
            title="Add a webhook"
            body="Settings receives signed verification events on your backend."
            to="/settings"
            linkLabel="Open Settings"
            done={hasWebhookSetup}
            status={hasWebhookSetup ? "Done" : "Recommended"}
            icon={<IconWebhook />}
          />
          <SetupStep
            n="03"
            title="Keep secrets server-side"
            body="API and mint keys stay on your backend, not in browser or app code."
            to="/developers"
            linkLabel="Open Developers"
            done={false}
            status="Required"
            icon={<IconKey />}
          />
          <SetupStep
            n="04"
            title="Issue a code"
            body="Create one here, or mint from your backend. The user sends it inbound."
            to="#issue"
            linkLabel="Go to issue form"
            done={hasChannelSetup}
            status={hasChannelSetup ? "Ready" : "Waiting"}
            icon={<IconScan />}
          />
        </ol>
      </article>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>How this works</h2>
            <p className="hint">
              Customers must send a code from WhatsApp or Telegram. A completed
              verification proves either a phone number (when disclosed) or a
              messaging identity.
            </p>
          </div>
        </header>
        <p className="hint">
          You can create codes in two ways: (1) manually from this page, or (2)
          from your backend with the mint secret. Both appear in this history
          once the inbound message is claimed.
        </p>
      </article>

      <form id="issue" className="panel" onSubmit={(event) => void onCreate(event)}>
        <header className="panel-head">
          <div>
            <h2>Issue a code manually</h2>
            <p className="hint">
              Use this when an operator needs to verify one customer now.
            </p>
          </div>
        </header>
        <div className="row">
          <label>
            Channel
            <select
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as "whatsapp" | "telegram")
              }
            >
              <option value="whatsapp" disabled={!whatsappReady}>
                WhatsApp
              </option>
              <option value="telegram" disabled={!telegramReady}>
                Telegram
              </option>
            </select>
          </label>
          <label>
            Purpose
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
              Sealed in the code. Status checks use this slug. Manage on{" "}
              <Link to="/purposes">Purposes</Link>.
            </span>
          </label>
        </div>
        <WhatsAppNumberField
          label="Customer contact"
          value={contact}
          preferredCountry={me?.tenant.country}
          required
          onChange={setContact}
          hint={
            channel === "telegram"
              ? "Country and number for the Telegram account that will send the code."
              : "Country and number for the WhatsApp account that will send the code."
          }
        />
        {channel === "whatsapp" ? (
          <label>
            Custom message
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Hi, send this code to verify your WhatsApp number:"
              maxLength={500}
            />
            <span className="hint">
              Optional. WhatsApp deep links prefill this text plus the code.
            </span>
          </label>
        ) : null}
        {!channelReady ? (
          <p className="banner banner-warn">
            {channel === "whatsapp"
              ? "Link WhatsApp from Home before issuing a code. Scan the QR or enter the pairing code on your phone."
              : "Connect Telegram from Home with a BotFather token before issuing a code."}
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
          {busy ? "Creating…" : "Create code"}
        </button>
      </form>

      {active ? (
        <article className="panel challenge">
          <div className="qr" dangerouslySetInnerHTML={{ __html: active.qrSvg }} />
          <div>
            <div className={status === "verified" ? "live is-ok" : "live"}>
              <span className="live-dot" aria-hidden="true" />
              <strong>{liveLabel(status, subject)}</strong>
            </div>
            <p className="hint">
              Scan the QR or open the deep link. Only the customer number above
              can complete this code. A used code is no longer valid.
            </p>
            <a className="primary compact" href={active.deepLink} target="_blank" rel="noreferrer">
              Open {active.channel === "telegram" ? "Telegram" : "WhatsApp"}
            </a>
            <dl className="meta">
              {contact ? (
                <>
                  <dt>Customer</dt>
                  <dd>
                    <code>{contact}</code>
                  </dd>
                </>
              ) : null}
              <dt>Code</dt>
              <dd>
                <code>{active.token}</code>
              </dd>
              <dt>Send</dt>
              <dd>
                <code>{active.messageToSend}</code>{" "}
                <CopyButton value={active.messageToSend} label="Copy message" />
              </dd>
              <dt>Expires</dt>
              <dd>{formatWhen(active.expiresAt)}</dd>
              {active.purpose ? (
                <>
                  <dt>Purpose</dt>
                  <dd>
                    <code>{active.purpose}</code>
                  </dd>
                </>
              ) : null}
            </dl>
            <button type="button" className="ghost compact" onClick={() => setActive(null)}>
              Create another code
            </button>
          </div>
        </article>
      ) : null}

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>Completed verifications</h2>
            <p className="hint">
              Successful checks for this business across manual and backend-created
              codes.
            </p>
          </div>
        </header>
        {completed.length === 0 ? (
          <EmptyState
            title="No completed verifications yet"
            body="Create a code above, then have the customer send it from WhatsApp or Telegram."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Verified</th>
                  <th>Channel</th>
                  <th>Purpose</th>
                  <th>Proved</th>
                  <th>Customer</th>
                  <th>Identity</th>
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
            <h2>All sessions</h2>
            <p className="hint">Newest first, including waiting and expired codes.</p>
          </div>
        </header>
        {items.length === 0 ? (
          <EmptyState title="No sessions yet" body="Create a code to start verification." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Purpose</th>
                  <th>Proved</th>
                  <th>Customer</th>
                  <th>Identity</th>
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

function liveLabel(status: string, subject: string | null): string {
  if (status === "verified") {
    return subject === "phone_number"
      ? "Verified phone number"
      : "Verified messaging identity";
  }
  if (status === "expired") {
    return "Expired";
  }
  if (status === "error") {
    return "Realtime connection lost";
  }
  return "Waiting for inbound code";
}
