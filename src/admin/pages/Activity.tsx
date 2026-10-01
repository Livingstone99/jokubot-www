import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, type InboundRow } from "../api.js";
import {
  ChannelBadge,
  EmptyState,
  OutcomePill,
  formatWhen,
} from "../ui.js";
import { useT } from "../locale.js";

export function ActivityPage() {
  const t = useT();
  const [items, setItems] = useState<InboundRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .inbound()
      .then((result) => setItems(result.items))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("activity.loadError"));
      });
  }, []);

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t("nav.activity")}</p>
          <h1>{t("activity.title")}</h1>
          <p className="lede">
            {t("activity.lede")}
          </p>
        </div>
      </header>

      <article className="panel">
        {error ? (
          <p className="banner banner-danger" role="alert">
            {error}
          </p>
        ) : null}
        {items === null ? (
          <div className="skeleton-table" aria-hidden="true" />
        ) : items.length === 0 ? (
          <EmptyState
            title={t("activity.emptyTitle")}
            body={t("activity.emptyBody")}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("overview.colReceived")}</th>
                  <th>{t("common.channel")}</th>
                  <th>{t("overview.colSender")}</th>
                  <th>{t("activity.colTrigger")}</th>
                  <th>{t("activity.colSession")}</th>
                  <th>{t("overview.colOutcome")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{formatWhen(item.receivedAt)}</td>
                    <td>
                      <ChannelBadge channel={item.channel} />
                    </td>
                    <td>
                      <code>{item.senderRef}</code>
                    </td>
                    <td>{item.triggerName ?? "—"}</td>
                    <td>
                      {item.sessionPublicId ? (
                        <Link
                          to={`/sessions/${item.channel}/${encodeURIComponent(item.senderRef)}`}
                        >
                          <code>{item.sessionPublicId}</code>
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <OutcomePill outcome={item.outcome} />
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
