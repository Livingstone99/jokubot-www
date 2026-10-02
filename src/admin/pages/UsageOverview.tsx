import { useCallback, useEffect, useMemo, useState } from "react";

import { api, type InboundRow, type WorkspaceUsage } from "../api.js";
import type { MessageKey } from "../i18n.js";
import { IconDownload } from "../kit/icons.js";
import { BarChart, ErrorBlock, Skeleton, useToast } from "../kit/ui.js";
import { localeTag } from "../i18n.js";
import { useT } from "../locale.js";
import { outcomeLabel, senderLabel } from "../ui.js";
import { UsagePage } from "./Usage.js";

type Period = "24h" | "7d" | "30d";

const PERIODS: Array<[Period, MessageKey]> = [
  ["24h", "use.p24h"],
  ["7d", "use.p7d"],
  ["30d", "use.p30d"],
];

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

/** Découpe la période en barres : heures sur 24 h, jours sinon. */
function buckets(period: Period, now: number) {
  const tag = localeTag();
  if (period === "24h") {
    const start = Math.floor(now / HOUR) * HOUR - 23 * HOUR;
    return Array.from({ length: 24 }, (_, i) => {
      const from = start + i * HOUR;
      const hour = new Date(from).getHours();
      return { from, to: from + HOUR, label: `${hour} h`, tick: hour % 4 === 0 ? `${hour} h` : "" };
    });
  }
  const days = period === "7d" ? 7 : 30;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const start = today.getTime() - (days - 1) * DAY;
  return Array.from({ length: days }, (_, i) => {
    const from = start + i * DAY;
    const date = new Date(from);
    const label = date.toLocaleDateString(tag, { weekday: "short", day: "numeric", month: "short" });
    const tick =
      period === "7d"
        ? date.toLocaleDateString(tag, { weekday: "short" })
        : i % 5 === 0 || i === days - 1
          ? String(date.getDate())
          : "";
    return { from, to: from + DAY, label, tick };
  });
}

function csvCell(value: string) {
  return /[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function UsageOverviewPage() {
  const t = useT();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>("7d");
  const [inbound, setInbound] = useState<InboundRow[] | null>(null);
  const [usage, setUsage] = useState<WorkspaceUsage | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setInbound(null);
    void Promise.all([api.inbound(), api.usage()])
      .then(([rows, report]) => {
        setInbound(rows.items);
        setUsage(report);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const now = Date.now();
  const bars = useMemo(() => buckets(period, now), [period, now]);
  const since = bars[0]?.from ?? now;
  const rows = useMemo(
    () => (inbound ?? []).filter((row) => new Date(row.receivedAt).getTime() >= since),
    [inbound, since],
  );
  const chart = bars.map((bar) => ({
    label: bar.label,
    tick: bar.tick,
    value: rows.filter((row) => {
      const at = new Date(row.receivedAt).getTime();
      return at >= bar.from && at < bar.to;
    }).length,
  }));
  const whatsapp = rows.filter((row) => row.channel === "whatsapp").length;
  const telegram = rows.length - whatsapp;
  const credits = usage?.credits;
  const used = credits && credits.included > 0 ? Math.min(100, Math.round((credits.spent / credits.included) * 100)) : 0;

  function onExport() {
    const header = [t("use.colDate"), t("use.colChannel"), t("use.colSender"), t("use.colOutcome"), t("use.colRule")];
    const lines = rows.map((row) =>
      [
        new Date(row.receivedAt).toLocaleString(localeTag()),
        row.channel === "telegram" ? "Telegram" : "WhatsApp",
        senderLabel(row),
        outcomeLabel(row.outcome),
        row.triggerName ?? "",
      ]
        .map(csvCell)
        .join(";"),
    );
    // BOM pour qu'Excel lise correctement les accents.
    const blob = new Blob(["﻿" + [header.map(csvCell).join(";"), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `jokubot-messages-${period}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ text: t("use.exported", { count: rows.length }) });
  }

  return (
    <section className="page usage2">
      <div className="usage-head">
        <div className="chip-row" role="group" aria-label={t("use.period")}>
          {PERIODS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={period === value ? "chip is-on" : "chip"}
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <button type="button" className="secondary" disabled={!inbound} onClick={onExport}>
          <IconDownload size={18} />
          {t("use.export")}
        </button>
      </div>

      {error ? (
        <ErrorBlock message={t("use.loadError")} onRetry={load} />
      ) : inbound === null ? (
        <Skeleton lines={2} height={180} />
      ) : (
        <>
          <article className="panel usage-card">
            <header className="usage-card-head">
              <h2>{t("use.chartTitle")}</h2>
              <strong className="usage-total">{t("use.total", { count: rows.length })}</strong>
            </header>
            {rows.length === 0 ? (
              <p className="hint">{t("use.noMessages")}</p>
            ) : null}
            <BarChart data={chart} label={t("use.chartAria", { count: rows.length })} />
          </article>

          <div className="usage-grid">
            <article className="panel usage-card">
              <h2>{t("use.split")}</h2>
              {[
                { key: "whatsapp", name: t("common.whatsapp"), count: whatsapp },
                { key: "telegram", name: t("common.telegram"), count: telegram },
              ].map((item) => {
                const share = rows.length ? Math.round((item.count / rows.length) * 100) : 0;
                return (
                  <div key={item.key} className="split-row">
                    <span className="split-label">
                      <span>{item.name}</span>
                      <span>
                        {item.count} · {share} %
                      </span>
                    </span>
                    <span className="meter" aria-hidden="true">
                      <span className={`meter-fill is-${item.key}`} style={{ width: `${share}%` }} />
                    </span>
                  </div>
                );
              })}
            </article>

            <article className="panel usage-card">
              <h2>{t("use.quota")}</h2>
              {credits?.hasPlan ? (
                <>
                  <p className="quota-figure">
                    <strong className={used > 90 ? "is-alert" : ""}>{used} %</strong>{" "}
                    {t("use.quotaUsed", {
                      spent: credits.spent.toLocaleString(localeTag()),
                      included: credits.included.toLocaleString(localeTag()),
                    })}
                  </p>
                  <span
                    className="meter is-quota"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={used}
                    aria-label={t("use.quota")}
                  >
                    <span className={used > 90 ? "meter-fill is-alert" : "meter-fill"} style={{ width: `${used}%` }} />
                  </span>
                  <p className="hint">
                    {used > 90 ? t("use.quotaHigh") : t("use.quotaLeft", { remaining: credits.remaining.toLocaleString(localeTag()) })}
                  </p>
                </>
              ) : (
                <p className="hint">{t("use.noPlan")}</p>
              )}
            </article>
          </div>

          <details className="advanced-block">
            <summary>{t("use.detail")}</summary>
            <div className="usage-legacy">
              <UsagePage />
            </div>
          </details>
        </>
      )}
    </section>
  );
}
