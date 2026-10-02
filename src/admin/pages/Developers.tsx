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

type Translate = ReturnType<typeof useT>;

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
      setError(err instanceof Error ? err.message : t("dev.rotateApiError"));
    }
  }

  async function rotateIngest() {
    setError(null);
    try {
      const result = await api.rotateIngest();
      setIngestSecret(result.ingestSecret);
      sessionStorage.setItem("mvs.ingestSecret", result.ingestSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dev.rotateIngestError"));
    }
  }

  async function rotateMint() {
    setError(null);
    try {
      const result = await api.rotateMint();
      setMintSecret(result.mintSecret);
      sessionStorage.setItem("mvs.mintSecret", result.mintSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dev.rotateMintError"));
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
INGEST_SECRET=${ingestSecret ?? t("dev.rotateReveal")}`;
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
          <p className="eyebrow">{t("nav.developers")}</p>
          <h1>{t("dev.title")}</h1>
          <p className="lede">
            {t("dev.lede")}
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
            <h2>{t("lit.developers.1")}</h2>
            <p className="hint">
              {t("lit.developers.2")}
            </p>
          </div>
        </header>
        {!hasChannelSetup ? (
          <p className="banner banner-warn">
            {t("lit.developers.3")}{' '}<Link to="/channels">{t("nav2.channels")}</Link>{" "}
            {t("lit.developers.4")}
          </p>
        ) : null}
        <div className="row">
          <label>
            {t("common.channel")}
            <select
              value={simChannel}
              onChange={(event) =>
                setSimChannel(event.target.value as "whatsapp" | "telegram")
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
              {t("lit.developers.5")}{" "}
              <Link to="/purposes">{t("nav.purposes")}</Link>.
            </span>
          </label>
        </div>
        {simChannel === "whatsapp" ? (
          <WhatsAppNumberField
            label={t("triggers.senderNumber")}
            value={simSender}
            preferredCountry={me?.tenant.country}
            required
            onChange={setSimSender}
            hint={t("lit.developers.6")}
          />
        ) : null}
        {simChannel === "whatsapp" && whatsappReady && boundWhatsApp ? (
          <p className="hint">
            {t("lit.developers.7")}{' '}<code>{boundWhatsApp}</code>{t("lit.developers.8")}
          </p>
        ) : null}
        {simChannel === "telegram" && telegramReady && boundTelegram ? (
          <p className="hint">
            {t("lit.developers.7")}{' '}<code>{boundTelegram}</code>{t("lit.developers.9")}
          </p>
        ) : null}
        {!channelReady && hasChannelSetup ? (
          <p className="banner banner-warn">
            {simChannel === "whatsapp"
              ? t("lit.developers.10")
              : t("lit.developers.11")}
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
            {simBusy ? "Generating…" : t("lit.developers.12")}
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
              <strong>{liveSimulationLabel(status, result, t)}</strong>
            </div>
            <p className="hint">
              {active.channel === "telegram" ? (
                sendTo ? (
                  <>
                    {t("lit.developers.13")}{" "}
                    <code>{sendTo}</code>{t("lit.developers.14")}
                  </>
                ) : (
                  <>
                    {t("lit.developers.15")}
                  </>
                )
              ) : sendTo ? (
                <>
                  {t("lit.developers.16")}{" "}
                  <code>{sendTo}</code>{t("lit.developers.17")}
                </>
              ) : (
                <>
                  {t("lit.developers.18")}
                </>
              )}{" "}
              {t("lit.developers.19")}
            </p>
            {active.deepLink ? (
              <a
                className="primary compact"
                href={active.deepLink}
                target="_blank"
                rel="noreferrer"
              >
                {t("lit.developers.20")}{' '}{active.channel === "telegram" ? t("common.telegram") : "WhatsApp"}
              </a>
            ) : null}
            <dl className="meta">
              {sendTo ? (
                <>
                  <dt>{t("lit.developers.21")}</dt>
                  <dd>
                    <code>{sendTo}</code> <CopyButton value={sendTo} />
                  </dd>
                </>
              ) : null}
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
              {result?.verifiedSubject ? (
                <>
                  <dt>{t("overview.colProved")}</dt>
                  <dd>
                    <ProofPill subject={result.verifiedSubject} />
                  </dd>
                </>
              ) : null}
              {result?.identity ? (
                <>
                  <dt>{t("overview.colIdentity")}</dt>
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
              {t("lit.developers.22")}
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
            <h2>{t("dev.tenantId")}</h2>
            <p className="hint">{t("lit.developers.23")}{' '}<code>x-mvs-tenant</code>{' '}{t("lit.developers.24")}</p>
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
            <h2>{t("docs.authKey")}</h2>
            <p className="hint">
              <code>Authorization: Bearer</code>{' '}{t("lit.developers.25")}{" "}
              <code>GET /v1/verifications/status?phone=&purpose=</code>,{" "}
              <code>GET /v1/whatsapp/verifications?phone=</code>{t("lit.developers.26")}{" "}
              <code>GET /v1/verification-sessions/:publicId</code>{t("lit.developers.27")}
            </p>
          </div>
        </header>
        {apiKey ? (
          <p className="secret">
            <code>{apiKey}</code>
            <CopyButton value={apiKey} />
          </p>
        ) : (
          <p className="hint">{t("dev.apiHidden")}</p>
        )}
        <div className="panel-actions">
          <button type="button" className="secondary" onClick={() => void rotateApi()}>
            {t("dev.rotateApi")}
          </button>
        </div>
      </article>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>{t("dev.ingest")}</h2>
            <p className="hint">
              {t("lit.developers.28")}{" "}
              <code>{"{timestamp}.{body}"}</code> {t("lit.developers.sendAs")}{" "}
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
          <p className="hint">{t("dev.ingestHidden")}</p>
        )}
        <div className="panel-actions">
          <button type="button" className="secondary" onClick={() => void rotateIngest()}>
            {t("dev.rotateIngest")}
          </button>
        </div>
      </article>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>{t("dev.mint")}</h2>
            <p className="hint">
              {t("lit.developers.29")}{" "}
              <code>@mvs/mint</code>{t("lit.developers.30")}
            </p>
          </div>
        </header>
        {mintSecret ? (
          <p className="secret">
            <code>{mintSecret}</code>
            <CopyButton value={mintSecret} />
          </p>
        ) : (
          <p className="hint">{t("dev.ingestHidden")}</p>
        )}
        <div className="panel-actions">
          <button type="button" className="secondary" onClick={() => void rotateMint()}>
            {t("dev.rotateMint")}
          </button>
        </div>
      </article>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>{t("dev.ingestTitle")}</h2>
            <p className="hint">
              {t("lit.developers.gatewayPost")} <code>POST</code>{" "}
              {t("lit.developers.gatewayInclude")} <code>x-mvs-tenant</code>,{" "}
              <code>x-mvs-timestamp</code> {t("lit.developers.gatewaySignature")}
            </p>
          </div>
          <CopyButton value={ingestEnv} label={t("dev.copyEnv")} />
        </header>
        <pre>{ingestEnv}</pre>
      </article>
    </section>
  );
}

function liveSimulationLabel(
  status: SimStatus,
  result: Verification | null,
  t: Translate,
): string {
  if (status === "verified") {
    return result?.verifiedSubject === "phone_number"
      ? t("verify.livePhone")
      : t("verify.liveIdentity");
  }
  if (status === "expired") {
    return t("lit.developers.notVerified");
  }
  if (status === "error") {
    return t("verify.liveError");
  }
  return t("lit.developers.waitingInbound");
}
