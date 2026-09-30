import { useEffect, useState } from "react";

import { api, type UsageJobKind, type WorkspaceUsage } from "../api.js";
import { useT } from "../locale.js";
import { EmptyState, formatWhen } from "../ui.js";

const JOB_LABEL: Record<UsageJobKind, "usage.job.chat" | "usage.job.stt" | "usage.job.vision" | "usage.job.tts"> = {
  "jokubot.chat": "usage.job.chat",
  "jokubot.stt": "usage.job.stt",
  "jokubot.vision": "usage.job.vision",
  "jokubot.tts": "usage.job.tts",
};

export function UsagePage() {
  const t = useT();
  const [data, setData] = useState<WorkspaceUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .usage()
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("usage.loadError"));
      });
  }, [t]);

  const credits = data?.credits;
  const periodLabel = data
    ? new Date(`${data.periodStart}T00:00:00.000Z`).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t("usage.eyebrow")}</p>
          <h1>{t("usage.title")}</h1>
          <p className="lede">{t("usage.lede")}</p>
        </div>
      </header>

      {error ? (
        <p className="banner banner-danger" role="alert">
          {error}
        </p>
      ) : null}

      {credits?.hasPlan && credits.exhausted ? (
        <div className="banner banner-warn">
          <div>
            <strong>{t("usage.pausedTitle")}</strong>
            <p>{t("usage.pausedBody")}</p>
          </div>
        </div>
      ) : null}

      {credits && !credits.hasPlan ? (
        <div className="banner">
          <div>
            <strong>{t("usage.uncappedTitle")}</strong>
            <p>{t("usage.uncappedBody")}</p>
          </div>
        </div>
      ) : null}

      <div className="stat-grid">
        <Stat
          label={t("usage.statSpent")}
          hint={periodLabel ?? t("usage.statThisMonth")}
          value={credits?.spent}
          detail={t("usage.spentDetail")}
        />
        {credits?.hasPlan ? (
          <>
            <Stat
              label={t("usage.statRemaining")}
              hint={t("usage.statThisMonth")}
              value={credits.remaining}
              detail={
                credits.exhausted
                  ? t("usage.creditsExhaustedDetail")
                  : t("usage.creditsDetail", {
                      remaining: credits.remaining.toLocaleString(),
                      included: credits.included.toLocaleString(),
                    })
              }
            />
            <Stat
              label={t("usage.statIncluded")}
              hint={t("usage.statPlan")}
              value={credits.included}
              detail={t("usage.includedDetail")}
            />
          </>
        ) : null}
      </div>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>{t("usage.jobsTitle")}</h2>
            <p className="hint">
              {data
                ? t("usage.jobsHint", data.costs)
                : t("usage.jobsHintFallback")}
            </p>
          </div>
        </header>
        {data === null ? (
          <div className="skeleton-table" aria-hidden="true" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("usage.colJob")}</th>
                  <th>{t("usage.colRuns")}</th>
                  <th>{t("usage.colCredits")}</th>
                </tr>
              </thead>
              <tbody>
                {data.jobs.map((job) => (
                  <tr key={job.kind}>
                    <td>{t(JOB_LABEL[job.kind])}</td>
                    <td>{job.events.toLocaleString()}</td>
                    <td>{job.credits.toLocaleString()}</td>
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
            <h2>{t("usage.eventsTitle")}</h2>
            <p className="hint">{t("usage.eventsHint")}</p>
          </div>
        </header>
        {data === null ? (
          <div className="skeleton-table" aria-hidden="true" />
        ) : data.events.length === 0 ? (
          <EmptyState
            title={t("usage.emptyTitle")}
            body={t("usage.emptyBody")}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("usage.colWhen")}</th>
                  <th>{t("usage.colJob")}</th>
                  <th>{t("usage.colCredits")}</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event) => (
                  <tr key={event.id}>
                    <td>{formatWhen(event.occurredAt)}</td>
                    <td>
                      {event.kind === "jokubot.chat" && event.image
                        ? t("usage.job.chatImage")
                        : t(JOB_LABEL[event.kind])}
                    </td>
                    <td>
                      {event.billable
                        ? event.credits.toLocaleString()
                        : t("usage.notBilled")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      <strong>{value === undefined ? "—" : value.toLocaleString()}</strong>
      <span className="stat-label">{label}</span>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}

