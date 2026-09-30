import { Link } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";

import { AgentAssistLaunch } from "../AgentAssist.js";
import { api, type Overview } from "../api.js";
import { useAuth } from "../auth.js";
import {
  ChannelLinkControls,
  describeChannel,
} from "../ChannelLink.js";
import { useT } from "../locale.js";
import { ChannelConnectCard, ChannelReadyHint } from "../ChannelConnect.js";
import {
  ChannelBadge,
  ConnectedMark,
  EmptyState,
  OutcomePill,
  ProofPill,
  StatusPill,
  formatWhen,
  hasChannelSetup,
  outcomeLabel,
  proofLabel,
} from "../ui.js";

export function OverviewPage() {
  const { me } = useAuth();
  const t = useT();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .overview()
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load overview.");
      });
  }, []);

  const tenant = me?.tenant;
  const whatsapp = describeChannel(t, "whatsapp", tenant);
  const telegram = describeChannel(t, "telegram", tenant);
  const channelsReady = hasChannelSetup(tenant);
  const gaps = setupGaps(data);
  const proof = data?.proofLast24h ?? { phoneNumber: 0, messagingIdentity: 0 };
  const proofTotal = proof.phoneNumber + proof.messagingIdentity;
  const phoneShare = proofTotal ? Math.round((proof.phoneNumber / proofTotal) * 100) : 0;
  const identityShare = proofTotal ? 100 - phoneShare : 0;
  const exceptions = (data?.inboundOutcomesLast24h ?? []).filter(
    (row) =>
      row.outcome !== "verified" &&
      row.outcome !== "triggered" &&
      row.outcome !== "processing",
  );
  const exceptionCount = exceptions.reduce((sum, row) => sum + row.total, 0);

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>{tenant?.name ?? "Your workspace"}</h1>
          <p className="lede">
            {channelsReady
              ? "Customers send a one-time code from WhatsApp or Telegram. You do not reply to complete the check."
              : "Connect WhatsApp or Telegram. One channel is enough to issue codes."}
          </p>
          <ChannelReadyHint />
        </div>
        <div className="page-actions">
          <Link className="secondary" to="/triggers?new=1">
            Create trigger
          </Link>
          <Link className="primary" to="/reactions?new=1">
            Create reaction
          </Link>
        </div>
      </header>

      {error ? (
        <p className="banner banner-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="connect-slot">
        <ChannelConnectCard />
      </div>

      {gaps.length > 0 ? (
        <div className="banner banner-warn">
          <div>
            <strong>Inbound messages are paused</strong>
            <p>
              {gaps.join(" · ")}. New codes will not complete until the gateway
              is receiving WhatsApp and Telegram messages again.
            </p>
          </div>
        </div>
      ) : null}

      {data?.credits?.hasPlan && data.credits.exhausted ? (
        <div className="banner banner-warn">
          <div>
            <strong>{t("overview.creditsPausedTitle")}</strong>
            <p>{t("overview.creditsPausedBody")}</p>
          </div>
          <Link className="secondary" to="/usage">
            {t("overview.creditsView")}
          </Link>
        </div>
      ) : null}

      <div className="stat-grid">
          <Stat
            label="Verified"
            hint="Last 24 hours"
            value={data?.verifiedLast24h}
            detail={
              data
                ? `${data.issuedLast24h} issued in the same window`
                : "Sessions that completed"
            }
          />
        <Stat
          label="Waiting"
          hint="Live now"
          value={data?.pending}
          detail="Codes still unused"
        />
        <Stat
          label="Expired"
          hint="All time"
          value={data?.expired}
          detail="Issued but never completed"
        />
        <Stat
          label="Inbound"
          hint="Last 24 hours"
          value={data?.inboundLast24h}
          detail={
            exceptionCount
              ? `${exceptionCount} did not verify`
              : "Messages the gateway forwarded"
          }
        />
        {data?.credits?.hasPlan ? (
          <Stat
            label={t("overview.statCredits")}
            hint={t("overview.statThisMonth")}
            value={data.credits.remaining}
            detail={
              data.credits.exhausted
                ? t("overview.creditsExhaustedDetail")
                : t("overview.creditsDetail", {
                    remaining: data.credits.remaining.toLocaleString(),
                    included: data.credits.included.toLocaleString(),
                  })
            }
          />
        ) : null}
      </div>

      <AgentAssistLaunch />

      <div className="split">
        <article className="panel">
          <header className="panel-head">
            <div>
              <h2>Pipeline</h2>
              <p className="hint">Your channels and inbound message health.</p>
            </div>
          </header>
          <ul className="health-list">
            <HealthRow
              name="WhatsApp"
              detail={whatsapp.detail}
              tone={whatsapp.tone}
              status={whatsapp.label}
              counts={data?.byChannel.whatsapp}
              actions={tenant ? <ChannelLinkControls channel="whatsapp" /> : null}
            />
            <HealthRow
              name="Telegram"
              detail={telegram.detail}
              tone={telegram.tone}
              status={telegram.label}
              counts={data?.byChannel.telegram}
              actions={tenant ? <ChannelLinkControls channel="telegram" /> : null}
            />
            <HealthRow
              name="Inbound gateway"
              detail="Optional WhatsApp path through the inbound gateway"
              tone={
                !data
                  ? "neutral"
                  : data.gateway.ready
                    ? "ok"
                    : data.gateway.live
                      ? "warn"
                      : "neutral"
              }
              status={gatewayLabel(data)}
            />
            <HealthRow
              name="Completion webhook"
              detail={tenant?.webhookUrl ?? "Your backend will not be notified"}
              tone={tenant?.webhookUrl ? "ok" : "neutral"}
              status={tenant?.webhookUrl ? "Configured" : "Optional"}
            />
          </ul>
          {data && !data.gateway.reachable ? (
            <p className="hint health-note">
              The inbound gateway is offline. Phone-linked WhatsApp and
              connected Telegram still receive messages here.
            </p>
          ) : null}
        </article>

        <article className="panel">
          <header className="panel-head">
            <div>
              <h2>What was proved</h2>
              <p className="hint">Verified sessions in the last 24 hours.</p>
            </div>
          </header>

          {proofTotal === 0 ? (
            <EmptyState
              title="No completed proofs yet"
              body="When a user sends the one-time code, we record whether the channel disclosed a phone number or only a messaging identity."
            />
          ) : (
            <div>
              <div className="proof-bar" role="img" aria-label="Proof mix">
                {proof.phoneNumber > 0 ? (
                  <span className="proof-phone" style={{ flexGrow: proof.phoneNumber }} />
                ) : null}
                {proof.messagingIdentity > 0 ? (
                  <span className="proof-identity" style={{ flexGrow: proof.messagingIdentity }} />
                ) : null}
              </div>
              <div className="proof-legend">
                <div>
                  <span className="swatch swatch-phone" />
                  <div>
                    <strong>{phoneShare}%</strong>
                    <span>{proofLabel("phone_number")}</span>
                    <em>{proof.phoneNumber} sessions</em>
                  </div>
                </div>
                <div>
                  <span className="swatch swatch-identity" />
                  <div>
                    <strong>{identityShare}%</strong>
                    <span>{proofLabel("messaging_identity")}</span>
                    <em>{proof.messagingIdentity} sessions</em>
                  </div>
                </div>
              </div>
              {proof.messagingIdentity > 0 ? (
                <p className="callout">
                  Messaging identity confirms control of the account. It is not a
                  phone number. If you sell phone verification, do not treat
                  these as equivalent.
                </p>
              ) : (
                <p className="hint">
                  All completed proofs in this window disclosed a phone number.
                </p>
              )}
            </div>
          )}
        </article>
      </div>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>Recent verifications</h2>
            <p className="hint">Latest sessions issued from this workspace.</p>
          </div>
          <StartVerificationCta className="text-link" ready={channelsReady} as="text">
            Issue a code
          </StartVerificationCta>
        </header>
        {!data ? (
          <div className="skeleton-table" aria-hidden="true" />
        ) : data.recentSessions.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            body={
              channelsReady
                ? "Generate a one-time code, then have the customer send it from WhatsApp or Telegram. This page updates the moment it arrives."
                : "Connect a channel above, then generate a one-time code for your customer to send."
            }
            action={
              <StartVerificationCta className="primary compact" ready={channelsReady}>
                Start a verification
              </StartVerificationCta>
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Proved</th>
                  <th>Identity</th>
                  <th>Client ref</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSessions.map((item) => (
                  <tr key={item.publicId}>
                    <td>{formatWhen(item.createdAt)}</td>
                    <td>
                      <ChannelBadge channel={item.channel} />
                    </td>
                    <td>
                      <StatusPill status={item.status} />
                    </td>
                    <td>
                      <ProofPill subject={item.verifiedSubject} />
                    </td>
                    <td>
                      <code>
                        {item.identity?.phoneNumber ?? item.identity?.ref ?? "—"}
                      </code>
                    </td>
                    <td>{item.clientRef ?? "—"}</td>
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
            <h2>Inbound exceptions</h2>
            <p className="hint">
              Messages the gateway forwarded that did not complete a session.
            </p>
          </div>
          <Link className="text-link" to="/activity">
            Full log
          </Link>
        </header>
        {!data ? (
          <div className="skeleton-table" aria-hidden="true" />
        ) : exceptionCount === 0 ? (
          <EmptyState
            title="No failed inbound in the last 24 hours"
            body="Unknown tokens, expired codes, and channel mismatches will show up here."
          />
        ) : (
          <div>
            <div className="proof-legend exception-summary">
              {exceptions.map((row) => (
                <div key={row.outcome}>
                  <span className="swatch swatch-danger" />
                  <div>
                    <strong>{row.total}</strong>
                    <span>{outcomeLabel(row.outcome)}</span>
                  </div>
                </div>
              ))}
            </div>
            {data.recentInbound.some((item) => item.outcome !== "verified") ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Received</th>
                      <th>Channel</th>
                      <th>Sender</th>
                      <th>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentInbound
                      .filter((item) => item.outcome !== "verified")
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{formatWhen(item.receivedAt)}</td>
                          <td>
                            <ChannelBadge channel={item.channel} />
                          </td>
                          <td>
                            <code>{item.senderRef}</code>
                          </td>
                          <td>
                            <OutcomePill outcome={item.outcome} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="hint">See the full log for older exceptions in this window.</p>
            )}
          </div>
        )}
      </article>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  detail,
}: {
  label: string;
  value?: number;
  hint: string;
  detail: string;
}) {
  return (
    <div className="stat">
      <span className="stat-kicker">{hint}</span>
      <strong>{value ?? "—"}</strong>
      <span className="stat-label">{label}</span>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}

function HealthRow({
  name,
  detail,
  status,
  tone,
  counts,
  actions,
}: {
  name: string;
  detail: string;
  status: string;
  tone: "ok" | "warn" | "danger" | "neutral";
  counts?: { pending: number; verified: number; expired: number };
  actions?: ReactNode;
}) {
  return (
    <li className="health-row">
      <span className={`tone tone-${tone}`} aria-hidden="true" />
      <div className="health-copy">
        <strong>{name}</strong>
        <span>{detail}</span>
        {actions}
      </div>
      <span className="health-counts">
        {counts ? `${counts.verified} verified · ${counts.pending} waiting` : ""}
      </span>
      <span className={`health-status tone-text-${tone}`}>
        {tone === "ok" ? <ConnectedMark /> : null}
        <span>{status}</span>
      </span>
    </li>
  );
}

function gatewayLabel(data: Overview | null): string {
  if (!data) {
    return "Checking";
  }
  if (data.gateway.ready) {
    return "Ready";
  }
  if (data.gateway.live) {
    return "Live, not ready";
  }
  return "Offline";
}

function StartVerificationCta({
  className,
  children,
  ready,
  as = "button",
}: {
  className: string;
  children: string;
  ready: boolean;
  as?: "button" | "text";
}) {
  if (ready) {
    return (
      <Link className={className} to="/verify">
        {children}
      </Link>
    );
  }
  const hint = "Connect WhatsApp or Telegram first";
  if (as === "text") {
    return (
      <span className={`${className} is-disabled`} title={hint} aria-disabled="true">
        {children}
      </span>
    );
  }
  return (
    <button type="button" className={className} disabled title={hint}>
      {children}
    </button>
  );
}

function setupGaps(_data: Overview | null): string[] {
  return [];
}
