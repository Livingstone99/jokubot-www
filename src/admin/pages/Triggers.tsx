import { type DragEvent, type FormEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AgentAssist } from "../AgentAssist.js";
import {
  api,
  reactionKindLabel,
  type Reaction,
  type Trigger,
  type TriggerAction,
  type TriggerChannel,
  type TriggerInput,
  type TriggerKeywordMatch,
  type TriggerMatch,
  type TriggerSimulation,
  type ListenType,
} from "../api.js";
import { useAuth } from "../auth.js";
import { useT } from "../locale.js";
import { ChannelBadge, EmptyState, channelLabel, formatWhen } from "../ui.js";

type Draft = {
  name: string;
  channel: TriggerChannel;
  matchType: TriggerMatch;
  matchValue: string;
  keywordMatch: TriggerKeywordMatch;
  listenTypes: ListenType[];
  whitelist: string[];
  blacklist: string[];
  stopProcessing: boolean;
  actionType: TriggerAction;
  replyMode: "text" | "otp";
  replySource: "message" | "reaction";
  replyBody: string;
  reactionId: string;
  enabled: boolean;
};

const emptyDraft = (channel: TriggerChannel = "whatsapp"): Draft => ({
  name: "",
  channel,
  matchType: "keyword",
  matchValue: "",
  keywordMatch: "contains",
  listenTypes: ["text"],
  whitelist: [],
  blacklist: [],
  stopProcessing: true,
  actionType: "reply",
  replyMode: "text",
  replySource: "message",
  replyBody: "Hi {{name}}, we received your message.",
  reactionId: "",
  enabled: true,
});

function draftFrom(trigger: Trigger): Draft {
  return {
    name: trigger.name,
    channel: trigger.channel,
    matchType: trigger.matchType,
    matchValue: trigger.matchValue ?? "",
    keywordMatch: trigger.keywordMatch === "contains" ? "contains" : "equals",
    listenTypes: trigger.listenTypes?.length ? trigger.listenTypes : ["text"],
    whitelist: trigger.whitelist ?? [],
    blacklist: trigger.blacklist ?? [],
    stopProcessing: trigger.stopProcessing,
    actionType: trigger.actionType,
    replyMode: trigger.actionConfig.mode === "otp" ? "otp" : "text",
    replySource: trigger.reactionId ? "reaction" : "message",
    replyBody: trigger.actionConfig.body ?? "",
    reactionId: trigger.reactionId ?? "",
    enabled: trigger.enabled,
  };
}

function toInput(draft: Draft): TriggerInput {
  const useReaction =
    draft.actionType === "reply" &&
    draft.replyMode === "text" &&
    draft.replySource === "reaction";
  return {
    name: draft.name,
    enabled: draft.enabled,
    channel: draft.channel,
    matchType: draft.matchType,
    matchValue: draft.matchType === "keyword" ? draft.matchValue : null,
    keywordMatch: draft.matchType === "keyword" ? draft.keywordMatch : undefined,
    listenTypes: draft.listenTypes,
    whitelist: draft.whitelist,
    blacklist: draft.blacklist,
    stopProcessing: draft.stopProcessing,
    actionType: draft.actionType,
    actionConfig:
      draft.actionType === "reply" && !useReaction
        ? { mode: draft.replyMode, body: draft.replyBody }
        : {},
    reactionId: useReaction ? draft.reactionId || null : null,
  };
}

function orderKey(list: Trigger[]): string {
  return list.map((item) => item.id).join(",");
}

export function TriggersPage() {
  const t = useT();
  const { me } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Trigger[] | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const savedOrder = useRef("");
  const formRef = useRef<HTMLFormElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const [testText, setTestText] = useState("");
  const [testName, setTestName] = useState("");
  const [testNumber, setTestNumber] = useState("");
  const [testChannel, setTestChannel] = useState<"whatsapp" | "telegram">(
    "whatsapp",
  );
  const [testMediaType, setTestMediaType] = useState<ListenType>("text");
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<TriggerSimulation | null>(null);
  const [assistId, setAssistId] = useState<string | null>(null);

  async function refresh() {
    const [triggerResult, reactionResult] = await Promise.all([
      api.triggers(),
      api.reactions(),
    ]);
    setItems(triggerResult.items);
    setReactions(reactionResult.items);
    savedOrder.current = orderKey(triggerResult.items);
  }

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load triggers.");
    });
  }, []);

  function startCreate() {
    lastFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditingId(null);
    const channel =
      me?.tenant.whatsappLinked && me.tenant.telegramLinked
        ? "both"
        : me?.tenant.telegramLinked && !me.tenant.whatsappLinked
          ? "telegram"
          : "whatsapp";
    setDraft(emptyDraft(channel));
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

  function startEdit(trigger: Trigger) {
    lastFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditingId(trigger.id);
    setDraft(draftFrom(trigger));
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
        await api.updateTrigger(editingId, toInput(draft));
      } else {
        await api.createTrigger(toInput(draft));
      }
      closeForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save trigger.");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(trigger: Trigger) {
    setError(null);
    try {
      await api.updateTrigger(trigger.id, { enabled: !trigger.enabled });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update trigger.");
    }
  }

  async function onDelete(trigger: Trigger) {
    setError(null);
    try {
      await api.deleteTrigger(trigger.id);
      if (editingId === trigger.id) {
        closeForm();
      }
      setConfirmDeleteId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete trigger.");
    }
  }

  function onDragStart(event: DragEvent<HTMLButtonElement>, id: string) {
    setDragId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function onDragOver(event: DragEvent<HTMLElement>, overId: string) {
    event.preventDefault();
    if (!dragId || dragId === overId) {
      return;
    }
    setItems((current) => {
      if (!current) {
        return current;
      }
      const from = current.findIndex((item) => item.id === dragId);
      const to = current.findIndex((item) => item.id === overId);
      if (from < 0 || to < 0) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (!moved) {
        return current;
      }
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function persistOrder(next: Trigger[]) {
    const nextKey = orderKey(next);
    if (nextKey === savedOrder.current) {
      return;
    }
    setReordering(true);
    setError(null);
    try {
      const result = await api.reorderTriggers(next.map((item) => item.id));
      setItems(result.items);
      savedOrder.current = orderKey(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder triggers.");
      await refresh();
    } finally {
      setReordering(false);
    }
  }

  async function onDragEnd() {
    setDragId(null);
    if (items) {
      await persistOrder(items);
    }
  }

  async function onTest(event: FormEvent) {
    event.preventDefault();
    setTestBusy(true);
    setTestError(null);
    try {
      const result = await api.simulateTriggers({
        text: testText,
        senderName: testName.trim() || undefined,
        senderNumber: testNumber.trim() || undefined,
        channel: testChannel,
        mediaType: testMediaType,
      });
      setSimulation(result);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Could not test this message.");
    } finally {
      setTestBusy(false);
    }
  }

  const webhookReady = Boolean(me?.tenant.webhookUrl);
  const whatsappReady = Boolean(me?.tenant.whatsappLinked);
  const telegramReady = Boolean(me?.tenant.telegramLinked);
  const enabledCount =
    items?.filter(
      (item) =>
        item.enabled &&
        (item.channel === "both" || item.channel === testChannel),
    ).length ?? 0;

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Triggers</p>
          <h1>When someone messages you</h1>
          <p className="lede">
            Match inbound WhatsApp or Telegram text, photos, voice notes, and
            files, then notify your app or send a reply. Verification codes skip
            these rules unless you add one that matches a verification code.
            Built-in verification still runs on its own.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="primary" onClick={startCreate}>
            New trigger
          </button>
        </div>
      </header>

      {!whatsappReady && !telegramReady ? (
        <p className="banner banner-warn">
          Connect a channel from <Link to="/overview">Home</Link> before replies can go out.
          Verification codes still work once the channel is linked.
        </p>
      ) : null}

      {error && !open ? (
        <p className="banner banner-danger" role="alert">
          {error}
        </p>
      ) : null}

      {open ? (
        <div className="overlay" onMouseDown={onOverlayMouseDown}>
        <form
          ref={formRef}
          className="panel stack overlay-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trigger-form-title"
          onSubmit={(event) => void onSubmit(event)}
        >
          <header className="panel-head">
            <div>
              <h2 id="trigger-form-title">{editingId ? "Edit trigger" : "New trigger"}</h2>
              <p className="hint">Place this rule with the drag handle after you save.</p>
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
                placeholder="Help keyword"
                required
              />
            </label>
            <label>
              Listen on
              <select
                value={draft.channel}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    channel: event.target.value as TriggerChannel,
                  }))
                }
              >
                <option value="both">WhatsApp and Telegram</option>
                <option value="whatsapp">WhatsApp only</option>
                <option value="telegram">Telegram only</option>
              </select>
              <span className="hint">
                {draft.channel === "both"
                  ? "One rule. A reply goes back on the app the customer wrote from."
                  : `Only ${channelLabel(draft.channel)} messages match this rule.`}
              </span>
            </label>
          </div>

          <section className="trigger-section">
            <h3>When</h3>
            <fieldset className="check-fieldset">
              <legend>Listen for</legend>
              <div className="check-group">
                {LISTEN_OPTIONS.map((option) => (
                  <label key={option.value} className="check-row">
                    <input
                      type="checkbox"
                      checked={draft.listenTypes.includes(option.value)}
                      onChange={() =>
                        setDraft((current) => ({
                          ...current,
                          listenTypes: toggleListen(current.listenTypes, option.value),
                        }))
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              <span className="hint">
                Photos use the caption for keywords. Voice notes are transcribed
                first. Files use the caption or readable text.
              </span>
            </fieldset>
            <div className="row">
              <label>
                Message
                <select
                  value={draft.matchType}
                  onChange={(event) => {
                    const matchType = event.target.value as TriggerMatch;
                    setDraft((current) => ({
                      ...current,
                      matchType,
                      stopProcessing: matchType === "keyword",
                    }));
                  }}
                >
                  <option value="keyword">This keyword</option>
                  <option value="any">Any message</option>
                  <option value="verification_token">A verification code</option>
                </select>
                {draft.matchType === "any" ? (
                  <span className="hint">
                    Fires on ordinary inbound. Verification codes skip this
                    rule.
                  </span>
                ) : null}
                {draft.matchType === "verification_token" ? (
                  <span className="hint">
                    Fires only when the message contains a verification code.
                    Built-in verification still runs without this rule.
                  </span>
                ) : null}
              </label>
              {draft.matchType === "keyword" ? (
                <label>
                  Look for
                  <select
                    value={draft.keywordMatch}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        keywordMatch: event.target.value as TriggerKeywordMatch,
                      }))
                    }
                  >
                    <option value="contains">Anywhere in the message</option>
                    <option value="equals">Whole message only</option>
                  </select>
                </label>
              ) : null}
            </div>
            {draft.matchType === "keyword" ? (
              <label>
                Keyword
                <input
                  value={draft.matchValue}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      matchValue: event.target.value,
                    }))
                  }
                  onBlur={() =>
                    setDraft((current) => ({
                      ...current,
                      matchValue: current.matchValue
                        .trim()
                        .replace(/[\s,.;:!?…]+$/u, "")
                        .trim(),
                    }))
                  }
                  placeholder="HELP"
                  required
                />
                <span className="hint">
                  {draft.keywordMatch === "contains"
                    ? "Fires if this word appears in the message, ignoring case. Trailing commas and punctuation are ignored. Verification codes skip this rule."
                    : "Fires only if the whole message is this keyword. Extra characters do not match. Verification codes skip this rule."}
                </span>
              </label>
            ) : null}
            <label className="check-row">
              <input
                type="checkbox"
                checked={draft.stopProcessing}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    stopProcessing: event.target.checked,
                  }))
                }
              />
              Stop after this match
            </label>
            {draft.stopProcessing ? (
              <span className="hint">
                Later rules on this channel will not run, including replies.
              </span>
            ) : null}
          </section>

          <section className="trigger-section">
            <h3>{t("triggers.who")}</h3>
            <SenderListField
              label={t("triggers.whitelist")}
              values={draft.whitelist}
              emptyHint={t("triggers.whitelistEmpty")}
              filledHint={t("triggers.whitelistHint")}
              onChange={(whitelist) =>
                setDraft((current) => ({
                  ...current,
                  whitelist,
                  blacklist: current.blacklist.filter((item) => !whitelist.includes(item)),
                }))
              }
            />
            <SenderListField
              label={t("triggers.blacklist")}
              values={draft.blacklist}
              emptyHint={t("triggers.blacklistEmpty")}
              filledHint={t("triggers.blacklistHint")}
              onChange={(blacklist) =>
                setDraft((current) => ({
                  ...current,
                  blacklist,
                  whitelist: current.whitelist.filter((item) => !blacklist.includes(item)),
                }))
              }
            />
          </section>

          <section className="trigger-section">
            <h3>Then</h3>
            <div className="row">
              <label>
                Action
                <select
                  value={draft.actionType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      actionType: event.target.value as TriggerAction,
                    }))
                  }
                >
                  <option value="reply">Send a reply</option>
                  <option value="webhook">Notify webhook</option>
                  <option value="verify">Record match only</option>
                </select>
              </label>
              {draft.actionType === "reply" ? (
                <label>
                  Reply type
                  <select
                    value={draft.replyMode}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        replyMode: event.target.value as "text" | "otp",
                        replySource:
                          event.target.value === "otp" ? "message" : current.replySource,
                        replyBody:
                          event.target.value === "otp" && !current.replyBody.includes("{{code}}")
                            ? "Your code is {{code}}"
                            : current.replyBody,
                      }))
                    }
                  >
                    <option value="text">Custom message</option>
                    <option value="otp">OTP in the same chat</option>
                  </select>
                </label>
              ) : null}
            </div>
            {draft.actionType === "webhook" && !webhookReady ? (
              <p className="banner banner-warn">
                Save a webhook URL in <Link to="/settings">Settings</Link> first.
              </p>
            ) : null}
            {draft.actionType === "reply" ? (
              <ReplyChannelHint
                channel={draft.channel}
                whatsappReady={whatsappReady}
                telegramReady={telegramReady}
              />
            ) : null}
            {draft.actionType === "reply" && draft.replyMode === "text" ? (
              <label>
                Reply from
                <select
                  value={draft.replySource}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      replySource: event.target.value as "message" | "reaction",
                    }))
                  }
                >
                  <option value="message">Written message</option>
                  <option value="reaction">Reaction</option>
                </select>
              </label>
            ) : null}
            {draft.actionType === "reply" &&
            draft.replyMode === "text" &&
            draft.replySource === "reaction" ? (
              reactions.length === 0 ? (
                <p className="banner banner-warn">
                  Create a reaction on <Link to="/reactions">Reactions</Link> first.
                </p>
              ) : (
                <label>
                  Reaction
                  <select
                    value={draft.reactionId}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        reactionId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Choose a reaction</option>
                    {reactions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {reactionKindLabel(item.kind)}
                      </option>
                    ))}
                  </select>
                  <span className="hint">
                    Replaces the written message. OTP stays on the written path.{" "}
                    <Link to="/reactions">Manage reactions</Link>
                  </span>
                </label>
              )
            ) : null}
            {draft.actionType === "reply" &&
            (draft.replyMode === "otp" || draft.replySource === "message") ? (
              <label>
                Message to send
                <textarea
                  value={draft.replyBody}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      replyBody: event.target.value,
                    }))
                  }
                  placeholder={
                    draft.replyMode === "otp"
                      ? "Your code is {{code}}"
                      : "Hi {{name}}, we received your message."
                  }
                  required
                />
                <span className="hint">
                  {draft.replyMode === "otp"
                    ? "Must include {{code}}. Optional {{name}} uses the sender display name."
                    : "Optional {{name}} uses the sender display name if the channel provided one."}
                </span>
              </label>
            ) : null}
            {draft.actionType === "reply" &&
            draft.replySource === "message" &&
            draft.replyBody.trim() ? (
              <div className="trigger-reply-preview">
                <p className="hint">Preview</p>
                <div className="session-bubble is-out">
                  <p>{previewReply(draft.replyBody, draft.replyMode)}</p>
                </div>
              </div>
            ) : null}
            {draft.actionType === "verify" ? (
              <p className="hint">
                Records the match in Activity. The sender does not receive a
                reply. A saved webhook URL is still notified.
              </p>
            ) : null}
          </section>
          </div>
          <div className="trigger-actions overlay-card-foot">
            <button
              type="submit"
              className="primary"
              disabled={
                busy ||
                (draft.actionType === "reply" &&
                  draft.replyMode === "text" &&
                  draft.replySource === "reaction" &&
                  !draft.reactionId)
              }
            >
              {busy ? "Saving…" : editingId ? "Save trigger" : "Create trigger"}
            </button>
            <button type="button" className="secondary" onClick={closeForm}>
              Cancel
            </button>
          </div>
        </form>
        </div>
      ) : null}

      <article className="panel trigger-desk">
        <div className="trigger-list">
          <header className="trigger-list-head">
            <h2>Rules</h2>
            <p className="hint">
              Run from top to bottom. The first match with Stop after this match
              ends the run.
            </p>
          </header>
          {items === null ? (
            <div className="skeleton-table trigger-skeleton" aria-hidden="true" />
          ) : items.length === 0 ? (
            <EmptyState
              title="No triggers yet"
              body="When someone messages WhatsApp or Telegram, notify your app or send a reply. Built-in verification always runs."
              action={
                <div className="empty-actions">
                  <Link className="secondary compact" to="/setup">
                    Ask the assistant
                  </Link>
                  <button type="button" className="primary compact" onClick={startCreate}>
                    New trigger
                  </button>
                </div>
              }
            />
          ) : (
            <div className="trigger-list-items">
              {items.map((item, index) => {
                const scope = scopeLabel(item, t);
                return (
                <article
                  key={item.id}
                  className={[
                    "trigger-card",
                    item.enabled ? "" : "is-off",
                    editingId === item.id ? "is-active" : "",
                    dragId === item.id ? "is-dragging" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={(event) => onDragOver(event, item.id)}
                >
                  <div className="trigger-card-top">
                    <button
                      type="button"
                      className="trigger-grip"
                      aria-label={`Reorder ${item.name}`}
                      draggable
                      disabled={reordering}
                      onDragStart={(event) => onDragStart(event, item.id)}
                      onDragEnd={() => void onDragEnd()}
                    >
                      <GripIcon />
                    </button>
                    <span className="trigger-ordinal" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div className="trigger-card-copy">
                      <strong>{item.name}</strong>
                      <p className="trigger-summary">
                        <ChannelBadge channel={item.channel} />
                        {" "}
                        {summarize(item)}
                      </p>
                      {scope ? <p className="trigger-hits">{scope}</p> : null}
                      <p className="trigger-hits">{hitsLabel(item)}</p>
                    </div>
                    <div className="trigger-actions">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => void onToggle(item)}
                        />
                        {item.enabled ? "On" : "Off"}
                      </label>
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
                        focus={{ triggerId: item.id }}
                        onClose={() => setAssistId(null)}
                        onApplied={() => void refresh()}
                      />
                    </div>
                  ) : null}
                </article>
                );
              })}
            </div>
          )}
        </div>

        <form className="trigger-tester" onSubmit={(event) => void onTest(event)}>
          <header className="panel-head">
            <div>
              <h2>Test a message</h2>
              <p className="hint">
                Dry run against enabled rules. Nothing is recorded. An HTTP
                reaction will call its URL and fill the reply from the JSON it
                returns.
              </p>
            </div>
          </header>
          <label>
            Channel
            <select
              value={testChannel}
              onChange={(event) =>
                setTestChannel(event.target.value as "whatsapp" | "telegram")
              }
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
            </select>
          </label>
          <label>
            Inbound as
            <select
              value={testMediaType}
              onChange={(event) =>
                setTestMediaType(event.target.value as ListenType)
              }
            >
              <option value="text">Text</option>
              <option value="image">Photo</option>
              <option value="audio">Voice note</option>
              <option value="file">File</option>
            </select>
          </label>
          <label>
            Inbound text
            <textarea
              value={testText}
              onChange={(event) => setTestText(event.target.value)}
              placeholder={
                testMediaType === "image"
                  ? "Optional caption"
                  : testMediaType === "audio"
                    ? "Optional transcript"
                    : testMediaType === "file"
                      ? "Optional caption or file text"
                      : "HELP"
              }
              required={testMediaType === "text"}
            />
            <span className="hint">
              A verification code only matches a rule set to A verification
              code. Other rules ignore it.
            </span>
          </label>
          <label>
            Sender name
            <input
              value={testName}
              onChange={(event) => setTestName(event.target.value)}
              placeholder="Alex"
            />
          </label>
          <label>
            {t("triggers.senderNumber")}
            <input
              value={testNumber}
              onChange={(event) => setTestNumber(event.target.value)}
              placeholder={t("triggers.numberPlaceholder")}
            />
            <span className="hint">{t("triggers.senderNumberHint")}</span>
          </label>
          <button
            type="submit"
            className="primary"
            disabled={testBusy || (testMediaType === "text" && !testText.trim())}
          >
            {testBusy ? "Testing…" : "Test"}
          </button>
          {testError ? (
            <p className="banner banner-danger" role="alert">
              {testError}
            </p>
          ) : null}
          {simulation ? (
            <TestResult result={simulation} enabledCount={enabledCount} />
          ) : null}
        </form>
      </article>
    </section>
  );
}

function TestResult({
  result,
  enabledCount,
}: {
  result: TriggerSimulation;
  enabledCount: number;
}) {
  if (enabledCount === 0) {
    return <p className="hint">Turn a rule on to test it.</p>;
  }
  if (result.matched.length === 0) {
    return <p className="hint">No enabled rule matches this text.</p>;
  }

  return (
    <div className="trigger-test-result">
      <p className="hint">
        {result.matched.length === 1
          ? "1 rule would run."
          : `${result.matched.length} rules would run.`}
      </p>
      <ol className="trigger-test-matches">
        {result.matched.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong>
            <span>
              {actionLabel(item)}
              {result.reply?.triggerId === item.id ? " · reply below" : ""}
              {result.stoppedAt === item.id ? " · stops after this" : ""}
            </span>
          </li>
        ))}
      </ol>
      {result.webhooks.length > 0 ? (
        <p className="hint">
          Would notify webhook
          {result.webhooks.length === 1 ? "" : "s"}:{" "}
          {result.webhooks.map((row) => row.name).join(", ")}.
        </p>
      ) : null}
      {result.reply ? (
        <div className="session-bubble is-out">
          <p>{result.reply.text || "(empty reply)"}</p>
        </div>
      ) : null}
      {result.reply?.reaction ? (
        <p className="hint">
          {result.reply.reaction.name} ·{" "}
          {reactionKindLabel(result.reply.reaction.kind)}
          {result.reply.reaction.usedFallback ? " · used fallback" : ""}
        </p>
      ) : null}
    </div>
  );
}

function ReplyChannelHint({
  channel,
  whatsappReady,
  telegramReady,
}: {
  channel: TriggerChannel;
  whatsappReady: boolean;
  telegramReady: boolean;
}) {
  if (channel === "both") {
    if (whatsappReady && telegramReady) {
      return (
        <p className="hint">
          A match replies on the app the customer wrote from.
        </p>
      );
    }
    if (whatsappReady || telegramReady) {
      return (
        <p className="banner banner-warn">
          Replies go out on the app that received the message. Connect the
          other from <Link to="/overview">Home</Link> if you need both.
        </p>
      );
    }
    return (
      <p className="banner banner-warn">
        Connect WhatsApp or Telegram from <Link to="/overview">Home</Link>{" "}
        before a reply can go out.
      </p>
    );
  }
  const ready = channel === "telegram" ? telegramReady : whatsappReady;
  if (ready) {
    return null;
  }
  return (
    <p className="banner banner-warn">
      Connect {channelLabel(channel)} from <Link to="/overview">Home</Link>{" "}
      before this reply can go out.
    </p>
  );
}

function previewReply(body: string, mode: "text" | "otp"): string {
  return body
    .replaceAll("{{name}}", "Alex")
    .replaceAll("{{code}}", mode === "otp" ? "VFY-EXAMPLE" : "");
}

function summarize(trigger: Trigger): string {
  const when =
    trigger.matchType === "any"
      ? trigger.channel === "both"
        ? `any WhatsApp or Telegram ${listenSummary(trigger.listenTypes)}`
        : `any ${channelLabel(trigger.channel)} ${listenSummary(trigger.listenTypes)}`
      : trigger.matchType === "verification_token"
        ? `a verification code in ${listenSummary(trigger.listenTypes)}`
        : trigger.keywordMatch === "contains"
          ? `keyword “${trigger.matchValue}” anywhere in ${listenSummary(trigger.listenTypes)}`
          : `keyword “${trigger.matchValue}” as the whole ${listenSummary(trigger.listenTypes)}`;
  return `When ${when}, ${actionLabel(trigger)}.`;
}

const LISTEN_OPTIONS: Array<{ value: ListenType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "image", label: "Photo" },
  { value: "audio", label: "Voice note" },
  { value: "file", label: "File" },
];

function toggleListen(current: ListenType[], value: ListenType): ListenType[] {
  if (current.includes(value)) {
    const next = current.filter((item) => item !== value);
    return next.length > 0 ? next : current;
  }
  return [...current, value];
}

function listenSummary(types: ListenType[] | undefined): string {
  const values = types?.length ? types : ["text"];
  if (values.length >= LISTEN_OPTIONS.length) {
    return "message";
  }
  const labels = values.map((item) =>
    item === "text"
      ? "text"
      : item === "image"
        ? "photo"
        : item === "audio"
          ? "voice note"
          : "file",
  );
  if (labels.length === 1) {
    return labels[0] ?? "message";
  }
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}

function actionLabel(trigger: Trigger): string {
  if (trigger.actionType === "verify") {
    return "record the match";
  }
  if (trigger.actionType === "webhook") {
    return "notify your webhook";
  }
  if (trigger.reaction) {
    return `run “${trigger.reaction.name}”`;
  }
  return trigger.actionConfig.mode === "otp" ? "send an OTP" : "send a custom message";
}

const MAX_SENDER_LIST = 100;

function normalizeSenderEntry(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 64) {
    return null;
  }
  if (/^\d{5,20}$/.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15 || digits.startsWith("0")) {
    return null;
  }
  return `+${digits}`;
}

function scopeLabel(trigger: Trigger, t: (key: "triggers.scopeAllow" | "triggers.scopeBlock", vars: { count: number }) => string): string | null {
  const parts: string[] = [];
  if (trigger.whitelist.length > 0) {
    parts.push(t("triggers.scopeAllow", { count: trigger.whitelist.length }));
  }
  if (trigger.blacklist.length > 0) {
    parts.push(t("triggers.scopeBlock", { count: trigger.blacklist.length }));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function SenderListField({
  label,
  values,
  emptyHint,
  filledHint,
  onChange,
}: {
  label: string;
  values: string[];
  emptyHint: string;
  filledHint: string;
  onChange: (next: string[]) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addEntries(raw: string) {
    const parts = raw.split(/[,;\n]+/);
    const next = [...values];
    let added = 0;
    let invalid = false;
    for (const part of parts) {
      if (!part.trim()) {
        continue;
      }
      const entry = normalizeSenderEntry(part);
      if (!entry) {
        invalid = true;
        continue;
      }
      if (next.includes(entry)) {
        added += 1;
        continue;
      }
      if (next.length >= MAX_SENDER_LIST) {
        setError(t("triggers.numberLimit", { max: MAX_SENDER_LIST }));
        onChange(next);
        setDraft("");
        return;
      }
      next.push(entry);
      added += 1;
    }
    if (added > 0) {
      onChange(next);
      setDraft("");
    }
    setError(invalid ? t("triggers.numberInvalid") : null);
  }

  return (
    <div className="number-list">
      <p className="number-list-label">{label}</p>
      <div className="number-list-items">
        {values.length === 0 ? (
          <span className="number-list-empty">{emptyHint}</span>
        ) : (
          values.map((value) => (
            <span key={value} className="number-chip">
              {value}
              <button
                type="button"
                className="ghost"
                aria-label={t("triggers.removeNumber", { number: value })}
                onClick={() => {
                  onChange(values.filter((item) => item !== value));
                  setError(null);
                }}
              >
                <RemoveIcon />
              </button>
            </span>
          ))
        )}
      </div>
      <div className="number-list-add">
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addEntries(draft);
            }
          }}
          placeholder={t("triggers.numberPlaceholder")}
        />
        <button
          type="button"
          className="secondary compact"
          disabled={!draft.trim()}
          onClick={() => addEntries(draft)}
        >
          {t("triggers.addNumber")}
        </button>
      </div>
      {error ? (
        <span className="hint" role="alert">
          {error}
        </span>
      ) : values.length > 0 ? (
        <span className="hint">{filledHint}</span>
      ) : null}
    </div>
  );
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M4.5 4.5l7 7M11.5 4.5l-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function hitsLabel(trigger: Trigger): string {
  if (!trigger.hits) {
    return "No matches yet";
  }
  const count = `${trigger.hits} match${trigger.hits === 1 ? "" : "es"}`;
  if (!trigger.lastMatchedAt) {
    return count;
  }
  return `${count} · last ${formatWhen(trigger.lastMatchedAt)}`;
}

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M6 3.5v9M10 3.5v9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
