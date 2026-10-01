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

type Translate = ReturnType<typeof useT>;

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

const emptyDraft = (channel: TriggerChannel = "whatsapp", t: Translate): Draft => ({
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
  replyBody: t("triggers.textPlaceholder"),
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
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(undefined, t));
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
      setError(err instanceof Error ? err.message : t("triggers.loadError"));
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
    setDraft(emptyDraft(channel, t));
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
      setError(err instanceof Error ? err.message : t("triggers.saveError"));
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
      setError(err instanceof Error ? err.message : t("triggers.updateError"));
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
      setError(err instanceof Error ? err.message : t("triggers.deleteError"));
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
      setError(err instanceof Error ? err.message : t("triggers.reorderError"));
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
      setTestError(err instanceof Error ? err.message : t("triggers.testError"));
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
          <p className="eyebrow">{t("nav.triggers")}</p>
          <h1>{t("triggers.title")}</h1>
          <p className="lede">
            {t("lit.triggers.47")}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="primary" onClick={startCreate}>
            {t("triggers.new")}
          </button>
        </div>
      </header>

      {!whatsappReady && !telegramReady ? (
        <p className="banner banner-warn">
          {t("lit.triggers.48")}{' '}<Link to="/overview">{t("common.home")}</Link>{' '}{t("lit.triggers.49")}
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
              <h2 id="trigger-form-title">{editingId ? t("triggers.edit") : t("triggers.new")}</h2>
              <p className="hint">{t("triggers.formHint")}</p>
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
              {t("common.name")}
              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder={t("triggers.namePlaceholder")}
                required
              />
            </label>
            <label>
              {t("triggers.listenOn")}
              <select
                value={draft.channel}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    channel: event.target.value as TriggerChannel,
                  }))
                }
              >
                <option value="both">{t("ui.whatsappAndTelegram")}</option>
                <option value="whatsapp">{t("triggers.waOnly")}</option>
                <option value="telegram">{t("triggers.tgOnly")}</option>
              </select>
              <span className="hint">
                {draft.channel === "both"
                  ? t("triggers.bothHint")
                  : t("lit.triggers.onlyChannel", { channel: channelLabel(draft.channel) })}
              </span>
            </label>
          </div>

          <section className="trigger-section">
            <h3>{t("overview.colWhen")}</h3>
            <fieldset className="check-fieldset">
              <legend>{t("triggers.listenFor")}</legend>
              <div className="check-group">
                {listenOptions(t).map((option) => (
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
                {t("triggers.listenHint")}
              </span>
            </fieldset>
            <div className="row">
              <label>
                {t("triggers.message")}
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
                  <option value="keyword">{t("triggers.matchKeyword")}</option>
                  <option value="any">{t("triggers.matchAny")}</option>
                  <option value="verification_token">{t("triggers.matchCode")}</option>
                </select>
                {draft.matchType === "any" ? (
                  <span className="hint">
                    {t("lit.triggers.50")}
                  </span>
                ) : null}
                {draft.matchType === "verification_token" ? (
                  <span className="hint">
                    {t("lit.triggers.51")}
                  </span>
                ) : null}
              </label>
              {draft.matchType === "keyword" ? (
                <label>
                  {t("triggers.lookFor")}
                  <select
                    value={draft.keywordMatch}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        keywordMatch: event.target.value as TriggerKeywordMatch,
                      }))
                    }
                  >
                    <option value="contains">{t("triggers.contains")}</option>
                    <option value="equals">{t("triggers.equals")}</option>
                  </select>
                </label>
              ) : null}
            </div>
            {draft.matchType === "keyword" ? (
              <label>
                {t("triggers.keyword")}
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
                    ? t("lit.triggers.52")
                    : t("lit.triggers.53")}
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
              {t("triggers.stop")}
            </label>
            {draft.stopProcessing ? (
              <span className="hint">
                {t("triggers.stopHint")}
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
            <h3>{t("triggers.then")}</h3>
            <div className="row">
              <label>
                {t("triggers.action")}
                <select
                  value={draft.actionType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      actionType: event.target.value as TriggerAction,
                    }))
                  }
                >
                  <option value="reply">{t("triggers.actionReply")}</option>
                  <option value="webhook">{t("triggers.actionWebhook")}</option>
                  <option value="verify">{t("triggers.actionVerify")}</option>
                </select>
              </label>
              {draft.actionType === "reply" ? (
                <label>
                  {t("triggers.replyType")}
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
                            ? t("triggers.otpPlaceholder")
                            : current.replyBody,
                      }))
                    }
                  >
                    <option value="text">{t("verify.customMessage")}</option>
                    <option value="otp">{t("triggers.replyOtp")}</option>
                  </select>
                </label>
              ) : null}
            </div>
            {draft.actionType === "webhook" && !webhookReady ? (
              <p className="banner banner-warn">
                {t("lit.triggers.54")}{' '}<Link to="/settings">{t("common.settings")}</Link>{' '}{t("lit.triggers.55")}
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
                {t("triggers.replyFrom")}
                <select
                  value={draft.replySource}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      replySource: event.target.value as "message" | "reaction",
                    }))
                  }
                >
                  <option value="message">{t("triggers.written")}</option>
                  <option value="reaction">{t("triggers.reaction")}</option>
                </select>
              </label>
            ) : null}
            {draft.actionType === "reply" &&
            draft.replyMode === "text" &&
            draft.replySource === "reaction" ? (
              reactions.length === 0 ? (
                <p className="banner banner-warn">
                  {t("lit.triggers.56")}{' '}<Link to="/reactions">{t("nav.reactions")}</Link>{' '}{t("lit.triggers.55")}
                </p>
              ) : (
                <label>
                  {t("triggers.reaction")}
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
                    <option value="">{t("triggers.chooseReaction")}</option>
                    {reactions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {reactionKindLabel(item.kind)}
                      </option>
                    ))}
                  </select>
                  <span className="hint">
                    {t("lit.triggers.57")}{" "}
                    <Link to="/reactions">{t("triggers.manageReactions")}</Link>
                  </span>
                </label>
              )
            ) : null}
            {draft.actionType === "reply" &&
            (draft.replyMode === "otp" || draft.replySource === "message") ? (
              <label>
                {t("triggers.messageToSend")}
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
                      ? t("triggers.otpPlaceholder")
                      : t("triggers.textPlaceholder")
                  }
                  required
                />
                <span className="hint">
                  {draft.replyMode === "otp"
                    ? t("triggers.otpHint")
                    : t("triggers.textHint")}
                </span>
              </label>
            ) : null}
            {draft.actionType === "reply" &&
            draft.replySource === "message" &&
            draft.replyBody.trim() ? (
              <div className="trigger-reply-preview">
                <p className="hint">{t("triggers.preview")}</p>
                <div className="session-bubble is-out">
                  <p>{previewReply(draft.replyBody, draft.replyMode)}</p>
                </div>
              </div>
            ) : null}
            {draft.actionType === "verify" ? (
              <p className="hint">
                {t("triggers.verifyHint")}
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
              {busy ? "Saving…" : editingId ? t("triggers.save") : t("triggers.create")}
            </button>
            <button type="button" className="secondary" onClick={closeForm}>
              {t("common.cancel")}
            </button>
          </div>
        </form>
        </div>
      ) : null}

      <article className="panel trigger-desk">
        <div className="trigger-list">
          <header className="trigger-list-head">
            <h2>{t("triggers.rules")}</h2>
            <p className="hint">
              {t("triggers.rulesHint")}
            </p>
          </header>
          {items === null ? (
            <div className="skeleton-table trigger-skeleton" aria-hidden="true" />
          ) : items.length === 0 ? (
            <EmptyState
              title={t("triggers.emptyTitle")}
              body={t("triggers.emptyBody")}
              action={
                <div className="empty-actions">
                  <Link className="secondary compact" to="/setup">
                    {t("lit.triggers.58")}
                  </Link>
                  <button type="button" className="primary compact" onClick={startCreate}>
                    {t("triggers.new")}
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
                      aria-label={t("triggers.reorder", { name: item.name })}
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
                        {summarize(item, t)}
                      </p>
                      {scope ? <p className="trigger-hits">{scope}</p> : null}
                      <p className="trigger-hits">{hitsLabel(item, t)}</p>
                    </div>
                    <div className="trigger-actions">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => void onToggle(item)}
                        />
                        {item.enabled ? t("common.on") : t("common.off")}
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
                        {t("common.edit")}
                      </button>
                      {confirmDeleteId === item.id ? (
                        <>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            {t("common.cancel")}
                          </button>
                          <button
                            type="button"
                            className="primary compact"
                            onClick={() => void onDelete(item)}
                          >
                            {t("common.delete")}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="secondary compact"
                          onClick={() => setConfirmDeleteId(item.id)}
                        >
                          {t("common.delete")}
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
              <h2>{t("triggers.testTitle")}</h2>
              <p className="hint">
                {t("triggers.testHint")}
              </p>
            </div>
          </header>
          <label>
            {t("common.channel")}
            <select
              value={testChannel}
              onChange={(event) =>
                setTestChannel(event.target.value as "whatsapp" | "telegram")
              }
            >
              <option value="whatsapp">{t("common.whatsapp")}</option>
              <option value="telegram">{t("common.telegram")}</option>
            </select>
          </label>
          <label>
            {t("triggers.inboundAs")}
            <select
              value={testMediaType}
              onChange={(event) =>
                setTestMediaType(event.target.value as ListenType)
              }
            >
              <option value="text">{t("triggers.listenText")}</option>
              <option value="image">{t("usage.job.vision")}</option>
              <option value="audio">{t("triggers.listenAudio")}</option>
              <option value="file">{t("triggers.listenFile")}</option>
            </select>
          </label>
          <label>
            {t("triggers.inboundText")}
            <textarea
              value={testText}
              onChange={(event) => setTestText(event.target.value)}
              placeholder={
                testMediaType === "image"
                  ? t("triggers.captionPlaceholder")
                  : testMediaType === "audio"
                    ? t("triggers.transcriptPlaceholder")
                    : testMediaType === "file"
                      ? t("triggers.filePlaceholder")
                      : "HELP"
              }
              required={testMediaType === "text"}
            />
            <span className="hint">
              {t("lit.triggers.59")}
            </span>
          </label>
          <label>
            {t("triggers.senderName")}
            <input
              value={testName}
              onChange={(event) => setTestName(event.target.value)}
              placeholder={t("triggers.senderPlaceholder")}
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
            {testBusy ? "Testing…" : t("triggers.test")}
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
  const t = useT();
  if (enabledCount === 0) {
    return <p className="hint">{t("triggers.testOff")}</p>;
  }
  if (result.matched.length === 0) {
    return <p className="hint">{t("triggers.testNone")}</p>;
  }

  return (
    <div className="trigger-test-result">
      <p className="hint">
        {result.matched.length === 1
          ? t("triggers.testOne")
          : t("triggers.testMany", { count: result.matched.length })}
      </p>
      <ol className="trigger-test-matches">
        {result.matched.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong>
            <span>
              {actionLabel(item, t)}
              {result.reply?.triggerId === item.id ? t("triggers.replyBelow") : ""}
              {result.stoppedAt === item.id ? t("triggers.stopsAfter") : ""}
            </span>
          </li>
        ))}
      </ol>
      {result.webhooks.length > 0 ? (
        <p className="hint">
          {t(result.webhooks.length === 1 ? "lit.triggers.notifyOne" : "lit.triggers.notifyMany")}{" "}
          {result.webhooks.map((row) => row.name).join(", ")}.
        </p>
      ) : null}
      {result.reply ? (
        <div className="session-bubble is-out">
          <p>{result.reply.text || t("triggers.emptyReply")}</p>
        </div>
      ) : null}
      {result.reply?.reaction ? (
        <p className="hint">
          {result.reply.reaction.name} ·{" "}
          {reactionKindLabel(result.reply.reaction.kind)}
          {result.reply.reaction.usedFallback ? t("triggers.usedFallback") : ""}
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
  const t = useT();
  if (channel === "both") {
    if (whatsappReady && telegramReady) {
      return (
        <p className="hint">
          {t("triggers.replyBothReady")}
        </p>
      );
    }
    if (whatsappReady || telegramReady) {
      return (
        <p className="banner banner-warn">
          {t("lit.triggers.60")}{' '}<Link to="/overview">{t("common.home")}</Link>{' '}{t("lit.triggers.61")}
        </p>
      );
    }
    return (
      <p className="banner banner-warn">
        {t("lit.triggers.62")}{' '}<Link to="/overview">{t("common.home")}</Link>{" "}
        {t("lit.triggers.63")}
      </p>
    );
  }
  const ready = channel === "telegram" ? telegramReady : whatsappReady;
  if (ready) {
    return null;
  }
  return (
    <p className="banner banner-warn">
      {t("lit.triggers.64")}{' '}{channelLabel(channel)} from <Link to="/overview">{t("common.home")}</Link>{" "}
      {t("lit.triggers.65")}
    </p>
  );
}

function previewReply(body: string, mode: "text" | "otp"): string {
  return body
    .replaceAll("{{name}}", "Alex")
    .replaceAll("{{code}}", mode === "otp" ? "VFY-EXAMPLE" : "");
}

function summarize(trigger: Trigger, t: Translate): string {
  const what = listenSummary(trigger.listenTypes, t);
  const value = trigger.matchValue ?? "";
  const when =
    trigger.matchType === "any"
      ? trigger.channel === "both"
        ? t("lit.triggers.sumAnyBoth", { what })
        : t("lit.triggers.sumAnyOne", { channel: channelLabel(trigger.channel), what })
      : trigger.matchType === "verification_token"
        ? t("lit.triggers.sumCode", { what })
        : trigger.keywordMatch === "contains"
          ? t("lit.triggers.sumContains", { value, what })
          : t("lit.triggers.sumEquals", { value, what });
  return t("lit.triggers.sumSentence", { when, action: actionLabel(trigger, t) });
}

const LISTEN_TYPES: ListenType[] = ["text", "image", "audio", "file"];

function listenOptions(t: Translate): Array<{ value: ListenType; label: string }> {
  return [
    { value: "text", label: t("triggers.listenText") },
    { value: "image", label: t("triggers.listenImage") },
    { value: "audio", label: t("triggers.listenAudio") },
    { value: "file", label: t("triggers.listenFile") },
  ];
}

function toggleListen(current: ListenType[], value: ListenType): ListenType[] {
  if (current.includes(value)) {
    const next = current.filter((item) => item !== value);
    return next.length > 0 ? next : current;
  }
  return [...current, value];
}

function listenSummary(types: ListenType[] | undefined, t: Translate): string {
  const values = types?.length ? types : ["text"];
  if (values.length >= LISTEN_TYPES.length) {
    return t("lit.triggers.wMessage");
  }
  const labels = values.map((item) =>
    item === "text"
      ? t("lit.triggers.wText")
      : item === "image"
        ? t("lit.triggers.wPhoto")
        : item === "audio"
          ? t("lit.triggers.wVoice")
          : t("lit.triggers.wFile"),
  );
  if (labels.length === 1) {
    return labels[0] ?? t("lit.triggers.wMessage");
  }
  return t("lit.triggers.wOr", {
    first: labels.slice(0, -1).join(", "),
    last: labels[labels.length - 1] ?? "",
  });
}

function actionLabel(trigger: Trigger, t: Translate): string {
  if (trigger.actionType === "verify") {
    return t("triggers.doVerify");
  }
  if (trigger.actionType === "webhook") {
    return t("triggers.doWebhook");
  }
  if (trigger.reaction) {
    return t("triggers.doReaction", { name: trigger.reaction.name });
  }
  return trigger.actionConfig.mode === "otp" ? t("triggers.doOtp") : t("triggers.doMessage");
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

function hitsLabel(trigger: Trigger, t: Translate): string {
  if (!trigger.hits) {
    return t("triggers.hitsNone");
  }
  const count =
    trigger.hits === 1 ? t("triggers.hitsOne") : t("triggers.hitsMany", { count: trigger.hits });
  if (!trigger.lastMatchedAt) {
    return count;
  }
  return t("triggers.hitsLast", { count, when: formatWhen(trigger.lastMatchedAt) });
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
