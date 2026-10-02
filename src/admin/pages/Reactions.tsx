import { type FormEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AgentAssist } from "../AgentAssist.js";
import {
  api,
  type FormulaReactionRule,
  type HttpChatValue,
  type HttpReactionBinding,
  type HttpReactionRequestParam,
  type LlmCatalog,
  type LlmProvider,
  type MediaJobCatalog,
  type Reaction,
  type ReactionInput,
  type ReactionKind,
} from "../api.js";
import { useT } from "../locale.js";
import { EmptyState, formatWhen } from "../ui.js";

type Draft = {
  name: string;
  kind: ReactionKind;
  fallback: string;
  url: string;
  timeoutMs: number;
  requestParams: HttpReactionRequestParam[];
  responseExample: string;
  bindings: HttpReactionBinding[];
  body: string;
  rules: FormulaReactionRule[];
  provider: LlmProvider;
  model: string;
  apiKey: string;
  hasApiKey: boolean;
  context: string;
  tokenLimit: number;
  replyAs: "text" | "voice";
  visionProvider: LlmProvider;
  visionModel: string;
  visionApiKey: string;
  hasVisionApiKey: boolean;
  sttProvider: LlmProvider;
  sttModel: string;
  sttApiKey: string;
  hasSttApiKey: boolean;
  ttsProvider: LlmProvider;
  ttsModel: string;
  ttsApiKey: string;
  hasTtsApiKey: boolean;
};

const MAX_HTTP_BINDINGS = 12;
const MAX_HTTP_REQUEST_PARAMS = 8;

const CHAT_VALUE_OPTIONS: Array<{ value: HttpChatValue; label: string }> = [
  { value: "name", label: "Sender name" },
  { value: "number", label: "Phone number" },
  { value: "text", label: "Message text" },
  { value: "channel", label: "Channel" },
  { value: "sender", label: "Sender id" },
  { value: "timestamp", label: "Received at" },
];

const FALLBACK_CATALOG: LlmCatalog = {
  defaultProvider: "jokubot",
  defaultModel: "jokubot",
  systemDeepseek: false,
  systemJokubot: false,
  providers: [
    {
      id: "jokubot",
      label: "jokubot",
      customModel: false,
      models: [{ id: "jokubot", label: "jokubot" }],
    },
  ],
  media: {
    vision: {
      defaultProvider: "jokubot",
      defaultModel: "jokubot",
      systemReady: false,
      providers: [
        {
          id: "jokubot",
          label: "jokubot",
          customModel: false,
          models: [{ id: "jokubot", label: "jokubot" }],
        },
      ],
    },
    stt: {
      defaultProvider: "jokubot",
      defaultModel: "jokubot",
      systemReady: true,
      providers: [
        {
          id: "jokubot",
          label: "jokubot",
          customModel: false,
          models: [{ id: "jokubot", label: "jokubot" }],
        },
      ],
    },
    tts: {
      defaultProvider: "jokubot",
      defaultModel: "en-US-AndrewMultilingualNeural",
      systemReady: true,
      choiceLabel: "Voice",
      providers: [
        {
          id: "jokubot",
          label: "jokubot",
          customModel: false,
          models: [
            { id: "en-US-AndrewMultilingualNeural", label: "English (Andrew)" },
            { id: "fr-FR-HenriNeural", label: "French (Henri)" },
            { id: "es-ES-AlvaroNeural", label: "Spanish (Álvaro)" },
            { id: "de-DE-ConradNeural", label: "German (Conrad)" },
            { id: "pt-BR-AntonioNeural", label: "Portuguese (Antônio)" },
            { id: "it-IT-DiegoNeural", label: "Italian (Diego)" },
            { id: "nl-NL-MaartenNeural", label: "Dutch (Maarten)" },
            { id: "ar-SA-HamedNeural", label: "Arabic (Hamed)" },
          ],
        },
      ],
    },
  },
};

const emptyDraft = (): Draft => ({
  name: "Customer support",
  kind: "agent",
  fallback: "Thanks, we received your message.",
  url: "",
  timeoutMs: 2000,
  requestParams: [],
  responseExample: "",
  bindings: [],
  body: "Hi {{name}}, we received your message.",
  rules: [],
  provider: "jokubot",
  model: "jokubot",
  apiKey: "",
  hasApiKey: false,
  context: "",
  tokenLimit: 512,
  replyAs: "text",
  visionProvider: "jokubot",
  visionModel: "jokubot",
  visionApiKey: "",
  hasVisionApiKey: false,
  sttProvider: "jokubot",
  sttModel: "jokubot",
  sttApiKey: "",
  hasSttApiKey: false,
  ttsProvider: "jokubot",
  ttsModel: "en-US-AndrewMultilingualNeural",
  ttsApiKey: "",
  hasTtsApiKey: false,
});

function draftFrom(reaction: Reaction): Draft {
  let bindings = reaction.config.bindings ?? [];
  let body = reaction.config.body ?? "";
  if (
    reaction.kind === "http" &&
    !body &&
    !bindings.length &&
    reaction.config.responsePath
  ) {
    const path = reaction.config.responsePath;
    const name = pathToName(path);
    bindings = [{ name, path }];
    body = `{{${name}}}`;
  }
  return {
    name: reaction.name,
    kind: reaction.kind,
    fallback: reaction.config.fallback ?? "",
    url: reaction.config.url ?? "",
    timeoutMs: reaction.config.timeoutMs ?? 2000,
    requestParams: reaction.config.requestParams ?? [],
    responseExample: reaction.config.responseExample ?? "",
    bindings,
    body,
    rules: reaction.config.rules ?? [],
    provider: reaction.config.provider ?? "jokubot",
    model: reaction.config.model ?? "jokubot",
    apiKey: "",
    hasApiKey: Boolean(reaction.config.hasApiKey),
    context: reaction.config.context ?? "",
    tokenLimit: reaction.config.tokenLimit ?? 512,
    replyAs: reaction.config.replyAs === "voice" ? "voice" : "text",
    visionProvider: reaction.config.visionProvider ?? "jokubot",
    visionModel: reaction.config.visionModel ?? "jokubot",
    visionApiKey: "",
    hasVisionApiKey: Boolean(reaction.config.hasVisionApiKey),
    sttProvider: reaction.config.sttProvider ?? "jokubot",
    sttModel: reaction.config.sttModel ?? "jokubot",
    sttApiKey: "",
    hasSttApiKey: Boolean(reaction.config.hasSttApiKey),
    ttsProvider: reaction.config.ttsProvider ?? "jokubot",
    ttsModel:
      reaction.config.ttsModel && reaction.config.ttsModel !== "jokubot"
        ? reaction.config.ttsModel
        : "en-US-AndrewMultilingualNeural",
    ttsApiKey: "",
    hasTtsApiKey: Boolean(reaction.config.hasTtsApiKey),
  };
}

function toInput(draft: Draft): ReactionInput {
  if (draft.kind === "http") {
    return {
      name: draft.name,
      kind: "http",
      config: {
        fallback: draft.fallback,
        url: draft.url,
        timeoutMs: draft.timeoutMs,
        body: draft.body,
        requestParams: draft.requestParams.filter((row) => row.key.trim()),
        bindings: draft.bindings.filter(
          (row) => row.name.trim() || row.path.trim(),
        ),
        ...(draft.responseExample.trim()
          ? { responseExample: draft.responseExample }
          : {}),
      },
    };
  }
  if (draft.kind === "agent") {
    return {
      name: draft.name,
      kind: "agent",
      config: {
        fallback: draft.fallback,
        provider: draft.provider,
        model: draft.model,
        context: draft.context,
        tokenLimit: draft.tokenLimit,
        replyAs: draft.replyAs,
        visionProvider: draft.visionProvider,
        visionModel: draft.visionModel,
        ...(draft.apiKey.trim() ? { apiKey: draft.apiKey.trim() } : {}),
        ...(draft.visionApiKey.trim() ? { visionApiKey: draft.visionApiKey.trim() } : {}),
        sttProvider: draft.sttProvider,
        sttModel: draft.sttModel,
        ...(draft.sttApiKey.trim() ? { sttApiKey: draft.sttApiKey.trim() } : {}),
        ttsProvider: draft.ttsProvider,
        ttsModel: draft.ttsModel,
        ...(draft.ttsApiKey.trim() ? { ttsApiKey: draft.ttsApiKey.trim() } : {}),
      },
    };
  }
  return {
    name: draft.name,
    kind: "formula",
    config: {
      fallback: draft.fallback,
      body: draft.body,
      rules: draft.rules.filter((rule) => rule.value.trim() && rule.body.trim()),
    },
  };
}

export function ReactionsPage() {
  const t = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Reaction[] | null>(null);
  const [catalog, setCatalog] = useState<LlmCatalog>(FALLBACK_CATALOG);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const [assistId, setAssistId] = useState<string | null>(null);

  async function refresh() {
    const result = await api.reactions();
    setItems(result.items);
    try {
      setCatalog(await api.llm());
    } catch {
      // Keep the fallback catalog if the model list cannot load.
    }
  }

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load reactions.");
    });
  }, []);

  function startCreate() {
    lastFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditingId(null);
    setDraft(emptyDraft());
    setOpen(true);
    setConfirmDeleteId(null);
    setError(null);
  }

  useEffect(() => {
    if (searchParams.get("new") !== "1") {
      return;
    }
    startCreate();
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  function startEdit(reaction: Reaction) {
    lastFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditingId(reaction.id);
    setDraft(draftFrom(reaction));
    setOpen(true);
    setConfirmDeleteId(null);
    setError(null);
  }

  function closeForm() {
    setOpen(false);
    setEditingId(null);
    lastFocus.current?.focus();
    lastFocus.current = null;
  }

  function onOverlayMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeForm();
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      formRef.current
        ?.querySelector<HTMLInputElement>("input:not([type=checkbox])")
        ?.focus();
    });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeForm();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        await api.updateReaction(editingId, toInput(draft));
      } else {
        await api.createReaction(toInput(draft));
      }
      closeForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save reaction.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(reaction: Reaction) {
    setError(null);
    try {
      await api.deleteReaction(reaction.id);
      if (editingId === reaction.id) {
        closeForm();
      }
      setConfirmDeleteId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete reaction.");
    }
  }

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Reactions</p>
          <h1>How a reply is produced</h1>
          <p className="lede">
            A formula matches the inbound text. An HTTP request reads JSON from a
            URL. A chat agent replies from a model. A reply trigger can use one
            of these instead of a static message.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="primary" onClick={startCreate}>
            New reaction
          </button>
        </div>
      </header>

      {error && !open ? (
        <p className="banner banner-danger" role="alert">
          {error}
        </p>
      ) : null}

      {open ? (
        <div className="overlay" onMouseDown={onOverlayMouseDown}>
          <form
            ref={formRef}
            className="panel stack overlay-card overlay-card-reaction"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reaction-form-title"
            onSubmit={(event) => void onSubmit(event)}
          >
            <header className="panel-head">
              <div>
                <h2 id="reaction-form-title">
                  {editingId ? "Edit reaction" : "New reaction"}
                </h2>
                <p className="hint">
                  Attach this from a trigger whose action is Send a reply.
                </p>
              </div>
            </header>
            <div className="stack overlay-card-body">
              {error ? (
                <p className="banner banner-danger" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="row">
                <label>
                  Name
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Customer support"
                    required
                  />
                </label>
                <label>
                  Type
                  <select
                    value={draft.kind}
                    onChange={(event) =>
                      setDraft((current) =>
                        applyKind(current, event.target.value as ReactionKind, catalog),
                      )
                    }
                  >
                    <option value="agent">Chat agent</option>
                    <option value="formula">Formula</option>
                    <option value="http">HTTP request</option>
                  </select>
                </label>
              </div>

              {draft.kind === "http" ? (
                <HttpReactionFields draft={draft} onChange={setDraft} />
              ) : draft.kind === "agent" ? (
                <AgentReactionFields
                  draft={draft}
                  catalog={catalog}
                  onChange={setDraft}
                />
              ) : (
                <section className="trigger-section">
                  <h3>Formula</h3>
                  <label>
                    Default message
                    <textarea
                      value={draft.body}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, body: event.target.value }))
                      }
                      placeholder="Hi {{name}}, we received your message."
                    />
                    <span className="hint">
                      Used when no rule matches. {"{{name}}"}, {"{{text}}"}, and{" "}
                      {"{{channel}}"} are replaced.
                    </span>
                  </label>
                  <div className="reaction-rules">
                    {draft.rules.map((rule, index) => (
                      <div key={index} className="reaction-rule">
                        <label>
                          When the message
                          <select
                            value={rule.match}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                rules: current.rules.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        match: event.target.value as FormulaReactionRule["match"],
                                      }
                                    : item,
                                ),
                              }))
                            }
                          >
                            <option value="contains">contains</option>
                            <option value="equals">equals</option>
                          </select>
                        </label>
                        <label>
                          Value
                          <input
                            value={rule.value}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                rules: current.rules.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, value: event.target.value }
                                    : item,
                                ),
                              }))
                            }
                            placeholder="hours"
                          />
                        </label>
                        <label>
                          Send
                          <input
                            value={rule.body}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                rules: current.rules.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, body: event.target.value }
                                    : item,
                                ),
                              }))
                            }
                            placeholder="Open 9–17."
                          />
                        </label>
                        <button
                          type="button"
                          className="ghost compact"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              rules: current.rules.filter((_, itemIndex) => itemIndex !== index),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {draft.rules.length < 8 ? (
                      <button
                        type="button"
                        className="secondary compact"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            rules: [
                              ...current.rules,
                              { match: "contains", value: "", body: "" },
                            ],
                          }))
                        }
                      >
                        Add rule
                      </button>
                    ) : null}
                  </div>
                </section>
              )}

              <label>
                Fallback
                <textarea
                  value={draft.fallback}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, fallback: event.target.value }))
                  }
                  placeholder="Thanks, we received your message."
                  required
                />
                <span className="hint">
                  {draft.kind === "http"
                    ? "Sent when a JSON variable is missing, or the request fails, times out, or is over capacity."
                    : draft.kind === "agent"
                      ? "Sent when the model returns nothing, times out, or the request fails."
                      : "Sent when the formula has no text."}
                </span>
              </label>
            </div>
            <div className="trigger-actions overlay-card-foot">
              <button type="submit" className="primary" disabled={busy}>
                {busy ? "Saving…" : editingId ? "Save reaction" : "Create reaction"}
              </button>
              <button type="button" className="secondary" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <article className="panel">
        <header className="panel-head">
          <div>
            <h2>Saved reactions</h2>
            <p className="hint">
              Editing a reaction changes every trigger that uses it.
            </p>
          </div>
        </header>
        {items === null ? (
          <div className="skeleton-table" aria-hidden="true" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No reactions yet"
            body="Create a formula, HTTP request, or chat agent, then pick it on a reply trigger."
            action={
              <button type="button" className="primary compact" onClick={startCreate}>
                New reaction
              </button>
            }
          />
        ) : (
          <div className="reaction-list">
            {items.map((item) => (
              <article key={item.id} className="trigger-card">
                <div className="trigger-card-top reaction-card-top">
                  <div className="trigger-card-copy">
                    <strong>{item.name}</strong>
                    <p className="trigger-summary">{summarize(item)}</p>
                    <p className="trigger-hits">
                      {usedByLabel(item)}
                      {item.updatedAt ? ` · updated ${formatWhen(item.updatedAt)}` : ""}
                    </p>
                  </div>
                  <div className="trigger-actions">
                    <button
                      type="button"
                      className="secondary compact"
                      onClick={() => setAssistId((current) => (current === item.id ? null : item.id))}
                    >
                      {t("assist.rowOpen")}
                    </button>
                    <button
                      type="button"
                      className="secondary compact"
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </button>
                    {confirmDeleteId === item.id ? (
                      <>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="primary compact"
                          onClick={() => void onDelete(item)}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="secondary compact"
                        onClick={() => setConfirmDeleteId(item.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                  {assistId === item.id ? (
                    <div className="trigger-assist">
                      <AgentAssist
                        variant="compact"
                        focus={{ reactionId: item.id }}
                        onClose={() => setAssistId(null)}
                        onApplied={() => void refresh()}
                      />
                    </div>
                  ) : null}
              </article>
            ))}
          </div>
        )}
      </article>

      <p className="hint">
        Attach a reaction from <Link to="/triggers">Triggers</Link> when the
        action is Send a reply.
      </p>
    </section>
  );
}

function applyKind(
  current: Draft,
  kind: ReactionKind,
  catalog: LlmCatalog,
): Draft {
  if (kind !== "agent") {
    return { ...current, kind };
  }
  const provider = catalog.defaultProvider;
  const models = catalog.providers.find((row) => row.id === provider)?.models ?? [];
  const model = models[0]?.id ?? catalog.defaultModel;
  return {
    ...current,
    kind,
    provider,
    model,
    tokenLimit: current.tokenLimit || 512,
  };
}

function AgentReactionFields({
  draft,
  catalog,
  onChange,
}: {
  draft: Draft;
  catalog: LlmCatalog;
  onChange: (update: Draft | ((current: Draft) => Draft)) => void;
}) {
  const provider =
    catalog.providers.find((row) => row.id === draft.provider) ??
    catalog.providers[0];
  const models = provider?.models ?? [];
  const knownModel = models.some((row) => row.id === draft.model);
  const customModel = Boolean(provider?.customModel) || !knownModel;
  const isJokubot = draft.provider === "jokubot";
  const usesSystemKey =
    (isJokubot && catalog.systemJokubot) ||
    (draft.provider === "deepseek" && catalog.systemDeepseek && !draft.hasApiKey);

  function setProvider(next: LlmProvider) {
    const found = catalog.providers.find((row) => row.id === next);
    onChange((current) => ({
      ...current,
      provider: next,
      model: found?.models[0]?.id ?? current.model,
      ...(next === "jokubot" ? { apiKey: "" } : {}),
    }));
  }

  return (
    <>
    <section className="trigger-section">
      <h3>Chat agent</h3>
      <div className="row">
        <label>
          Provider
          <select
            value={draft.provider}
            onChange={(event) => setProvider(event.target.value as LlmProvider)}
          >
            {catalog.providers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        {isJokubot ? null : (
          <label>
            Model
            {customModel ? (
              <input
                value={draft.model}
                list="reaction-llm-models"
                onChange={(event) =>
                  onChange((current) => ({ ...current, model: event.target.value }))
                }
                placeholder={models[0]?.id ?? "provider/model"}
                required
              />
            ) : (
              <select
                value={draft.model}
                onChange={(event) =>
                  onChange((current) => ({ ...current, model: event.target.value }))
                }
              >
                {models.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}
      </div>
      {customModel && models.length > 0 ? (
        <datalist id="reaction-llm-models">
          {models.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </datalist>
      ) : null}
      {isJokubot ? (
        <p className="hint">
          {catalog.systemJokubot
            ? "Platform bot. No key needed."
            : "jokubot is not configured on this server. Choose another provider and paste a key."}
        </p>
      ) : (
        <label>
          API key
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={draft.apiKey}
            onChange={(event) =>
              onChange((current) => ({ ...current, apiKey: event.target.value }))
            }
            placeholder={
              draft.hasApiKey
                ? "Key stored. Leave blank to keep it."
                : usesSystemKey
                  ? "Leave blank to use the platform DeepSeek key."
                  : "Paste the provider key"
            }
            required={!usesSystemKey && !draft.hasApiKey}
          />
          <span className="hint">
            {usesSystemKey
              ? "DeepSeek uses the platform key unless you paste your own."
              : draft.hasApiKey
                ? "A key is stored. Paste a new one only to replace it."
                : "Stored on this reaction and never shown again."}
          </span>
        </label>
      )}
      <label>
        Token limit
        <input
          type="number"
          min={64}
          max={4096}
          step={64}
          value={draft.tokenLimit}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              tokenLimit: Number(event.target.value) || 512,
            }))
          }
          required
        />
        <span className="hint">
          Caps how long the model can write. The sent reply is still limited to
          1000 characters.
        </span>
      </label>
      <label>
        Context
        <textarea
          className="reaction-context"
          value={draft.context}
          onChange={(event) =>
            onChange((current) => ({ ...current, context: event.target.value }))
          }
          placeholder={
            "You reply to inbound customer messages for this business.\n\nKeep answers short and specific."
          }
          required
        />
        <span className="hint">
          Markdown instructions for the model. {"{{name}}"}, {"{{text}}"}, and{" "}
          {"{{channel}}"} are replaced. A trigger test calls this model.
        </span>
      </label>
    </section>
    <MediaReactionFields draft={draft} catalog={catalog} onChange={onChange} />
    </>
  );
}

function MediaReactionFields({
  draft,
  catalog,
  onChange,
}: {
  draft: Draft;
  catalog: LlmCatalog;
  onChange: (update: Draft | ((current: Draft) => Draft)) => void;
}) {
  const media = catalog.media ?? FALLBACK_CATALOG.media;
  return (
    <section className="trigger-section">
      <h3>Photos, voice, and files</h3>
      <label>
        Reply as
        <select
          value={draft.replyAs}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              replyAs: event.target.value as "text" | "voice",
            }))
          }
        >
          <option value="text">Text message</option>
          <option value="voice">Voice note</option>
        </select>
        <span className="hint">
          Photos and files are sent to the model when it can read them. Voice
          notes are transcribed first. Voice replies use the selected voice.
        </span>
      </label>
      <MediaJobFields
        label="Vision"
        job={media.vision}
        provider={draft.visionProvider}
        model={draft.visionModel}
        apiKey={draft.visionApiKey}
        hasApiKey={draft.hasVisionApiKey}
        onProvider={(value) =>
          onChange((current) => ({
            ...current,
            visionProvider: value,
            visionModel:
              media.vision.providers.find((row) => row.id === value)?.models[0]
                ?.id ?? current.visionModel,
            ...(value === "jokubot" ? { visionApiKey: "" } : {}),
          }))
        }
        onModel={(value) =>
          onChange((current) => ({ ...current, visionModel: value }))
        }
        onKey={(value) =>
          onChange((current) => ({ ...current, visionApiKey: value }))
        }
      />
      <MediaJobFields
        label="Speech to text"
        job={media.stt}
        provider={draft.sttProvider}
        model={draft.sttModel}
        apiKey={draft.sttApiKey}
        hasApiKey={draft.hasSttApiKey}
        onProvider={(value) =>
          onChange((current) => ({
            ...current,
            sttProvider: value,
            sttModel:
              media.stt.providers.find((row) => row.id === value)?.models[0]
                ?.id ?? current.sttModel,
            ...(value === "jokubot" ? { sttApiKey: "" } : {}),
          }))
        }
        onModel={(value) =>
          onChange((current) => ({ ...current, sttModel: value }))
        }
        onKey={(value) =>
          onChange((current) => ({ ...current, sttApiKey: value }))
        }
      />
      <MediaJobFields
        label="Voice"
        job={media.tts}
        provider={draft.ttsProvider}
        model={draft.ttsModel}
        apiKey={draft.ttsApiKey}
        hasApiKey={draft.hasTtsApiKey}
        onProvider={(value) =>
          onChange((current) => ({
            ...current,
            ttsProvider: value,
            ttsModel:
              media.tts.providers.find((row) => row.id === value)?.models[0]
                ?.id ?? current.ttsModel,
            ...(value === "jokubot" ? { ttsApiKey: "" } : {}),
          }))
        }
        onModel={(value) =>
          onChange((current) => ({ ...current, ttsModel: value }))
        }
        onKey={(value) =>
          onChange((current) => ({ ...current, ttsApiKey: value }))
        }
      />
    </section>
  );
}

function MediaJobFields({
  label,
  job,
  provider,
  model,
  apiKey,
  hasApiKey,
  onProvider,
  onModel,
  onKey,
}: {
  label: string;
  job: MediaJobCatalog;
  provider: LlmProvider;
  model: string;
  apiKey: string;
  hasApiKey: boolean;
  onProvider: (value: LlmProvider) => void;
  onModel: (value: string) => void;
  onKey: (value: string) => void;
}) {
  const found = job.providers.find((row) => row.id === provider) ?? job.providers[0];
  const models = found?.models ?? [];
  const isJokubot = provider === "jokubot";
  const known = models.some((row) => row.id === model);
  const custom = Boolean(found?.customModel) || !known;
  const choiceLabel = job.choiceLabel ?? "Model";
  const showChoice = !isJokubot || models.length > 1;
  return (
    <div className="media-job">
      <div className="row">
        <label>
          {label}
          <select
            value={provider}
            onChange={(event) => onProvider(event.target.value as LlmProvider)}
          >
            {job.providers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        {showChoice ? (
          <label>
            {choiceLabel}
            {custom ? (
              <input
                value={model}
                onChange={(event) => onModel(event.target.value)}
                placeholder={models[0]?.id ?? "model"}
              />
            ) : (
              <select
                value={model}
                onChange={(event) => onModel(event.target.value)}
              >
                {models.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
            )}
          </label>
        ) : null}
      </div>
      {isJokubot ? (
        <p className="hint">
          {job.systemReady
            ? "Platform default. No key needed."
            : "Not configured on this server. Choose another provider and paste a key."}
        </p>
      ) : (
        <label>
          API key
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(event) => onKey(event.target.value)}
            placeholder={
              hasApiKey
                ? "Key stored. Leave blank to keep it."
                : "Paste the provider key"
            }
          />
        </label>
      )}
    </div>
  );
}

function HttpReactionFields({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (update: Draft | ((current: Draft) => Draft)) => void;
}) {
  const parsed = useMemo(
    () => parseExample(draft.responseExample),
    [draft.responseExample],
  );
  const preview = previewHttpReply(draft, parsed);
  const requestPreview = previewHttpRequest(draft);
  const jsonPaths = parsed.ok ? parsed.paths : [];
  const definedVars = draft.bindings
    .map((row) => row.name.trim())
    .filter(Boolean);

  function setBinding(index: number, patch: Partial<HttpReactionBinding>) {
    onChange((current) => ({
      ...current,
      bindings: current.bindings.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    }));
  }

  function setRequestParam(
    index: number,
    patch: Partial<HttpReactionRequestParam>,
  ) {
    onChange((current) => ({
      ...current,
      requestParams: current.requestParams.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    }));
  }

  return (
    <>
      <section className="trigger-section">
        <h3>Request</h3>
        <label>
          URL
          <input
            value={draft.url}
            onChange={(event) =>
              onChange((current) => ({ ...current, url: event.target.value }))
            }
            placeholder="https://your-app.example/hours"
            required
          />
          <span className="hint">
            POST to this URL. Query keys below are appended. If a webhook secret
            is stored, the body is signed the same way as the completion
            webhook.
          </span>
        </label>
        <label>
          Timeout
          <select
            value={String(draft.timeoutMs)}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                timeoutMs: Number(event.target.value),
              }))
            }
          >
            <option value="1000">1 second</option>
            <option value="2000">2 seconds</option>
          </select>
        </label>
        <div className="reaction-rules">
          <p className="hint">
            Pass values from this chat as a URL query key or a JSON body key.
          </p>
          {draft.requestParams.map((row, index) => (
            <div key={index} className="reaction-param">
              <label>
                Key
                <input
                  value={row.key}
                  onChange={(event) =>
                    setRequestParam(index, { key: event.target.value })
                  }
                  placeholder="phone"
                />
              </label>
              <label>
                From chat
                <select
                  value={row.from}
                  onChange={(event) =>
                    setRequestParam(index, {
                      from: event.target.value as HttpChatValue,
                    })
                  }
                >
                  {CHAT_VALUE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Put in
                <select
                  value={row.in}
                  onChange={(event) =>
                    setRequestParam(index, {
                      in: event.target.value as HttpReactionRequestParam["in"],
                    })
                  }
                >
                  <option value="query">URL query</option>
                  <option value="body">JSON body</option>
                </select>
              </label>
              <button
                type="button"
                className="ghost compact"
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    requestParams: current.requestParams.filter(
                      (_, rowIndex) => rowIndex !== index,
                    ),
                  }))
                }
              >
                Remove
              </button>
            </div>
          ))}
          {draft.requestParams.length < MAX_HTTP_REQUEST_PARAMS ? (
            <button
              type="button"
              className="secondary compact"
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  requestParams: [
                    ...current.requestParams,
                    { key: "", from: "name", in: "query" },
                  ],
                }))
              }
            >
              Add param
            </button>
          ) : null}
        </div>
        {requestPreview ? (
          <div className="reaction-request-preview">
            <p className="hint">This chat would send:</p>
            <pre className="reaction-code">{requestPreview}</pre>
          </div>
        ) : null}
      </section>

      <section className="trigger-section">
        <h3>JSON to expect</h3>
        <label>
          Body
          <textarea
            className="reaction-json"
            value={draft.responseExample}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                responseExample: event.target.value,
              }))
            }
            placeholder={'{\n  "store": {\n    "open": "09:00",\n    "close": "17:00"\n  }\n}'}
            spellCheck={false}
          />
          <span className="hint">
            {exampleHint(draft.responseExample, parsed)}
          </span>
        </label>
      </section>

      <section className="trigger-section">
        <h3>Variables</h3>
        <p className="hint">
          Name a value for the reply, then point it at a field in the JSON
          above. Nested fields use dots, such as store.open. Missing values
          send the fallback.
        </p>
        <div className="reaction-rules">
          {draft.bindings.map((row, index) => {
            const sample =
              parsed.ok && row.path.trim()
                ? scalarAtPath(parsed.value, row.path.trim())
                : null;
            return (
            <div key={index} className="reaction-bind">
              <label className="reaction-bind-name">
                <span>Variable</span>
                <input
                  value={row.name}
                  onChange={(event) =>
                    setBinding(index, { name: event.target.value })
                  }
                  placeholder="hours"
                />
              </label>
              <label className="reaction-bind-path">
                <span>From JSON</span>
                <input
                  value={row.path}
                  list="reaction-json-paths"
                  onChange={(event) =>
                    setBinding(index, { path: event.target.value })
                  }
                  placeholder="store.open"
                />
                <span className="hint reaction-bind-hint">
                  {row.path.trim()
                    ? sample !== null
                      ? sample
                      : parsed.ok
                        ? "Not in this JSON."
                        : "Dotted path into the body."
                    : jsonPaths.length > 0
                      ? "Pick a field or type a dotted path."
                      : "Dotted path into the body, such as store.open."}
                </span>
              </label>
              <button
                type="button"
                className="ghost compact reaction-bind-remove"
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    bindings: current.bindings.filter(
                      (_, rowIndex) => rowIndex !== index,
                    ),
                  }))
                }
              >
                Remove
              </button>
            </div>
            );
          })}
          {draft.bindings.length < MAX_HTTP_BINDINGS ? (
            <button
              type="button"
              className="secondary compact"
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  bindings: [...current.bindings, { name: "", path: "" }],
                }))
              }
            >
              Add variable
            </button>
          ) : null}
        </div>
        {jsonPaths.length > 0 ? (
          <datalist id="reaction-json-paths">
            {jsonPaths.map((path) => (
              <option key={path} value={path} />
            ))}
          </datalist>
        ) : null}
      </section>

      <section className="trigger-section">
        <h3>Reply</h3>
        <label>
          Message
          <textarea
            value={draft.body}
            onChange={(event) =>
              onChange((current) => ({ ...current, body: event.target.value }))
            }
            placeholder="Hi {{name}}, we are open {{hours}}–{{close}}."
            required
          />
          <span className="hint">
            From this chat: {"{{name}}"}, {"{{number}}"}, {"{{text}}"},{" "}
            {"{{channel}}"}, {"{{timestamp}}"}.
            {definedVars.length > 0
              ? ` From the JSON: ${definedVars.map((name) => `{{${name}}}`).join(", ")}.`
              : " Add variables above to insert JSON values."}
          </span>
        </label>
        {preview ? (
          <div className="reaction-reply-preview">
            <p className="hint">With the JSON above, this reply reads:</p>
            <div className="session-bubble is-out">
              <p>{preview}</p>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

function summarize(reaction: Reaction): string {
  if (reaction.kind === "agent") {
    const provider = reaction.config.provider ?? "jokubot";
    if (provider === "jokubot") {
      return "Chat agent · jokubot";
    }
    const model = reaction.config.model ?? "deepseek-flash";
    const key =
      reaction.config.hasApiKey || provider !== "deepseek"
        ? "own key"
        : "platform key";
    return `Chat agent · ${providerLabel(provider)} · ${model} · ${key}`;
  }
  if (reaction.kind === "http") {
    const host = hostOf(reaction.config.url);
    const fields = reaction.config.bindings?.length
      ? reaction.config.bindings.length
      : reaction.config.responsePath
        ? 1
        : 0;
    const params = reaction.config.requestParams?.length ?? 0;
    const bits: string[] = ["HTTP"];
    if (params > 0) {
      bits.push(`${params} param${params === 1 ? "" : "s"}`);
    }
    if (fields > 0) {
      bits.push(`${fields} variable${fields === 1 ? "" : "s"}`);
    }
    if (host) {
      bits.push(fields > 0 ? `from ${host}` : `to ${host}`);
    }
    return bits.join(" · ");
  }
  const rules = reaction.config.rules?.length ?? 0;
  if (rules === 0) {
    return "Formula · default message";
  }
  return `Formula · ${rules} rule${rules === 1 ? "" : "s"}`;
}

function providerLabel(provider: LlmProvider): string {
  switch (provider) {
    case "jokubot":
      return "jokubot";
    case "deepseek":
      return "DeepSeek";
    case "gpt":
      return "GPT";
    case "claude":
      return "Claude";
    case "grok":
      return "Grok";
    case "kimi":
      return "Kimi";
    case "openrouter":
      return "OpenRouter";
  }
}

function usedByLabel(reaction: Reaction): string {
  if (!reaction.usedBy) {
    return "Not used by a trigger";
  }
  return reaction.usedBy === 1
    ? "Used by 1 trigger"
    : `Used by ${reaction.usedBy} triggers`;
}

function hostOf(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

type ParsedExample =
  | { ok: true; value: unknown; paths: string[] }
  | { ok: false; empty: boolean };

function parseExample(raw: string): ParsedExample {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, empty: true };
  }
  try {
    const value: unknown = JSON.parse(trimmed);
    return { ok: true, value, paths: leafPaths(value).slice(0, 48) };
  } catch {
    return { ok: false, empty: false };
  }
}

function exampleHint(raw: string, parsed: ParsedExample): string {
  if (!raw.trim()) {
    return "Paste the JSON this URL returns. Nested fields are fine; point variables at them with dots, such as store.open.";
  }
  if (!parsed.ok) {
    return "This is not valid JSON yet.";
  }
  if (parsed.paths.length === 0) {
    return "No scalar fields found. Type a dotted path on the variable, such as store.open or slots.0.start.";
  }
  return `${parsed.paths.length} field${parsed.paths.length === 1 ? "" : "s"} in this body, including nested ones. Point variables at them below.`;
}

function leafPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.slice(0, 8).flatMap((item, index) => {
      const path = prefix ? `${prefix}.${index}` : String(index);
      return leafPaths(item, path);
    });
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return prefix ? [prefix] : [];
    }
    return entries.flatMap(([key, nested]) => {
      if (!/^[\w]+$/u.test(key)) {
        return [];
      }
      const path = prefix ? `${prefix}.${key}` : key;
      return leafPaths(nested, path);
    });
  }
  return prefix ? [prefix] : [];
}

function pathToName(path: string): string {
  const last = path.split(".").filter(Boolean).pop() ?? "value";
  const cleaned = last.replace(/[^\w]/g, "") || "value";
  if (/^[A-Za-z]/.test(cleaned)) {
    return cleaned.slice(0, 32);
  }
  return `v_${cleaned}`.slice(0, 32);
}

const SAMPLE_CHAT: Record<HttpChatValue, string> = {
  name: "there",
  text: "hours",
  channel: "whatsapp",
  number: "15551234567",
  sender: "15551234567",
  timestamp: "2026-09-08T12:00:00.000Z",
};

function previewHttpRequest(draft: Draft): string | null {
  const rawUrl = draft.url.trim();
  if (!rawUrl) {
    return null;
  }
  const params = draft.requestParams.filter((row) => row.key.trim());
  let url = rawUrl;
  try {
    const parsed = new URL(rawUrl);
    for (const row of params.filter((item) => item.in === "query")) {
      parsed.searchParams.set(row.key.trim(), SAMPLE_CHAT[row.from]);
    }
    url = parsed.toString();
  } catch {
    // Keep the typed URL if it is not parseable yet.
  }
  const bodyParams = params.filter((row) => row.in === "body");
  const payload =
    bodyParams.length > 0
      ? Object.fromEntries(
          bodyParams.map((row) => [row.key.trim(), SAMPLE_CHAT[row.from]]),
        )
      : {
          text: SAMPLE_CHAT.text,
          name: SAMPLE_CHAT.name,
          channel: SAMPLE_CHAT.channel,
          number: SAMPLE_CHAT.number,
          timestamp: SAMPLE_CHAT.timestamp,
          sender: {
            kind: "whatsapp_pn",
            ref: SAMPLE_CHAT.sender,
            phoneNumber: SAMPLE_CHAT.number,
          },
        };
  return `POST ${url}\n${JSON.stringify(payload, null, 2)}`;
}

function previewHttpReply(draft: Draft, parsed: ParsedExample): string | null {
  const template = draft.body.trim();
  if (!template || !parsed.ok) {
    return null;
  }
  const extra: Record<string, string> = {};
  for (const row of draft.bindings) {
    const name = row.name.trim();
    const path = row.path.trim();
    if (!name || !path) {
      continue;
    }
    extra[name] = scalarAtPath(parsed.value, path) ?? `{{${name}}}`;
  }
  const vars: Record<string, string> = {
    name: SAMPLE_CHAT.name,
    text: SAMPLE_CHAT.text,
    channel: SAMPLE_CHAT.channel,
    number: SAMPLE_CHAT.number,
    sender: SAMPLE_CHAT.sender,
    timestamp: SAMPLE_CHAT.timestamp,
    ...extra,
  };
  let rendered = template;
  for (const [key, value] of Object.entries(vars)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered.trim() || null;
}

function scalarAtPath(payload: unknown, path: string): string | null {
  let current: unknown = payload;
  for (const key of path.split(".").filter(Boolean)) {
    if (Array.isArray(current)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return null;
      }
      current = current[index];
      continue;
    }
    if (!current || typeof current !== "object") {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  if (typeof current === "string") {
    const text = current.trim();
    return text.length > 0 ? text : null;
  }
  if (typeof current === "number" && Number.isFinite(current)) {
    return String(current);
  }
  if (typeof current === "boolean") {
    return current ? "true" : "false";
  }
  return null;
}
