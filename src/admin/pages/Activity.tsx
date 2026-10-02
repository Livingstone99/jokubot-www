import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, type InboundRow } from "../api.js";
import {
  ChannelBadge,
  EmptyState,
  OutcomePill,
  formatWhen,
} from "../ui.js";

export function ActivityPage() {
  const [items, setItems] = useState<InboundRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .inbound()
      .then((result) => setItems(result.items))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load activity.");
      });
  }, []);

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Activity</p>
          <h1>Inbound messages</h1>
          <p className="lede">
            Every message the gateway forwarded. Deduped by provider id, so a
            retry cannot burn a second session. Trigger matches show as
            Triggered.
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
            title="Nothing inbound yet"
            body="When a user sends a code or a trigger matches, it appears here with the outcome."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Received</th>
                  <th>Channel</th>
                  <th>Sender</th>
                  <th>Trigger</th>
                  <th>Session</th>
                  <th>Outcome</th>
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
