import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api, type UsageJobKind, type WorkspaceUsage } from "../api.js";
import type { MessageKey } from "../i18n.js";
import { localeTag } from "../i18n.js";
import { IconCard } from "../jk/icons.js";
import { BarChart, Card, EmptyState, ErrorState, Loading, PageTitle } from "../jk/ui.js";
import { useT } from "../locale.js";

const KIND_LABEL: Record<UsageJobKind, MessageKey> = {
  "jokubot.chat": "jk.use.ai",
  "jokubot.stt": "jk.use.voice",
  "jokubot.vision": "jk.use.images",
  "jokubot.tts": "jk.use.other",
};

const DAY = 86400000;

export function UsageViewPage() {
  const t = useT();
  const [usage, setUsage] = useState<WorkspaceUsage | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setUsage(null);
    void api
      .usage()
      .then(setUsage)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const credits = usage?.credits;
  const percent = credits && credits.included > 0 ? Math.min(100, Math.round((credits.spent / credits.included) * 100)) : 0;

  // Crédits consommés par jour sur les 14 derniers jours.
  const chart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => {
      const from = today.getTime() - (13 - i) * DAY;
      const date = new Date(from);
      const value = (usage?.events ?? [])
        .filter((e) => {
          const at = new Date(e.occurredAt).getTime();
          return at >= from && at < from + DAY;
        })
        .reduce((sum, e) => sum + e.credits, 0);
      return {
        label: date.toLocaleDateString(localeTag(), { day: "numeric", month: "short" }),
        tick: i % 3 === 0 || i === 13 ? String(date.getDate()) : "",
        value,
      };
    });
  }, [usage]);

  const jobs = [...(usage?.jobs ?? [])].sort((a, b) => b.credits - a.credits);
  const totalJobs = jobs.reduce((sum, job) => sum + job.credits, 0);

  return (
    <div className="jk-page">
      <PageTitle title={t("jk.nav.usage")} subtitle={t("jk.use.subtitle")} />

      {error ? (
        <ErrorState message={t("jk.use.error")} onRetry={load} />
      ) : !usage ? (
        <Loading rows={3} height={120} />
      ) : (
        <>
          <Card title={t("jk.use.consumption")}>
            {credits?.hasPlan ? (
              <div className="jk-usage-main">
                <p className="jk-usage-figure">
                  <strong>{credits.spent.toLocaleString(localeTag())}</strong>
                  <span>
                    {" "}
                    / {credits.included.toLocaleString(localeTag())} {t("jk.use.creditsUsed")}
                  </span>
                </p>
                <span className="jk-usage-percent">{percent} %</span>
                <span
                  className="jk-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  aria-label={t("jk.use.consumption")}
                >
                  <span style={{ width: `${percent}%` }} />
                </span>
                <p className="jk-muted">
                  {credits.exhausted
                    ? t("jk.use.exhausted")
                    : t("jk.use.remaining", { count: credits.remaining.toLocaleString(localeTag()) })}
                </p>
              </div>
            ) : (
              <p className="jk-muted">{t("jk.use.noPlan")}</p>
            )}
          </Card>

          <div className="jk-grid-2">
            <Card title={t("jk.use.byType")}>
              {jobs.length === 0 ? (
                <EmptyState icon={IconCard} title={t("jk.use.noJobs")} />
              ) : (
                <ul className="jk-breakdown">
                  {jobs.map((job) => {
                    const share = totalJobs ? Math.round((job.credits / totalJobs) * 100) : 0;
                    return (
                      <li key={job.kind}>
                        <div className="jk-breakdown-top">
                          <span>{t(KIND_LABEL[job.kind])}</span>
                          <strong>
                            {job.credits.toLocaleString(localeTag())} {t("jk.use.credits")}
                          </strong>
                        </div>
                        <span className="jk-progress is-thin" aria-hidden="true">
                          <span style={{ width: `${share}%` }} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title={t("jk.use.perDay")}>
              <BarChart data={chart} label={t("jk.use.chartAria")} />
            </Card>
          </div>

          <p className="jk-muted jk-small">
            {t("jk.use.detailHint")} <Link to="/usage/details">{t("jk.use.detailLink")}</Link>
          </p>
        </>
      )}
    </div>
  );
}
