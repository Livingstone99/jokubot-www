import { type FormEvent, useEffect, useState } from "react";

import { api, type VerificationPurpose } from "../api.js";
import { useT } from "../locale.js";
import { EmptyState } from "../ui.js";

function slugFromTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function PurposesPage() {
  const t = useT();
  const [items, setItems] = useState<VerificationPurpose[] | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const result = await api.purposes();
    setItems(result.items);
  }

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : t("purposes.loadError"));
    });
  }, [t]);

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugFromTitle(value));
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createPurpose({
        title,
        slug: slug.trim() || undefined,
      });
      setTitle("");
      setSlug("");
      setSlugTouched(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("purposes.createError"));
    } finally {
      setBusy(false);
    }
  }

  async function onSaveTitle(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.updatePurpose(id, { title: editTitle });
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("purposes.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deletePurpose(id);
      setPendingDelete(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("purposes.deleteError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t("purposes.eyebrow")}</p>
          <h1>{t("purposes.title")}</h1>
          <p className="lede">{t("purposes.lede")}</p>
        </div>
      </header>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>{t("purposes.statusTitle")}</h2>
            <p className="hint">{t("purposes.statusHint")}</p>
          </div>
        </header>
        <pre>{`GET /v1/verifications/status?phone=+14155550123&purpose=authentication
Authorization: Bearer <api key>`}</pre>
      </article>

      <form className="panel" onSubmit={(event) => void onCreate(event)}>
        <header className="panel-head">
          <div>
            <h2>{t("purposes.newTitle")}</h2>
            <p className="hint">{t("purposes.newHint")}</p>
          </div>
        </header>
        <div className="row">
          <label>
            {t("purposes.fieldTitle")}
            <input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={t("purposes.titlePlaceholder")}
              maxLength={80}
              required
            />
          </label>
          <label>
            {t("purposes.fieldSlug")}
            <input
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value.toLowerCase());
              }}
              placeholder="change-password"
              maxLength={64}
              required
            />
            <span className="hint">{t("purposes.slugHint")}</span>
          </label>
        </div>
        {error ? (
          <p className="banner banner-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="panel-actions">
          <button type="submit" className="primary" disabled={busy || !title.trim()}>
            {busy ? t("purposes.saving") : t("purposes.create")}
          </button>
        </div>
      </form>

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>{t("purposes.listTitle")}</h2>
            <p className="hint">{t("purposes.listHint")}</p>
          </div>
        </header>
        {items === null ? (
          <div className="skeleton-table" aria-hidden="true" />
        ) : items.length === 0 ? (
          <EmptyState
            title={t("purposes.emptyTitle")}
            body={t("purposes.emptyBody")}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("purposes.colTitle")}</th>
                  <th>{t("purposes.colSlug")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {editingId === item.id ? (
                        <input
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                          maxLength={80}
                          autoFocus
                        />
                      ) : (
                        item.title
                      )}
                    </td>
                    <td>
                      <code>{item.slug}</code>
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <div className="row-actions">
                          <button
                            type="button"
                            className="primary compact"
                            disabled={busy || editTitle.trim().length < 2}
                            onClick={() => void onSaveTitle(item.id)}
                          >
                            {t("common.save")}
                          </button>
                          <button
                            type="button"
                            className="ghost compact"
                            onClick={() => setEditingId(null)}
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      ) : pendingDelete === item.id ? (
                        <div className="row-actions">
                          <button
                            type="button"
                            className="primary compact"
                            disabled={busy}
                            onClick={() => void onDelete(item.id)}
                          >
                            {t("purposes.confirmDelete")}
                          </button>
                          <button
                            type="button"
                            className="ghost compact"
                            onClick={() => setPendingDelete(null)}
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      ) : (
                        <div className="row-actions">
                          <button
                            type="button"
                            className="ghost compact"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditTitle(item.title);
                              setPendingDelete(null);
                            }}
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            type="button"
                            className="ghost compact danger-text"
                            onClick={() => {
                              setPendingDelete(item.id);
                              setEditingId(null);
                            }}
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      )}
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
