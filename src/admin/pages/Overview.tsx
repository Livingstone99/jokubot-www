import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, type ConversationSummary, type InboundRow, type Overview } from "../api.js";
import { useAuth } from "../auth.js";
import { IconActivity, IconCard, IconCircleCheck, IconMessage, IconShieldCheck } from "../jk/icons.js";
import { Avatar, Card, EmptyState, ErrorState, Loading, PageTitle, StatCard } from "../jk/ui.js";
import { useT } from "../locale.js";
import { formatWhen, senderLabel } from "../ui.js";
import { activityKind, activityLabel } from "./ActivityFeed.js";
import { ChannelCards } from "./Channels.js";

type Data = { overview: Overview; inbound: InboundRow[]; conversations: ConversationSummary[] };

export function OverviewPage() {
  const { me } = useAuth();
  const t = useT();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setData(null);
    void Promise.all([api.overview(), api.inbound(), api.conversations()])
      .then(([overview, inbound, conversations]) =>
        setData({ overview, inbound: inbound.items, conversations: conversations.items }),
      )
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const name = me?.tenant.name || me?.name || "";
  const inbound = data?.inbound ?? [];
  const replies = inbound.filter((row) => activityKind(row.outcome) === "replied");
  const credits = data?.overview.credits;

  // Nom affiché et dernier message de chaque conversation, pour l'activité récente.
  const byConversation = new Map((data?.conversations ?? []).map((c) => [`${c.channel}:${c.senderRef}`, c]));

  return (
    <div className="jk-page">
      <PageTitle title={t("jk.dash.hello", { name })} subtitle={t("jk.dash.subtitle")} />

      {error ? (
        <ErrorState message={t("jk.dash.error")} onRetry={load} />
      ) : !data ? (
        <Loading rows={1} height={132} />
      ) : (
        <div className="jk-grid-4">
          <StatCard
            icon={IconMessage}
            label={t("jk.dash.received")}
            value={inbound.length}
          />
          <StatCard icon={IconCircleCheck} label={t("jk.dash.replies")} value={replies.length} />
          <StatCard
            icon={IconShieldCheck}
            label={t("jk.dash.verified")}
            value={data.overview.verified}
          />
          <StatCard
            icon={IconCard}
            label={t("jk.dash.credits")}
            value={credits?.hasPlan ? credits.remaining.toLocaleString() : "—"}
          />
        </div>
      )}

      <section>
        <h2 className="jk-section-title">{t("jk.ch.title")}</h2>
        <ChannelCards />
      </section>

      <Card
        title={t("jk.dash.recent")}
        action={
          <Link className="jk-btn is-text is-small" to="/activity">
            {t("jk.seeAll")}
          </Link>
        }
      >
        {error ? null : !data ? (
          <Loading rows={3} height={56} />
        ) : inbound.length === 0 ? (
          <EmptyState
            icon={IconActivity}
            title={t("jk.dash.noActivity")}
            body={t("jk.dash.noActivityBody")}
            action={
              <Link className="jk-btn is-primary" to="/channels">
                {t("jk.connectChannel")}
              </Link>
            }
          />
        ) : (
          <ul className="jk-list">
            {inbound.slice(0, 5).map((row) => {
              const conv = byConversation.get(`${row.channel}:${row.senderRef}`);
              const who = conv?.displayName || senderLabel(row);
              const preview = activityKind(row.outcome) === "received" && conv?.lastBody ? `« ${conv.lastBody} »` : null;
              return (
                <li key={row.id}>
                  <Link className="jk-row" to={`/sessions/${row.channel}/${encodeURIComponent(row.senderRef)}`}>
                    <Avatar name={who} size={40} />
                    <span className="jk-row-main">
                      <strong>{who}</strong>
                      <span className="jk-row-sub">
                        {t(activityLabel(row.outcome))}
                        {preview ? ` · ${preview}` : ""}
                      </span>
                    </span>
                    <span className="jk-row-meta">{formatWhen(row.receivedAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
