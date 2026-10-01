import { Link } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";

import { JokubotMark } from "../brand/Logo.js";
import { api, type Overview } from "../api.js";
import { useAuth } from "../auth.js";
import {
  ChannelLinkControls,
  describeChannel,
} from "../ChannelLink.js";
import { useT } from "../locale.js";
import {
  IconBolt,
  IconKey,
  IconReply,
  IconScan,
  IconSliders,
  IconTag,
} from "../layout/AppShell.js";
import { ChannelConnectCard } from "../ChannelConnect.js";
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

type Translate = ReturnType<typeof useT>;

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
        setError(err instanceof Error ? err.message : t("overview.loadError"));
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
      <header className="page-head home-head">
        <div>
          <h1>{t("nav.overview")}</h1>
          <p className="lede">{t("home.lede")}</p>
        </div>
        <div className="page-actions">
          <Link className="primary" to="/setup">
            <JokubotMark size={20} />
            {t("assist.open")}
          </Link>
        </div>
      </header>

      <HomeChannels />
      <FirstSteps data={data} />
      <QuickActions channelsReady={channelsReady} />

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
            <strong>{t("overview.pausedTitle")}</strong>
            <p>
              {gaps.join(" · ")}{t("lit.overview.31")}
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

      <div className="split">
        <article className="panel">
          <header className="panel-head">
            <div>
              <h2>{t("overview.pipeline")}</h2>
              <p className="hint">{t("overview.pipelineHint")}</p>
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
              name={t("overview.gatewayName")}
              detail={t("overview.gatewayDetail")}
              tone={
                !data
                  ? "neutral"
                  : data.gateway.ready
                    ? "ok"
                    : data.gateway.live
                      ? "warn"
                      : "neutral"
              }
              status={gatewayLabel(data, t)}
            />
            <HealthRow
              name="Completion webhook"
              detail={tenant?.webhookUrl ?? t("overview.webhookMissing")}
              tone={tenant?.webhookUrl ? "ok" : "neutral"}
              status={tenant?.webhookUrl ? t("overview.configured") : t("overview.optional")}
            />
          </ul>
          {data && !data.gateway.reachable ? (
            <p className="hint health-note">
              {t("overview.gatewayOffline")}
            </p>
          ) : null}
        </article>

        <article className="panel">
          <header className="panel-head">
            <div>
              <h2>{t("overview.proofTitle")}</h2>
              <p className="hint">{t("overview.proofHint")}</p>
            </div>
          </header>

          {proofTotal === 0 ? (
            <EmptyState
              title={t("overview.proofEmptyTitle")}
              body={t("overview.proofEmptyBody")}
            />
          ) : (
            <div>
              <div className="proof-bar" role="img" aria-label={t("overview.proofMix")}>
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
                  {t("overview.proofCallout")}
                </p>
              ) : (
                <p className="hint">
                  {t("overview.proofAllPhone")}
                </p>
              )}
            </div>
          )}
        </article>
      </div>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>{t("overview.recentTitle")}</h2>
            <p className="hint">{t("overview.recentHint")}</p>
          </div>
          <StartVerificationCta className="text-link" ready={channelsReady} as="text">
            {t("overview.issueCode")}
          </StartVerificationCta>
        </header>
        {!data ? (
          <div className="skeleton-table" aria-hidden="true" />
        ) : data.recentSessions.length === 0 ? (
          <EmptyState
            title={t("overview.noSessionsTitle")}
            body={
              channelsReady
                ? t("overview.noSessionsReady")
                : t("overview.noSessionsSetup")
            }
            action={
              <StartVerificationCta className="primary compact" ready={channelsReady}>
                {t("overview.startVerify")}
              </StartVerificationCta>
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("overview.colWhen")}</th>
                  <th>{t("common.channel")}</th>
                  <th>{t("nav.status")}</th>
                  <th>{t("overview.colProved")}</th>
                  <th>{t("overview.colIdentity")}</th>
                  <th>{t("overview.colClientRef")}</th>
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
            <h2>{t("overview.exceptionsTitle")}</h2>
            <p className="hint">
              {t("overview.exceptionsHint")}
            </p>
          </div>
          <Link className="text-link" to="/activity">
            {t("overview.fullLog")}
          </Link>
        </header>
        {!data ? (
          <div className="skeleton-table" aria-hidden="true" />
        ) : exceptionCount === 0 ? (
          <EmptyState
            title={t("overview.exceptionsEmptyTitle")}
            body={t("overview.exceptionsEmptyBody")}
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
                      <th>{t("overview.colReceived")}</th>
                      <th>{t("common.channel")}</th>
                      <th>{t("overview.colSender")}</th>
                      <th>{t("overview.colOutcome")}</th>
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
              <p className="hint">{t("overview.exceptionsOlder")}</p>
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
  const t = useT();
  return (
    <li className="health-row">
      <span className={`tone tone-${tone}`} aria-hidden="true" />
      <div className="health-copy">
        <strong>{name}</strong>
        <span>{detail}</span>
        {actions}
      </div>
      <span className="health-counts">
        {counts ? t("overview.healthCounts", { verified: counts.verified, pending: counts.pending }) : ""}
      </span>
      <span className={`health-status tone-text-${tone}`}>
        {tone === "ok" ? <ConnectedMark /> : null}
        <span>{status}</span>
      </span>
    </li>
  );
}

function gatewayLabel(data: Overview | null, t: Translate): string {
  if (!data) {
    return "Checking";
  }
  if (data.gateway.ready) {
    return "Ready";
  }
  if (data.gateway.live) {
    return t("overview.liveNotReady");
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
  const t = useT();
  if (ready) {
    return (
      <Link className={className} to="/verify">
        {children}
      </Link>
    );
  }
  const hint = t("nav.channelHint");
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

/** Cartes « Mes canaux » : l'état de WhatsApp et Telegram en un coup d'œil. */
function HomeChannels() {
  const { me } = useAuth();
  const t = useT();
  const tenant = me?.tenant;
  const cards = [
    {
      id: "whatsapp" as const,
      name: t("common.whatsapp"),
      value: tenant?.whatsappNumber ?? null,
      copy: describeChannel(t, "whatsapp", tenant),
    },
    {
      id: "telegram" as const,
      name: t("common.telegram"),
      value: tenant?.telegramBotUsername ? `@${tenant.telegramBotUsername}` : null,
      copy: describeChannel(t, "telegram", tenant),
    },
  ];
  return (
    <section className="home-section" aria-labelledby="home-channels">
      <h2 className="section-label" id="home-channels">
        {t("home.channels")}
      </h2>
      <div className="channel-cards">
        {cards.map((card) => {
          const ready = card.copy.status === "connected";
          return (
            <Link
              key={card.id}
              to="/settings"
              className={`channel-card is-${card.id}${ready ? " is-ready" : ""}`}
            >
              <span className="channel-card-top">
                <span className="channel-card-name">{card.name}</span>
                <span className={`channel-card-dot tone-${card.copy.tone}`} aria-hidden="true" />
              </span>
              <strong className="channel-card-value">
                {card.value ?? t("home.notConnected")}
              </strong>
              <span className="channel-card-foot">
                <span className={`status-chip tone-${card.copy.tone}`}>{card.copy.label}</span>
                <span className="channel-card-manage">{t("home.manage")} →</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Parcours de démarrage en quatre étapes, masqué une fois tout terminé. */
function FirstSteps({ data }: { data: Overview | null }) {
  const { me } = useAuth();
  const t = useT();
  const [purposes, setPurposes] = useState<number | null>(null);
  const [triggers, setTriggers] = useState<number | null>(null);

  useEffect(() => {
    void api
      .purposes()
      .then((res) => setPurposes(res.items.length))
      .catch(() => setPurposes(0));
    void api
      .triggers()
      .then((res) => setTriggers(res.items.length))
      .catch(() => setTriggers(0));
  }, []);

  const channelsReady = hasChannelSetup(me?.tenant);
  const issued = data ? data.verified + data.pending + data.expired : 0;
  const steps = [
    { done: channelsReady, title: t("home.step1"), body: t("home.step1Body"), cta: t("home.step1Cta"), to: "/settings" },
    { done: (purposes ?? 0) > 0, title: t("home.step2"), body: t("home.step2Body"), cta: t("home.step2Cta"), to: "/purposes" },
    { done: (triggers ?? 0) > 0, title: t("home.step3"), body: t("home.step3Body"), cta: t("home.step3Cta"), to: "/triggers?new=1" },
    { done: issued > 0, title: t("home.step4"), body: t("home.step4Body"), cta: t("home.step4Cta"), to: channelsReady ? "/verify" : "/settings" },
  ];
  const loading = !data || purposes === null || triggers === null;
  const doneCount = steps.filter((step) => step.done).length;
  const current = steps.findIndex((step) => !step.done);

  if (loading || doneCount === steps.length) {
    return null;
  }

  return (
    <section className="panel first-steps" aria-labelledby="home-steps">
      <header className="first-steps-head">
        <h2 id="home-steps">{t("home.steps")}</h2>
        <span className="first-steps-count">
          {t("home.stepsProgress", { done: doneCount, total: steps.length })}
        </span>
      </header>
      <div className="first-steps-bar" aria-hidden="true">
        {steps.map((step, index) => (
          <span key={index} className={step.done ? "is-done" : index === current ? "is-current" : ""} />
        ))}
      </div>
      <ol className="first-steps-list">
        {steps.map((step, index) => (
          <li
            key={index}
            className={step.done ? "is-done" : index === current ? "is-current" : ""}
          >
            <span className="step-badge" aria-hidden="true">
              {step.done ? (
                <svg viewBox="0 0 16 16" width="14" height="14">
                  <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <div className="step-copy">
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
            {step.done ? (
              <span className="status-chip tone-ok">{t("home.stepDone")}</span>
            ) : (
              <Link className={index === current ? "primary" : "secondary"} to={step.to}>
                {step.cta}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Raccourcis vers les tâches les plus courantes. */
function QuickActions({ channelsReady }: { channelsReady: boolean }) {
  const t = useT();
  const actions = [
    { to: channelsReady ? "/verify" : "/settings", label: t("home.qIssue"), icon: IconScan },
    { to: "/triggers?new=1", label: t("home.qTrigger"), icon: IconBolt },
    { to: "/reactions?new=1", label: t("home.qReaction"), icon: IconReply },
    { to: "/purposes", label: t("home.qPurpose"), icon: IconTag },
    { to: "/settings", label: t("home.qConnect"), icon: IconSliders },
    { to: "/developers", label: t("home.qKeys"), icon: IconKey },
  ];
  return (
    <section className="home-section" aria-labelledby="home-quick">
      <h2 className="section-label" id="home-quick">
        {t("home.quick")}
      </h2>
      <div className="quick-actions">
        {actions.map((action) => (
          <Link key={action.label} to={action.to} className="quick-action">
            <action.icon />
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

