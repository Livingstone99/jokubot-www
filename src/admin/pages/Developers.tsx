import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, type CreatedVerification, type Verification, type VerificationPurpose } from "../api.js";
import { appHref } from "../../config.js";
import { useAuth } from "../auth.js";
import { verificationIntegrationMarkdown } from "../docs/verification.js";
import { useT } from "../locale.js";
import { WhatsAppNumberField } from "../WhatsAppNumberField.js";
import {
  CopyButton,
  ProofPill,
  formatWhen,
} from "../ui.js";

type SimStatus = "waiting" | "verified" | "expired" | "error";

export function DevelopersPage() {
  const { me } = useAuth();
  const t = useT();
  const [apiKey, setApiKey] = useState(sessionStorage.getItem("mvs.apiKey"));
  const [ingestSecret, setIngestSecret] = useState(
    sessionStorage.getItem("mvs.ingestSecret"),
  );
  const [mintSecret, setMintSecret] = useState(
    sessionStorage.getItem("mvs.mintSecret"),
  );
  const [error, setError] = useState<string | null>(null);
  const whatsappReady = Boolean(me?.tenant.whatsappLinked);
  const telegramReady = Boolean(me?.tenant.telegramLinked);
  const [simChannel, setSimChannel] = useState<"whatsapp" | "telegram">(
    whatsappReady || !telegramReady ? "whatsapp" : "telegram",
  );
  const [simBusy, setSimBusy] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simSender, setSimSender] = useState("");
  const [simPurpose, setSimPurpose] = useState("authentication");
  const [purposes, setPurposes] = useState<VerificationPurpose[]>([]);
  const [active, setActive] = useState<CreatedVerification | null>(null);
  const [status, setStatus] = useState<SimStatus>("waiting");
  const [result, setResult] = useState<Verification | null>(null);

  useEffect(() => {
    void api
      .purposes()
      .then((result) => {
        setPurposes(result.items);
        if (
          result.items.length > 0 &&
          !result.items.some((item) => item.slug === "authentication")
        ) {
          setSimPurpose(result.items[0]?.slug ?? "authentication");
        }
      })
      .catch(() => {
        setPurposes([]);
      });
  }, []);

  useEffect(() => {
    if (simChannel === "whatsapp" && !whatsappReady && telegramReady) {
      setSimChannel("telegram");
    } else if (simChannel === "telegram" && !telegramReady && whatsappReady) {
      setSimChannel("whatsapp");
    }
  }, [simChannel, whatsappReady, telegramReady]);

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
        void loadResult(active.publicId);
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

  useEffect(() => {
    if (!active || status !== "waiting") {
      return;
    }
    const delay = new Date(active.expiresAt).getTime() - Date.now();
    if (delay <= 0) {
      setStatus("expired");
      return;
    }
    const timer = window.setTimeout(() => setStatus("expired"), delay);
    return () => window.clearTimeout(timer);
  }, [active, status]);

  async function loadResult(publicId: string) {
    try {
      const listed = await api.verifications();
      setResult(listed.items.find((item) => item.publicId === publicId) ?? null);
    } catch {
      setResult(null);
    }
  }

  async function rotateApi() {
    setError(null);
    try {
      const result = await api.rotateApiKey();
      setApiKey(result.apiKey);
      sessionStorage.setItem("mvs.apiKey", result.apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rotate API key.");
    }
  }

  async function rotateIngest() {
    setError(null);
    try {
      const result = await api.rotateIngest();
      setIngestSecret(result.ingestSecret);
      sessionStorage.setItem("mvs.ingestSecret", result.ingestSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rotate ingest secret.");
    }
  }

  async function rotateMint() {
    setError(null);
    try {
      const result = await api.rotateMint();
      setMintSecret(result.mintSecret);
      sessionStorage.setItem("mvs.mintSecret", result.mintSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rotate mint secret.");
    }
  }

  async function onSimulate(event: FormEvent) {
    event.preventDefault();
    if (simChannel === "whatsapp" && !simSender) {
      setSimError("Enter the WhatsApp number that will send the code.");
      return;
    }
    setSimBusy(true);
    setSimError(null);
    setResult(null);
    try {
      const created = await api.simulateVerification(
        simChannel,
        simChannel === "whatsapp" ? simSender : undefined,
        simPurpose,
      );
      setActive(created);
      setStatus("waiting");
    } catch (err) {
      setSimError(
        err instanceof Error ? err.message : "Could not generate the code.",
      );
    } finally {
      setSimBusy(false);
    }
  }

  const ingestUrl = `${import.meta.env.DEV ? "http://127.0.0.1:8080" : window.location.origin}/v1/ingest/messages`;
  const ingestEnv = `INGEST_URL=${ingestUrl}
TENANT_ID=${me?.tenant.id ?? ""}
INGEST_SECRET=${ingestSecret ?? "<rotate to reveal>"}`;
  const channelReady = simChannel === "whatsapp" ? whatsappReady : telegramReady;
  const hasChannelSetup = whatsappReady || telegramReady;
  const boundWhatsApp = me?.tenant.whatsappNumber ?? null;
  const boundTelegram = me?.tenant.telegramBotUsername
    ? `@${me.tenant.telegramBotUsername}`
    : null;
  const sendTo =
    active?.channel === "telegram" ? boundTelegram : boundWhatsApp;

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Developers</p>
          <h1>Keys and inbound ingest</h1>
          <p className="lede">
            Keep the API key and mint secret on your server. The ingest secret
            stays on the machine that receives WhatsApp and Telegram messages.
          </p>
        </div>
        <div className="page-actions">
          <CopyButton
            value={verificationIntegrationMarkdown({ tenantId: me?.tenant.id })}
            label={t("docs.copyAgent")}
            title={t("docs.copyAgentHint")}
          />
          <a className="ghost" href={appHref("/docs")}>
            {t("docs.title")}
          </a>
        </div>
      </header>

      <form className="panel" onSubmit={(event) => void onSimulate(event)}>
        <header className="panel-head">
          <div>
            <h2>Simulate verification</h2>
            <p className="hint">
              Generate an encrypted code bound to the sender’s WhatsApp number,
              then send it to the inbox bound on this workspace. Another number
              cannot claim it. A used code is no longer valid.
            </p>
          </div>
        </header>
        {!hasChannelSetup ? (
          <p className="banner banner-warn">
            Connect WhatsApp or Telegram on <Link to="/overview">Home</Link>{" "}
            before simulating. The code has to land on the linked inbox.
          </p>
        ) : null}
        <div className="row">
          <label>
            Channel
            <select
              value={simChannel}
              onChange={(event) =>
                setSimChannel(event.target.value as "whatsapp" | "telegram")
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
              value={simPurpose}
              onChange={(event) => setSimPurpose(event.target.value)}
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
        {simChannel === "whatsapp" ? (
          <WhatsAppNumberField
            label="Sender number"
            value={simSender}
            preferredCountry={me?.tenant.country}
            required
            onChange={setSimSender}
            hint="Only this WhatsApp number can complete the code."
          />
        ) : null}
        {simChannel === "whatsapp" && whatsappReady && boundWhatsApp ? (
          <p className="hint">
            Send the encrypted code to <code>{boundWhatsApp}</code>, from the
            sender number above.
          </p>
        ) : null}
        {simChannel === "telegram" && telegramReady && boundTelegram ? (
          <p className="hint">
            Send the encrypted code to <code>{boundTelegram}</code>, the
            Telegram bot bound on this workspace.
          </p>
        ) : null}
        {!channelReady && hasChannelSetup ? (
          <p className="banner banner-warn">
            {simChannel === "whatsapp"
              ? "Link WhatsApp on Home before generating a WhatsApp code."
              : "Connect Telegram on Home before generating a Telegram code."}
          </p>
        ) : null}
        {simError ? (
          <p className="banner banner-danger" role="alert">
            {simError}
          </p>
        ) : null}
        <div className="panel-actions">
          <button
            type="submit"
            className="primary"
            disabled={
              simBusy ||
              !channelReady ||
              (simChannel === "whatsapp" && !simSender)
            }
          >
            {simBusy ? "Generating…" : "Generate encrypted code"}
          </button>
        </div>
      </form>

      {active ? (
        <article className="panel challenge">
          {active.qrSvg ? (
            <div
              className="qr"
              dangerouslySetInnerHTML={{ __html: active.qrSvg }}
            />
          ) : null}
          <div>
            <div
              className={
                status === "verified"
                  ? "live is-ok"
                  : status === "expired" || status === "error"
                    ? "live is-bad"
                    : "live"
              }
            >
              <span className="live-dot" aria-hidden="true" />
              <strong>{liveSimulationLabel(status, result)}</strong>
            </div>
            <p className="hint">
              {active.channel === "telegram" ? (
                sendTo ? (
                  <>
                    Send this encrypted code as a Telegram message to{" "}
                    <code>{sendTo}</code>. That is the bot bound on this
                    workspace.
                  </>
                ) : (
                  <>
                    Send this encrypted code as a Telegram message to the bot
                    bound on this workspace.
                  </>
                )
              ) : sendTo ? (
                <>
                  Send this encrypted code as a WhatsApp message to{" "}
                  <code>{sendTo}</code>. That is the number bound on this
                  workspace.
                </>
              ) : (
                <>
                  Send this encrypted code as a WhatsApp message to the number
                  bound on this workspace.
                </>
              )}{" "}
              Status updates when the inbound message is decrypted.
            </p>
            {active.deepLink ? (
              <a
                className="primary compact"
                href={active.deepLink}
                target="_blank"
                rel="noreferrer"
              >
                Open {active.channel === "telegram" ? "Telegram" : "WhatsApp"}
              </a>
            ) : null}
            <dl className="meta">
              {sendTo ? (
                <>
                  <dt>Send to</dt>
                  <dd>
                    <code>{sendTo}</code> <CopyButton value={sendTo} />
                  </dd>
                </>
              ) : null}
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
              {result?.verifiedSubject ? (
                <>
                  <dt>Proved</dt>
                  <dd>
                    <ProofPill subject={result.verifiedSubject} />
                  </dd>
                </>
              ) : null}
              {result?.identity ? (
                <>
                  <dt>Identity</dt>
                  <dd>
                    <code>
                      {result.identity.phoneNumber ?? result.identity.ref}
                    </code>
                  </dd>
                </>
              ) : null}
            </dl>
            <button
              type="button"
              className="ghost compact"
              onClick={() => {
                setActive(null);
                setResult(null);
                setStatus("waiting");
              }}
            >
              Generate another code
            </button>
          </div>
        </article>
      ) : null}

      {error ? (
        <p className="banner banner-danger" role="alert">
          {error}
        </p>
      ) : null}

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>Tenant id</h2>
            <p className="hint">Sent as <code>x-mvs-tenant</code> on ingest.</p>
          </div>
          {me?.tenant.id ? <CopyButton value={me.tenant.id} /> : null}
        </header>
        <p className="secret">
          <code>{me?.tenant.id}</code>
        </p>
      </article>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>API key</h2>
            <p className="hint">
              <code>Authorization: Bearer</code> for session create,{" "}
              <code>GET /v1/verifications/status?phone=&purpose=</code>,{" "}
              <code>GET /v1/whatsapp/verifications?phone=</code>, and code claim.
              Purpose status is scoped to a slug. Phone lookup only finds numbers
              WhatsApp disclosed; identity-only proofs stay on{" "}
              <code>GET /v1/verification-sessions/:publicId</code>. Shown only at
              signup or rotation.
            </p>
          </div>
        </header>
        {apiKey ? (
          <p className="secret">
            <code>{apiKey}</code>
            <CopyButton value={apiKey} />
          </p>
        ) : (
          <p className="hint">Hidden. Rotate to mint a new key — the previous one stops working immediately.</p>
        )}
        <div className="panel-actions">
          <button type="button" className="secondary" onClick={() => void rotateApi()}>
            Rotate API key
          </button>
        </div>
      </article>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>Ingest secret</h2>
            <p className="hint">
              HMAC-SHA256 key for inbound messages. Sign{" "}
              <code>{"{timestamp}.{body}"}</code> and send it as{" "}
              <code>x-mvs-signature</code>.
            </p>
          </div>
        </header>
        {ingestSecret ? (
          <p className="secret">
            <code>{ingestSecret}</code>
            <CopyButton value={ingestSecret} />
          </p>
        ) : (
          <p className="hint">Hidden. Rotate to reveal a new secret.</p>
        )}
        <div className="panel-actions">
          <button type="button" className="secondary" onClick={() => void rotateIngest()}>
            Rotate ingest secret
          </button>
        </div>
      </article>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>Mint secret</h2>
            <p className="hint">
              Your backend uses this to issue codes with{" "}
              <code>@mvs/mint</code>. Customers send that code from WhatsApp or
              Telegram. Shown only at signup or rotation. Previous codes still
              work for 15 minutes after you rotate.
            </p>
          </div>
        </header>
        {mintSecret ? (
          <p className="secret">
            <code>{mintSecret}</code>
            <CopyButton value={mintSecret} />
          </p>
        ) : (
          <p className="hint">Hidden. Rotate to reveal a new secret.</p>
        )}
        <div className="panel-actions">
          <button type="button" className="secondary" onClick={() => void rotateMint()}>
            Rotate mint secret
          </button>
        </div>
      </article>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>Inbound ingest</h2>
            <p className="hint">
              Your gateway <code>POST</code>s to this URL. Include{" "}
              <code>x-mvs-tenant</code>, <code>x-mvs-timestamp</code>, and the
              signature header.
            </p>
          </div>
          <CopyButton value={ingestEnv} label="Copy env" />
        </header>
        <pre>{ingestEnv}</pre>
      </article>
    </section>
  );
}

function liveSimulationLabel(
  status: SimStatus,
  result: Verification | null,
): string {
  if (status === "verified") {
    return result?.verifiedSubject === "phone_number"
      ? "Verified phone number"
      : "Verified messaging identity";
  }
  if (status === "expired") {
    return "Not verified";
  }
  if (status === "error") {
    return "Realtime connection lost";
  }
  return "Waiting for inbound message";
}
