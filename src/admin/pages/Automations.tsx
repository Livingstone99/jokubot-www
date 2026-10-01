import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";

import { api, type Trigger, type TriggerChannel, type TriggerInput } from "../api.js";
import { useAuth } from "../auth.js";
import type { MessageKey } from "../i18n.js";
import {
  IconBot,
  IconCheck,
  IconClock,
  IconCopy,
  IconImage,
  IconList,
  IconMessage,
  IconPencil,
  IconPlus,
  IconTrash,
} from "../kit/icons.js";
import {
  ChannelIcon,
  ConfirmDialog,
  EmptyBlock,
  ErrorBlock,
  Skeleton,
  Switch,
  useToast,
} from "../kit/ui.js";
import { useT } from "../locale.js";
import { channelLabel } from "../ui.js";

type Translate = ReturnType<typeof useT>;

/* ---------- Onglets ---------- */

const TABS: Array<[string, MessageKey, boolean?]> = [
  ["/automations", "auto.tabRules", true],
  ["/automations/assistant", "auto.tabAssistant"],
  ["/automations/reactions", "auto.tabSmart"],
  ["/automations/editor", "auto.tabEditor"],
];

export function AutomationsLayout() {
  const t = useT();
  return (
    <div className="automations">
      <nav className="subtabs" aria-label={t("nav2.automations")}>
        {TABS.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "subtab is-active" : "subtab")}>
            {t(label)}
          </NavLink>
        ))}
      </nav>
      <div className="automations-body">
        <Outlet />
      </div>
    </div>
  );
}

/* ---------- Description en langage courant ---------- */

function truncate(text: string, max = 70) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function describeRule(t: Translate, rule: Pick<Trigger, "matchType" | "matchValue" | "keywordMatch" | "actionType" | "actionConfig" | "reaction">): string {
  const when =
    rule.matchType === "keyword"
      ? rule.keywordMatch === "equals"
        ? t("auto.whenEquals", { value: rule.matchValue ?? "" })
        : t("auto.whenContains", { value: rule.matchValue ?? "" })
      : rule.matchType === "verification_token"
        ? t("auto.whenCode")
        : t("auto.whenAny");
  const then =
    rule.actionType === "reply"
      ? rule.reaction
        ? t("auto.thenSmart", { name: rule.reaction.name })
        : rule.actionConfig.mode === "otp"
          ? t("auto.thenOtp")
          : t("auto.thenText", { text: truncate(rule.actionConfig.body ?? "") })
      : rule.actionType === "webhook"
        ? t("auto.thenWebhook")
        : t("auto.thenVerify");
  return `${when}, ${then}`;
}

/* ---------- Liste des règles ---------- */

export function RulesPage() {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<Trigger[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Trigger | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    void api
      .triggers()
      .then((res) => setItems(res.items))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("triggers.loadError")));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function onToggle(rule: Trigger, enabled: boolean) {
    setBusyId(rule.id);
    setItems((current) => current?.map((r) => (r.id === rule.id ? { ...r, enabled } : r)) ?? null);
    try {
      await api.updateTrigger(rule.id, { enabled });
      toast({ text: enabled ? t("auto.turnedOn") : t("auto.turnedOff") });
    } catch {
      setItems((current) => current?.map((r) => (r.id === rule.id ? { ...r, enabled: !enabled } : r)) ?? null);
      toast({ text: t("auto.toggleError"), tone: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function onDuplicate(rule: Trigger) {
    setBusyId(rule.id);
    try {
      await api.createTrigger({
        name: t("auto.copyName", { name: rule.name }),
        enabled: false,
        channel: rule.channel,
        matchType: rule.matchType,
        matchValue: rule.matchValue,
        keywordMatch: rule.keywordMatch,
        listenTypes: rule.listenTypes,
        whitelist: rule.whitelist,
        blacklist: rule.blacklist,
        stopProcessing: rule.stopProcessing,
        actionType: rule.actionType,
        actionConfig: rule.actionConfig,
        reactionId: rule.reactionId,
      });
      toast({ text: t("auto.duplicated") });
      load();
    } catch {
      toast({ text: t("auto.saveError"), tone: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete() {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    try {
      await api.deleteTrigger(toDelete.id);
      setItems((current) => current?.filter((r) => r.id !== toDelete.id) ?? null);
      toast({ text: t("auto.deleted") });
    } catch {
      toast({ text: t("auto.deleteError"), tone: "error" });
    } finally {
      setBusyId(null);
      setToDelete(null);
    }
  }

  return (
    <section className="page rules">
      <div className="rules-head">
        <p className="lede page-intro">{t("auto.lede")}</p>
        <Link className="primary" to="/automations/new">
          <IconPlus size={18} />
          {t("auto.new")}
        </Link>
      </div>

      {error ? (
        <ErrorBlock message={t("auto.loadError")} onRetry={load} />
      ) : items === null ? (
        <Skeleton lines={3} height={84} />
      ) : items.length === 0 ? (
        <EmptyBlock
          icon={<IconBot size={24} />}
          title={t("auto.empty")}
          body={t("auto.emptyBody")}
          action={
            <Link className="primary compact" to="/automations/new">
              {t("auto.new")}
            </Link>
          }
        />
      ) : (
        <ul className="rule-list">
          {items.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              busy={busyId === rule.id}
              onToggle={(next) => void onToggle(rule, next)}
              onEdit={() => navigate(isSimple(rule) ? `/automations/rule/${rule.id}` : "/automations/editor")}
              onDuplicate={() => void onDuplicate(rule)}
              onDelete={() => setToDelete(rule)}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={t("auto.deleteTitle")}
        body={t("auto.deleteBody", { name: toDelete?.name ?? "" })}
        confirmLabel={t("auto.delete")}
        danger
        busy={busyId !== null}
        onConfirm={() => void onDelete()}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}

/** Une règle se modifie dans le formulaire en 3 étapes si elle répond par un simple texte. */
function isSimple(rule: Trigger) {
  return (
    rule.actionType === "reply" &&
    !rule.reactionId &&
    rule.actionConfig.mode !== "otp" &&
    (rule.matchType === "keyword" || rule.matchType === "any")
  );
}

export function RuleRow({
  rule,
  busy,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  rule: Trigger;
  busy: boolean;
  onToggle: (next: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  return (
    <li className={rule.enabled ? "rule-row" : "rule-row is-off"}>
      <div className="rule-main">
        <strong>{rule.name}</strong>
        <p>{describeRule(t, rule)}</p>
        <span className="rule-meta">
          {rule.channel === "both" ? (
            <>
              <ChannelIcon channel="whatsapp" size={13} />
              <ChannelIcon channel="telegram" size={13} />
            </>
          ) : (
            <ChannelIcon channel={rule.channel} size={13} />
          )}
          {channelLabel(rule.channel)}
          <span aria-hidden="true">·</span>
          {rule.hits === 1 ? t("auto.usedOne") : t("auto.usedMany", { count: rule.hits })}
        </span>
      </div>
      <div className="rule-actions">
        <Switch
          checked={rule.enabled}
          disabled={busy}
          label={t("auto.toggle", { name: rule.name })}
          onChange={onToggle}
        />
        <button type="button" className="header-icon" aria-label={t("auto.edit", { name: rule.name })} title={t("auto.editShort")} onClick={onEdit}>
          <IconPencil size={18} />
        </button>
        <button type="button" className="header-icon" aria-label={t("auto.duplicate", { name: rule.name })} title={t("auto.duplicateShort")} disabled={busy} onClick={onDuplicate}>
          <IconCopy size={18} />
        </button>
        <button type="button" className="header-icon danger-text" aria-label={t("auto.deleteNamed", { name: rule.name })} title={t("auto.delete")} disabled={busy} onClick={onDelete}>
          <IconTrash size={18} />
        </button>
      </div>
    </li>
  );
}

/* ---------- Formulaire en 3 étapes ---------- */

type WhenKind = "contains" | "equals" | "any" | "first" | "offhours";
type ThenKind = "text" | "image" | "menu";

type FormState = {
  name: string;
  when: WhenKind;
  keyword: string;
  then: ThenKind;
  text: string;
  channel: TriggerChannel;
};

const EMPTY: FormState = { name: "", when: "contains", keyword: "", then: "text", text: "", channel: "both" };

function fromRule(rule: Trigger): FormState {
  return {
    name: rule.name,
    when: rule.matchType === "any" ? "any" : rule.keywordMatch === "equals" ? "equals" : "contains",
    keyword: rule.matchValue ?? "",
    then: "text",
    text: rule.actionConfig.body ?? "",
    channel: rule.channel,
  };
}

function toInput(form: FormState, base?: Trigger): TriggerInput {
  const keyword = form.when === "contains" || form.when === "equals";
  return {
    name: form.name.trim(),
    enabled: base?.enabled ?? true,
    channel: form.channel,
    matchType: keyword ? "keyword" : "any",
    matchValue: keyword ? form.keyword.trim() : null,
    keywordMatch: keyword ? (form.when === "equals" ? "equals" : "contains") : undefined,
    listenTypes: base?.listenTypes?.length ? base.listenTypes : ["text"],
    whitelist: base?.whitelist ?? [],
    blacklist: base?.blacklist ?? [],
    stopProcessing: base?.stopProcessing ?? true,
    actionType: "reply",
    actionConfig: { mode: "text", body: form.text },
    reactionId: null,
  };
}

export function RuleFormPage() {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const { me } = useAuth();
  const [base, setBase] = useState<Trigger | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"keyword" | "text" | "name", string>>>({});

  useEffect(() => {
    if (!id) return;
    void api
      .triggers()
      .then((res) => {
        const rule = res.items.find((r) => r.id === id);
        if (!rule) {
          navigate("/automations", { replace: true });
          return;
        }
        setBase(rule);
        setForm(fromRule(rule));
      })
      .catch(() => toast({ text: t("auto.loadError"), tone: "error" }))
      .finally(() => setLoading(false));
  }, [id, navigate, t, toast]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key === "keyword" ? "keyword" : key]: undefined }));
  };

  function validateStep(target: number): boolean {
    const next: typeof errors = {};
    if (target >= 1 && (form.when === "contains" || form.when === "equals") && !form.keyword.trim()) {
      next.keyword = t("auto.errKeyword");
    }
    if (target >= 2 && !form.text.trim()) next.text = t("auto.errText");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (validateStep(step)) setStep((s) => Math.min(3, s + 1));
  }

  const suggestedName = useMemo(() => {
    if (form.when === "any") return t("auto.nameAny");
    return form.keyword.trim() ? t("auto.nameKeyword", { value: form.keyword.trim() }) : "";
  }, [form.when, form.keyword, t]);

  async function onSave() {
    if (!validateStep(3)) {
      setStep(!form.keyword.trim() && (form.when === "contains" || form.when === "equals") ? 1 : 2);
      return;
    }
    setBusy(true);
    try {
      const input = toInput({ ...form, name: form.name.trim() || suggestedName || t("auto.nameAny") }, base ?? undefined);
      if (base) await api.updateTrigger(base.id, input);
      else await api.createTrigger(input);
      toast({ text: t("auto.saved") });
      navigate("/automations");
    } catch {
      toast({ text: t("auto.saveError"), tone: "error", action: { label: t("kit.retry"), onClick: () => void onSave() } });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Skeleton lines={3} height={80} />;

  const whenOptions: Array<{ value: WhenKind; label: MessageKey; hint: MessageKey; icon: React.ReactNode; soon?: boolean }> = [
    { value: "contains", label: "auto.optContains", hint: "auto.optContainsHint", icon: <IconMessage size={20} /> },
    { value: "equals", label: "auto.optEquals", hint: "auto.optEqualsHint", icon: <IconCheck size={20} /> },
    { value: "any", label: "auto.optAny", hint: "auto.optAnyHint", icon: <IconList size={20} /> },
    { value: "first", label: "auto.optFirst", hint: "auto.soon", icon: <IconBot size={20} />, soon: true },
    { value: "offhours", label: "auto.optOffHours", hint: "auto.soon", icon: <IconClock size={20} />, soon: true },
  ];
  const thenOptions: Array<{ value: ThenKind; label: MessageKey; hint: MessageKey; icon: React.ReactNode; soon?: boolean }> = [
    { value: "text", label: "auto.optText", hint: "auto.optTextHint", icon: <IconMessage size={20} /> },
    { value: "image", label: "auto.optImage", hint: "auto.soon", icon: <IconImage size={20} />, soon: true },
    { value: "menu", label: "auto.optMenu", hint: "auto.soon", icon: <IconList size={20} />, soon: true },
  ];
  const channelOptions: Array<{ value: TriggerChannel; label: string; ready: boolean }> = [
    { value: "whatsapp", label: t("common.whatsapp"), ready: Boolean(me?.tenant.whatsappLinked) },
    { value: "telegram", label: t("common.telegram"), ready: Boolean(me?.tenant.telegramBotUsername) },
    { value: "both", label: t("auto.both"), ready: true },
  ];

  return (
    <section className="page rule-form">
      <div className="rule-form-top">
        <Link className="text-link" to="/automations">
          ← {t("auto.backToList")}
        </Link>
        <h2 className="rule-form-title">{base ? t("auto.editTitle") : t("auto.newTitle")}</h2>
      </div>

      <ol className="steps" aria-label={t("auto.stepsLabel")}>
        {(["auto.step1", "auto.step2", "auto.step3"] as MessageKey[]).map((label, index) => {
          const n = index + 1;
          return (
            <li key={label} className={n === step ? "is-current" : n < step ? "is-done" : ""} aria-current={n === step ? "step" : undefined}>
              <button type="button" onClick={() => (n < step || validateStep(step)) && setStep(n)}>
                <span className="steps-num" aria-hidden="true">
                  {n < step ? <IconCheck size={14} /> : n}
                </span>
                {t(label)}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="rule-form-grid">
        <div className="rule-form-fields">
          {step === 1 ? (
            <fieldset className="choice-set">
              <legend>{t("auto.q1")}</legend>
              {whenOptions.map((option) => (
                <ChoiceCard
                  key={option.value}
                  name="when"
                  checked={form.when === option.value}
                  disabled={option.soon}
                  label={t(option.label)}
                  hint={t(option.hint)}
                  icon={option.icon}
                  onSelect={() => update("when", option.value)}
                />
              ))}
              {form.when === "contains" || form.when === "equals" ? (
                <label className="field-block">
                  {t("auto.keyword")}
                  <input
                    value={form.keyword}
                    placeholder={t("auto.keywordPlaceholder")}
                    aria-invalid={Boolean(errors.keyword)}
                    aria-describedby={errors.keyword ? "err-keyword" : undefined}
                    onChange={(event) => update("keyword", event.target.value)}
                  />
                  {errors.keyword ? (
                    <span className="field-error" id="err-keyword">
                      {errors.keyword}
                    </span>
                  ) : null}
                </label>
              ) : null}
            </fieldset>
          ) : null}

          {step === 2 ? (
            <fieldset className="choice-set">
              <legend>{t("auto.q2")}</legend>
              {thenOptions.map((option) => (
                <ChoiceCard
                  key={option.value}
                  name="then"
                  checked={form.then === option.value}
                  disabled={option.soon}
                  label={t(option.label)}
                  hint={t(option.hint)}
                  icon={option.icon}
                  onSelect={() => update("then", option.value)}
                />
              ))}
              <label className="field-block">
                {t("auto.replyText")}
                <textarea
                  rows={4}
                  value={form.text}
                  placeholder={t("auto.replyPlaceholder")}
                  aria-invalid={Boolean(errors.text)}
                  aria-describedby={errors.text ? "err-text" : "hint-text"}
                  onChange={(event) => update("text", event.target.value)}
                />
                {errors.text ? (
                  <span className="field-error" id="err-text">
                    {errors.text}
                  </span>
                ) : (
                  <span className="hint" id="hint-text">
                    {t("auto.replyHint")}
                  </span>
                )}
              </label>
              <p className="hint">
                {t("auto.moreOptions")} <Link to="/automations/editor">{t("auto.tabEditor")}</Link>
              </p>
            </fieldset>
          ) : null}

          {step === 3 ? (
            <fieldset className="choice-set">
              <legend>{t("auto.q3")}</legend>
              {channelOptions.map((option) => (
                <ChoiceCard
                  key={option.value}
                  name="channel"
                  checked={form.channel === option.value}
                  label={option.label}
                  hint={option.ready ? t("home.connected") : t("auto.channelNotReady")}
                  icon={
                    option.value === "both" ? (
                      <span className="choice-icons">
                        <ChannelIcon channel="whatsapp" size={14} />
                        <ChannelIcon channel="telegram" size={14} />
                      </span>
                    ) : (
                      <ChannelIcon channel={option.value} size={16} />
                    )
                  }
                  onSelect={() => update("channel", option.value)}
                />
              ))}
              <label className="field-block">
                {t("auto.name")}
                <input
                  value={form.name}
                  placeholder={suggestedName || t("auto.nameAny")}
                  onChange={(event) => update("name", event.target.value)}
                />
                <span className="hint">{t("auto.nameHint")}</span>
              </label>
            </fieldset>
          ) : null}

          <div className="rule-form-nav">
            {step > 1 ? (
              <button type="button" className="secondary" onClick={() => setStep((s) => s - 1)}>
                {t("auto.prev")}
              </button>
            ) : (
              <Link className="secondary" to="/automations">
                {t("kit.cancel")}
              </Link>
            )}
            {step < 3 ? (
              <button type="button" className="primary" onClick={goNext}>
                {t("auto.next")}
              </button>
            ) : (
              <button type="button" className="primary" disabled={busy} onClick={() => void onSave()}>
                {busy ? t("auto.saving") : t("auto.save")}
              </button>
            )}
          </div>
        </div>

        <RulePreview form={form} />
      </div>
    </section>
  );
}

function ChoiceCard({
  name,
  checked,
  disabled,
  label,
  hint,
  icon,
  onSelect,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  hint: string;
  icon: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <label className={["choice", checked ? "is-on" : "", disabled ? "is-disabled" : ""].filter(Boolean).join(" ")}>
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onSelect} />
      <span className="choice-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="choice-text">
        <strong>{label}</strong>
        <span>{hint}</span>
      </span>
    </label>
  );
}

/** Aperçu en direct de la conversation. */
function RulePreview({ form }: { form: FormState }) {
  const t = useT();
  const sample =
    form.when === "any" || !form.keyword.trim()
      ? t("auto.previewSample")
      : form.when === "equals"
        ? form.keyword.trim()
        : t("auto.previewSampleKeyword", { value: form.keyword.trim() });
  const reply = form.text.trim()
    ? form.text.replaceAll("{{name}}", "Awa").replaceAll("{{channel}}", form.channel === "telegram" ? "Telegram" : "WhatsApp")
    : t("auto.previewEmpty");
  return (
    <aside className="rule-preview" aria-label={t("auto.preview")}>
      <p className="section-label">{t("auto.preview")}</p>
      <div className="rule-preview-phone">
        <ol className="bubbles">
          <li className="bubble">
            <p>{sample}</p>
          </li>
          <li className={form.text.trim() ? "bubble is-mine" : "bubble is-mine is-ghost"}>
            <p>{reply}</p>
            <span className="bubble-meta">{t("msg.autoReply")}</span>
          </li>
        </ol>
      </div>
      <p className="hint">
        {form.channel === "both" ? t("auto.previewBoth") : t("auto.previewOne", { channel: channelLabel(form.channel) })}
      </p>
    </aside>
  );
}
