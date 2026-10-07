import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api, type InboundRow } from "../api.js";
import type { MessageKey } from "../i18n.js";
import { IconActivity, IconEye, IconCircleCheck, IconMessage, IconShieldCheck, IconAlert, type IconComponent } from "../jk/icons.js";
import { Badge, ChannelMark, EmptyState, ErrorState, Loading, Modal, PageTitle, SearchInput, type BadgeTone } from "../jk/ui.js";
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

const KIND_TONE: Record<Kind, BadgeTone> = {
  received: "muted",
  replied: "outline",
  verified: "solid",
  refused: "outline",
};

const KNOWN_OUTCOMES = ["verified", "triggered", "expired", "unknown_token", "already_used", "channel_mismatch", "sender_mismatch"];

/** Issue technique → phrase courte (tableau) ou explication (détails). */
function outcomeKey(outcome: string): string {
  return KNOWN_OUTCOMES.includes(outcome) ? outcome : "received";
}
function shortDetail(outcome: string): MessageKey {
  return `jk.act.short.${outcomeKey(outcome)}` as MessageKey;
}
function explanation(outcome: string): MessageKey {
  return `jk.act.why.${outcomeKey(outcome)}` as MessageKey;
}

function channelName(channel: InboundRow["channel"]) {
  return channel === "telegram" ? "Telegram" : "WhatsApp";
}

function dayOf(value: string) {
  return new Date(value).toLocaleDateString(localeTag(), { day: "numeric", month: "short", year: "numeric" });
}

function EyeButton({ label, onClick }: { label: string; onClick: (event: React.MouseEvent) => void }) {
  return (
    <button type="button" className="jk-icon-btn jk-eye-btn" aria-label={label} title={label} onClick={onClick}>
      <IconEye size={18} />
    </button>
  );
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
  const [selected, setSelected] = useState<InboundRow | null>(null);

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
        <>
          <p className="jk-muted jk-small jk-count">
            {filtered.length === 1 ? t("jk.act.countOne") : t("jk.act.count", { count: filtered.length })}
          </p>
          <div className="jk-table-wrap is-cards jk-act-wrap">
            <table className="jk-table jk-act-table">
              <thead>
                <tr>
                  <th scope="col">{t("jk.act.colDate")}</th>
                  <th scope="col">{t("jk.act.colClient")}</th>
                  <th scope="col">{t("jk.act.colChannel")}</th>
                  <th scope="col" className="jk-cell-action">{t("jk.act.colDetail")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="is-clickable" onClick={() => setSelected(row)}>
                    <td className="jk-nowrap">
                      <time dateTime={row.receivedAt}>{dayOf(row.receivedAt)}</time>
                    </td>
                    <td>
                      <strong>{senderLabel(row)}</strong>
                    </td>
                    <td className="jk-nowrap">
                      <ChannelMark channel={row.channel} size={14} /> {channelName(row.channel)}
                    </td>
                    <td className="jk-cell-action">
                      <EyeButton
                        label={t("jk.act.viewDetails")}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(row);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="jk-cards jk-act-cards">
            {filtered.map((row) => (
              <li key={row.id} className="jk-card jk-act-card">
                <span className="jk-act-card-text">
                  <strong>{senderLabel(row)}</strong>
                  <span className="jk-row-sub">
                    <ChannelMark channel={row.channel} size={13} /> {channelName(row.channel)} · {dayOf(row.receivedAt)}
                  </span>
                </span>
                <EyeButton label={t("jk.act.viewDetails")} onClick={() => setSelected(row)} />
              </li>
            ))}
          </ul>
        </>
      )}

      <ActivityDetails row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ---------- Détails d'un événement ---------- */

function ActivityDetails({ row, onClose }: { row: InboundRow | null; onClose: () => void }) {
  const t = useT();
  const kindOf = row ? activityKind(row.outcome) : "received";
  return (
    <Modal
      open={row !== null}
      title={row ? t(KIND_LABEL[kindOf]) : ""}
      onClose={onClose}
      footer={
        row ? (
          <>
            <Link
              className="jk-btn is-secondary"
              to={`/sessions/${row.channel}/${encodeURIComponent(row.senderRef)}`}
              onClick={onClose}
            >
              {t("jk.act.openConversation")}
            </Link>
            <button type="button" className="jk-btn is-primary" onClick={onClose}>
              {t("jk.close")}
            </button>
          </>
        ) : undefined
      }
    >
      {row ? (
        <>
          <p className="jk-act-explain">{t(explanation(row.outcome))}</p>
          <div className="jk-table-wrap">
            <table className="jk-table jk-detail-table">
              <tbody>
                <tr>
                  <th scope="row">{t("jk.act.colEvent")}</th>
                  <td>
                    <Badge tone={KIND_TONE[kindOf]}>{t(KIND_LABEL[kindOf])}</Badge>
                  </td>
                </tr>
                <tr>
                  <th scope="row">{t("jk.act.colDetail")}</th>
                  <td>{t(shortDetail(row.outcome))}</td>
                </tr>
                <tr>
                  <th scope="row">{t("jk.act.colDate")}</th>
                  <td>{new Date(row.receivedAt).toLocaleDateString(localeTag(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</td>
                </tr>
                <tr>
                  <th scope="row">{t("jk.act.time")}</th>
                  <td>{new Date(row.receivedAt).toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                </tr>
                <tr>
                  <th scope="row">{t("jk.act.colClient")}</th>
                  <td>{senderLabel(row)}</td>
                </tr>
                <tr>
                  <th scope="row">{t("jk.act.colChannel")}</th>
                  <td>
                    <ChannelMark channel={row.channel} size={14} /> {channelName(row.channel)}
                  </td>
                </tr>
                <tr>
                  <th scope="row">{t("jk.act.colAutomation")}</th>
                  <td>{row.triggerName ?? t("jk.act.none")}</td>
                </tr>
                {row.sessionPublicId ? (
                  <tr>
                    <th scope="row">{t("jk.act.session")}</th>
                    <td className="jk-mono">{row.sessionPublicId}</td>
                  </tr>
                ) : null}
                <tr>
                  <th scope="row">{t("jk.act.ref")}</th>
                  <td className="jk-mono">{row.id}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
