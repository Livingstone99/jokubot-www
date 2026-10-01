import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, type Overview } from "../api.js";
import { useAuth } from "../auth.js";
import { describeChannel } from "../ChannelLink.js";
import { IconBot, IconLink, IconMessage } from "../kit/icons.js";
import { conversationKey, useInbox } from "../kit/inbox.js";
import {
  Avatar,
  ChannelCard,
  ChannelIcon,
  EmptyBlock,
  ErrorBlock,
  Skeleton,
  StatCard,
} from "../kit/ui.js";
import { useT } from "../locale.js";
import { formatWhen, senderLabel, senderPreview } from "../ui.js";

/** Issues d'un message entrant pour lesquelles Jokubot a répondu. */
const REPLIED = new Set(["triggered", "verified"]);

export function OverviewPage() {
  const { me } = useAuth();
  const t = useT();
  const inbox = useInbox();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    void api
      .overview()
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("overview.loadError"));
      });
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const tenant = me?.tenant;
  const whatsapp = describeChannel(t, "whatsapp", tenant);
  const telegram = describeChannel(t, "telegram", tenant);
  const replies = (data?.inboundOutcomesLast24h ?? [])
    .filter((row) => REPLIED.has(row.outcome))
    .reduce((sum, row) => sum + row.total, 0);
  const recent = (inbox.items ?? [])
    .filter((row) => !inbox.isArchived(row))
    .sort((a, b) => b.lastReceivedAt.localeCompare(a.lastReceivedAt))
    .slice(0, 5);

  return (
    <section className="page home2">
      <p className="lede page-intro">{t("home.lede")}</p>

      <section className="home-block" aria-labelledby="home-channels">
        <h2 className="section-label" id="home-channels">
          {t("home.channels")}
        </h2>
        <div className="channel-grid">
          <ChannelCard
            channel="whatsapp"
            name={t("common.whatsapp")}
            value={tenant?.whatsappNumber ?? null}
            connected={whatsapp.status === "connected"}
            statusLabel={whatsapp.status === "connected" ? t("home.connected") : t("home.notConnected")}
            to="/channels"
          />
          <ChannelCard
            channel="telegram"
            name={t("common.telegram")}
            value={tenant?.telegramBotUsername ? `@${tenant.telegramBotUsername}` : null}
            connected={telegram.status === "connected"}
            statusLabel={telegram.status === "connected" ? t("home.connected") : t("home.notConnected")}
            to="/channels"
          />
        </div>
      </section>

      <section className="home-block" aria-labelledby="home-quick">
        <h2 className="section-label" id="home-quick">
          {t("home.quick")}
        </h2>
        <div className="quick-row">
          <Link className="primary" to="/messages">
            <IconMessage size={18} />
            {t("home.qReply")}
          </Link>
          <Link className="secondary" to="/automations/new">
            <IconBot size={18} />
            {t("home.qNewRule")}
          </Link>
          <Link className="secondary" to="/channels">
            <IconLink size={18} />
            {t("home.qConnect")}
          </Link>
        </div>
      </section>

      <section className="home-block" aria-labelledby="home-figures">
        <h2 className="section-label" id="home-figures">
          {t("home.figures")}
        </h2>
        {error ? (
          <ErrorBlock message={t("home.figuresError")} onRetry={load} />
        ) : !data ? (
          <Skeleton lines={1} height={104} />
        ) : (
          <div className="stat-row">
            <StatCard label={t("home.statReceived")} value={data.inboundLast24h} hint={t("home.statLast24h")} />
            <StatCard label={t("home.statReplies")} value={replies} hint={t("home.statLast24h")} />
            <StatCard
              label={t("home.statWaiting")}
              value={inbox.unreadCount}
              hint={t("home.statWaitingHint")}
              alert={inbox.unreadCount > 0}
            />
          </div>
        )}
      </section>

      <section className="home-block" aria-labelledby="home-recent">
        <div className="block-head">
          <h2 className="section-label" id="home-recent">
            {t("home.recent")}
          </h2>
          {recent.length > 0 ? (
            <Link className="text-link" to="/messages">
              {t("home.seeAll")}
            </Link>
          ) : null}
        </div>
        {inbox.items === null ? (
          <Skeleton lines={3} height={64} />
        ) : inbox.error && inbox.items.length === 0 ? (
          <ErrorBlock message={t("home.messagesError")} onRetry={() => void inbox.refresh()} />
        ) : recent.length === 0 ? (
          <EmptyBlock
            icon={<IconMessage size={24} />}
            title={t("home.emptyMessages")}
            action={
              <Link className="secondary compact" to="/channels">
                {t("home.qConnect")}
              </Link>
            }
          />
        ) : (
          <ul className="recent-list">
            {recent.map((row) => {
              const name = row.displayName || senderLabel(row);
              const unread = inbox.isUnread(row);
              return (
                <li key={conversationKey(row)}>
                  <Link
                    className={unread ? "recent-row is-unread" : "recent-row"}
                    to={`/messages/${row.channel}/${encodeURIComponent(row.senderRef)}`}
                  >
                    <Avatar name={name} />
                    <span className="recent-main">
                      <span className="recent-top">
                        <strong>{name}</strong>
                        <ChannelIcon channel={row.channel} size={14} />
                      </span>
                      <span className="recent-preview">{senderPreview(row)}</span>
                    </span>
                    <span className="recent-meta">
                      <time dateTime={row.lastReceivedAt}>{formatWhen(row.lastReceivedAt)}</time>
                      {unread ? (
                        <span className="kit-badge is-dot" role="img" aria-label={t("home.unread")} />
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
