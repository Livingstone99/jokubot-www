import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api, type CreatedVerification, type Verification, type VerificationPurpose } from "../api.js";
import { useAuth } from "../auth.js";
import { localeTag } from "../i18n.js";
import { IconCopy, IconPlus, IconShieldCheck, IconTelegram, IconWhatsApp } from "../jk/icons.js";
import {
  Badge,
  ChannelMark,
  Choice,
  EmptyState,
  ErrorState,
  Fab,
  Field,
  Loading,
  Modal,
  PageTitle,
  StatCard,
  useToast,
  type BadgeTone,
} from "../jk/ui.js";
import type { MessageKey } from "../i18n.js";
import { useT } from "../locale.js";
import { hasChannelSetup } from "../ui.js";
import { WhatsAppNumberField } from "../WhatsAppNumberField.js";

const STATUS: Record<Verification["status"], { label: MessageKey; tone: BadgeTone }> = {
  verified: { label: "jk.ver.valid", tone: "solid" },
  pending: { label: "jk.ver.pending", tone: "outline" },
  expired: { label: "jk.ver.expired", tone: "muted" },
};

function clientOf(row: Verification): string {
  return row.identity?.phoneNumber || row.identity?.displayName || row.clientRef || "—";
}

function when(value: string) {
  return new Date(value).toLocaleString(localeTag(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function VerificationsPage() {
  const t = useT();
  const { me } = useAuth();
  const [items, setItems] = useState<Verification[] | null>(null);
  const [error, setError] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setItems(null);
    void api
      .verifications()
      .then((res) => setItems(res.items))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const all = items ?? [];
    return {
      total: all.length,
      pending: all.filter((v) => v.status === "pending").length,
      verified: all.filter((v) => v.status === "verified").length,
      expired: all.filter((v) => v.status === "expired").length,
    };
  }, [items]);

  const ready = hasChannelSetup(me?.tenant);

  return (
    <div className="jk-page">
      <PageTitle
        title={t("jk.nav.verify")}
        subtitle={t("jk.ver.subtitle")}
        actions={
          <button type="button" className="jk-btn is-primary is-hide-mobile" disabled={!ready} onClick={() => setIssuing(true)}>
            <IconPlus size={18} />
            {t("jk.ver.issue")}
          </button>
        }
      />

      {!ready ? (
        <div className="jk-notice">
          <IconShieldCheck size={20} />
          <p>{t("jk.ver.needChannel")}</p>
          <Link className="jk-btn is-secondary is-small" to="/channels">
            {t("jk.connectChannel")}
          </Link>
        </div>
      ) : null}

      {error ? (
        <ErrorState message={t("jk.ver.error")} onRetry={load} />
      ) : items === null ? (
        <Loading rows={2} height={110} />
      ) : (
        <>
          <div className="jk-grid-4">
            <StatCard icon={IconShieldCheck} label={t("jk.ver.total")} value={counts.total} />
            <StatCard icon={IconShieldCheck} label={t("jk.ver.pending")} value={counts.pending} />
            <StatCard icon={IconShieldCheck} label={t("jk.ver.validPlural")} value={counts.verified} />
            <StatCard icon={IconShieldCheck} label={t("jk.ver.expiredPlural")} value={counts.expired} />
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={IconShieldCheck}
              title={t("jk.ver.empty")}
              body={t("jk.ver.emptyBody")}
              action={
                ready ? (
                  <button type="button" className="jk-btn is-primary" onClick={() => setIssuing(true)}>
                    <IconPlus size={18} />
                    {t("jk.ver.issue")}
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="jk-table-wrap is-cards">
                <table className="jk-table">
                  <thead>
                    <tr>
                      <th scope="col">{t("jk.ver.client")}</th>
                      <th scope="col">{t("jk.ver.ref")}</th>
                      <th scope="col">{t("jk.ver.channel")}</th>
                      <th scope="col">{t("jk.ver.status")}</th>
                      <th scope="col">{t("jk.ver.date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.publicId}>
                        <td>
                          <strong>{clientOf(row)}</strong>
                          {row.purpose ? <span className="jk-cell-sub">{row.purpose}</span> : null}
                        </td>
                        <td className="jk-mono">{row.publicId.slice(-8)}</td>
                        <td>
                          <ChannelMark channel={row.channel} size={14} /> {row.channel === "telegram" ? "Telegram" : "WhatsApp"}
                        </td>
                        <td>
                          <Badge tone={STATUS[row.status].tone}>{t(STATUS[row.status].label)}</Badge>
                        </td>
                        <td>{when(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="jk-cards">
                {items.map((row) => (
                  <li key={row.publicId} className="jk-card jk-mini">
                    <div className="jk-mini-top">
                      <strong>{clientOf(row)}</strong>
                      <Badge tone={STATUS[row.status].tone}>{t(STATUS[row.status].label)}</Badge>
                    </div>
                    <span className="jk-row-sub">
                      <ChannelMark channel={row.channel} size={13} /> {row.channel === "telegram" ? "Telegram" : "WhatsApp"}
                      {row.purpose ? ` · ${row.purpose}` : ""}
                    </span>
                    <span className="jk-row-sub">
                      {t("jk.ver.ref")} <span className="jk-mono">{row.publicId.slice(-8)}</span> · {when(row.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <p className="jk-muted jk-small">
        {t("jk.ver.advancedHint")} <Link to="/verify/advanced">{t("jk.ver.advancedLink")}</Link>
      </p>

      {ready ? <Fab label={t("jk.ver.issue")} icon={IconPlus} onClick={() => setIssuing(true)} /> : null}
      <IssueCode open={issuing} onClose={() => setIssuing(false)} onIssued={load} />
    </div>
  );
}

/* ---------- Émettre un code ---------- */

function IssueCode({ open, onClose, onIssued }: { open: boolean; onClose: () => void; onIssued: () => void }) {
  const t = useT();
  const toast = useToast();
  const { me } = useAuth();
  const tenant = me?.tenant;
  const [channel, setChannel] = useState<"whatsapp" | "telegram">(tenant?.whatsappLinked || !tenant?.telegramLinked ? "whatsapp" : "telegram");
  const [phone, setPhone] = useState("");
  const [clientRef, setClientRef] = useState("");
  const [purposes, setPurposes] = useState<VerificationPurpose[]>([]);
  const [purpose, setPurpose] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedVerification | null>(null);

  useEffect(() => {
    if (!open) {
      setCreated(null);
      setError(null);
      return;
    }
    void api
      .purposes()
      .then((res) => {
        setPurposes(res.items);
        setPurpose((current) => current || res.items[0]?.slug || "");
      })
      .catch(() => setPurposes([]));
  }, [open]);

  async function onGenerate() {
    const ref = channel === "whatsapp" ? phone.trim() : clientRef.trim();
    if (channel === "whatsapp" && !ref) {
      setError(t("jk.ver.phoneRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.createVerification(channel, ref || undefined, undefined, purpose || undefined);
      setCreated(result);
      onIssued();
    } catch {
      setError(t("jk.ver.issueError"));
    } finally {
      setBusy(false);
    }
  }

  const minutes = created ? Math.max(1, Math.round((new Date(created.expiresAt).getTime() - Date.now()) / 60000)) : 0;

  return (
    <Modal
      open={open}
      title={created ? t("jk.ver.generated") : t("jk.ver.issue")}
      onClose={onClose}
      footer={
        created ? (
          <>
            <button
              type="button"
              className="jk-btn is-secondary"
              onClick={() => {
                void navigator.clipboard.writeText(created.messageToSend).then(() => toast({ text: t("jk.copied") }));
              }}
            >
              <IconCopy size={18} />
              {t("jk.ver.copyMessage")}
            </button>
            <button type="button" className="jk-btn is-primary" onClick={onClose}>
              {t("jk.done")}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="jk-btn is-secondary" onClick={onClose}>
              {t("jk.cancel")}
            </button>
            <button type="button" className="jk-btn is-primary" disabled={busy} onClick={() => void onGenerate()}>
              {busy ? t("jk.loading") : t("jk.ver.generate")}
            </button>
          </>
        )
      }
    >
      {created ? (
        <div className="jk-code-result">
          <p className="jk-code-big" aria-label={t("jk.ver.codeAria", { code: created.token })}>
            {created.token}
          </p>
          <p className="jk-muted">{t("jk.ver.sendIt")}</p>
          <p className="jk-badge is-outline">{t("jk.ver.expiresIn", { minutes })}</p>
          <blockquote className="jk-quote">{created.messageToSend}</blockquote>
          {created.qrSvg ? (
            <img
              className="jk-code-qr"
              src={`data:image/svg+xml;utf8,${encodeURIComponent(created.qrSvg)}`}
              alt={t("jk.ver.qrAlt")}
            />
          ) : null}
          {created.deepLink ? (
            <a className="jk-btn is-text" href={created.deepLink} target="_blank" rel="noreferrer">
              {t("jk.ver.openLink")}
            </a>
          ) : null}
        </div>
      ) : (
        <>
          <fieldset className="jk-choices">
            <legend className="jk-legend-small">{t("jk.ver.channel")}</legend>
            <div className="jk-grid-2 jk-tight">
              <Choice
                name="ver-channel"
                checked={channel === "whatsapp"}
                onSelect={() => setChannel("whatsapp")}
                icon={IconWhatsApp}
                title="WhatsApp"
                description={tenant?.whatsappLinked ? t("jk.ver.ready") : t("jk.ver.notReady")}
              />
              <Choice
                name="ver-channel"
                checked={channel === "telegram"}
                onSelect={() => setChannel("telegram")}
                icon={IconTelegram}
                title="Telegram"
                description={tenant?.telegramLinked ? t("jk.ver.ready") : t("jk.ver.notReady")}
              />
            </div>
          </fieldset>
          {channel === "whatsapp" ? (
            <WhatsAppNumberField value={phone} preferredCountry={tenant?.country} onChange={setPhone} label={t("jk.ver.clientPhone")} />
          ) : (
            <Field label={t("jk.ver.clientRef")} hint={t("jk.ver.clientRefHint")}>
              <input value={clientRef} placeholder={t("jk.ver.clientRefPh")} onChange={(event) => setClientRef(event.target.value)} />
            </Field>
          )}
          {purposes.length > 0 ? (
            <Field label={t("jk.ver.purpose")}>
              <select value={purpose} onChange={(event) => setPurpose(event.target.value)}>
                {purposes.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.title}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {error ? <p className="jk-inline-error">{error}</p> : null}
        </>
      )}
    </Modal>
  );
}
