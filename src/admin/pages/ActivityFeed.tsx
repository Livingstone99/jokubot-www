import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api, type InboundRow } from "../api.js";
import type { MessageKey } from "../i18n.js";
import { IconActivity, IconCircleCheck, IconMessage, IconShieldCheck, IconAlert, type IconComponent } from "../jk/icons.js";
import { ChannelMark, EmptyState, ErrorState, Loading, PageTitle, SearchInput } from "../jk/ui.js";
import { localeTag } from "../i18n.js";
import { useT } from "../locale.js";
import { senderLabel } from "../ui.js";

type Kind = "received" | "replied" | "verified" | "refused";

/** Traduit l'issue technique d'un message en événement compréhensible. */
export function activityKind(outcome: string): Kind {
  if (outcome === "verified") return "verified";
  if (outcome === "triggered") return "replied";
  if (["expired", "unknown_token", "already_used", "channel_mismatch", "sender_mismatch"].includes(outcome)) return "refused";
  return "received";
}

const KIND_LABEL: Record<Kind, MessageKey> = {
  received: "jk.act.received",
  replied: "jk.act.replied",
  verified: "jk.act.verified",
  refused: "jk.act.refused",
};

const KIND_ICON: Record<Kind, IconComponent> = {
  received: IconMessage,
  replied: IconCircleCheck,
  verified: IconShieldCheck,
  refused: IconAlert,
};

export function activityLabel(outcome: string): MessageKey {
  return KIND_LABEL[activityKind(outcome)];
}

export function activityIcon(outcome: string): IconComponent {
  return KIND_ICON[activityKind(outcome)];
}

type Range = "today" | "7d" | "all";

export function ActivityFeedPage() {
  const t = useT();
  const [rows, setRows] = useState<InboundRow[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<"all" | "whatsapp" | "telegram">("all");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [range, setRange] = useState<Range>("all");

  const load = useCallback(() => {
    setError(false);
    setRows(null);
    void api
      .inbound()
      .then((res) => setRows(res.items))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const since = range === "today" ? startOfDay.getTime() : range === "7d" ? Date.now() - 7 * 86400000 : 0;
    return (rows ?? []).filter((row) => {
      if (channel !== "all" && row.channel !== channel) return false;
      if (kind !== "all" && activityKind(row.outcome) !== kind) return false;
      if (new Date(row.receivedAt).getTime() < since) return false;
      if (q && !`${senderLabel(row)} ${row.triggerName ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, channel, kind, range]);

  // Regroupe par jour pour une lecture chronologique.
  const groups = useMemo(() => {
    const map = new Map<string, InboundRow[]>();
    for (const row of filtered) {
      const day = new Date(row.receivedAt).toLocaleDateString(localeTag(), { weekday: "long", day: "numeric", month: "long" });
      map.set(day, [...(map.get(day) ?? []), row]);
    }
    return [...map];
  }, [filtered]);

  return (
    <div className="jk-page">
      <PageTitle title={t("jk.nav.activity")} subtitle={t("jk.act.subtitle")} />

      <div className="jk-filters">
        <SearchInput value={query} onChange={setQuery} placeholder={t("jk.act.search")} />
        <label className="jk-select">
          <span className="jk-sr">{t("jk.filter.channel")}</span>
          <select value={channel} onChange={(event) => setChannel(event.target.value as typeof channel)}>
            <option value="all">{t("jk.filter.allChannels")}</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
          </select>
        </label>
        <label className="jk-select">
          <span className="jk-sr">{t("jk.filter.type")}</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
            <option value="all">{t("jk.filter.allTypes")}</option>
            <option value="received">{t("jk.act.received")}</option>
            <option value="replied">{t("jk.act.replied")}</option>
            <option value="verified">{t("jk.act.verified")}</option>
            <option value="refused">{t("jk.act.refused")}</option>
          </select>
        </label>
        <label className="jk-select">
          <span className="jk-sr">{t("jk.filter.date")}</span>
          <select value={range} onChange={(event) => setRange(event.target.value as Range)}>
            <option value="all">{t("jk.filter.allDates")}</option>
            <option value="today">{t("jk.filter.today")}</option>
            <option value="7d">{t("jk.filter.7d")}</option>
          </select>
        </label>
      </div>

      {error ? (
        <ErrorState message={t("jk.act.error")} onRetry={load} />
      ) : rows === null ? (
        <Loading rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={IconActivity}
          title={rows.length === 0 ? t("jk.act.empty") : t("jk.noResult")}
          body={rows.length === 0 ? t("jk.act.emptyBody") : t("jk.noResultBody")}
          action={
            rows.length === 0 ? (
              <Link className="jk-btn is-primary" to="/channels">
                {t("jk.connectChannel")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        groups.map(([day, items]) => (
          <section key={day} className="jk-card jk-timeline-card">
            <h2 className="jk-day">{day}</h2>
            <ol className="jk-timeline">
              {items.map((row) => {
                const Icon = activityIcon(row.outcome);
                return (
                  <li key={row.id}>
                    <time dateTime={row.receivedAt}>
                      {new Date(row.receivedAt).toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit" })}
                    </time>
                    <span className="jk-timeline-icon">
                      <Icon size={16} />
                    </span>
                    <div className="jk-timeline-main">
                      <strong>{t(activityLabel(row.outcome))}</strong>
                      <span>
                        <ChannelMark channel={row.channel} size={14} /> {row.channel === "telegram" ? "Telegram" : "WhatsApp"} ·{" "}
                        {senderLabel(row)}
                        {row.triggerName ? ` · ${row.triggerName}` : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
