import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { api, type Trigger, type TriggerChannel, type TriggerInput } from "../api.js";
import { useAuth } from "../auth.js";
import {
  IconBot,
  IconCheck,
  IconCode,
  IconCopy,
  IconMessage,
  IconMore,
  IconPencil,
  IconPlus,
  IconShieldCheck,
  IconTag,
  IconTrash,
} from "../jk/icons.js";
import {
  Badge,
  Choice,
  ConfirmModal,
  Dropdown,
  EmptyState,
  ErrorState,
  Fab,
  Field,
  Loading,
  Modal,
  PageTitle,
  Switch,
  useToast,
} from "../jk/ui.js";
import { useT } from "../locale.js";

type Translate = ReturnType<typeof useT>;

function truncate(text: string, max = 140) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function whenText(t: Translate, rule: Pick<Trigger, "matchType" | "matchValue">) {
  if (rule.matchType === "keyword") return t("jk.auto.whenWord", { word: rule.matchValue ?? "" });
  if (rule.matchType === "verification_token") return t("jk.auto.whenCode");
  return t("jk.auto.whenAny");
}

function thenText(t: Translate, rule: Pick<Trigger, "actionType" | "actionConfig" | "reaction">) {
  if (rule.actionType === "verify") return t("jk.auto.thenVerify");
  if (rule.actionType === "webhook") return t("jk.auto.thenSoftware");
  if (rule.reaction) return t("jk.auto.thenSmart", { name: rule.reaction.name });
  if (rule.actionConfig.mode === "otp") return t("jk.auto.thenCode");
  return null;
}

function channelText(t: Translate, channel: TriggerChannel) {
  return channel === "both" ? t("jk.auto.both") : channel === "telegram" ? "Telegram" : "WhatsApp";
}

/* ---------- Liste ---------- */

export function AutomationsPage() {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { id: editId } = useParams();
  const { pathname } = useLocation();
  // « /triggers/new » et « /triggers/:id/edit » ouvrent l'assistant en fenêtre au-dessus de la liste.
  const wizardOpen = pathname.endsWith("/triggers/new") || Boolean(editId);
  const [items, setItems] = useState<Trigger[] | null>(null);
  const [error, setError] = useState(false);
  const [toDelete, setToDelete] = useState<Trigger | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Ancien lien « ?new=1 » : ouvre directement la création.
  useEffect(() => {
    if (search.get("new") === "1") navigate("/triggers/new", { replace: true });
  }, [search, navigate]);

  const load = useCallback(() => {
    setError(false);
    setItems(null);
    void api
      .triggers()
      .then((res) => setItems(res.items))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onToggle(rule: Trigger, enabled: boolean) {
    setBusy(rule.id);
    setItems((all) => all?.map((r) => (r.id === rule.id ? { ...r, enabled } : r)) ?? null);
    try {
      await api.updateTrigger(rule.id, { enabled });
      toast({ text: enabled ? t("jk.auto.on") : t("jk.auto.off") });
    } catch {
      setItems((all) => all?.map((r) => (r.id === rule.id ? { ...r, enabled: !enabled } : r)) ?? null);
      toast({ text: t("jk.auto.saveError"), tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function onDuplicate(rule: Trigger) {
    setBusy(rule.id);
    try {
      await api.createTrigger({
        name: t("jk.auto.copyName", { name: rule.name }),
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
      toast({ text: t("jk.auto.duplicated") });
      load();
    } catch {
      toast({ text: t("jk.auto.saveError"), tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    if (!toDelete) return;
    setBusy(toDelete.id);
    try {
      await api.deleteTrigger(toDelete.id);
      setItems((all) => all?.filter((r) => r.id !== toDelete.id) ?? null);
      toast({ text: t("jk.auto.deleted") });
    } catch {
      toast({ text: t("jk.auto.saveError"), tone: "error" });
    } finally {
      setBusy(null);
      setToDelete(null);
    }
  }

  return (
    <div className="jk-page">
      <PageTitle
        title={t("jk.nav.automations")}
        subtitle={t("jk.auto.subtitle")}
        actions={
          <Link className="jk-btn is-primary is-hide-mobile" to="/triggers/new">
            <IconPlus size={18} />
            {t("jk.auto.create")}
          </Link>
        }
      />

      {error ? (
        <ErrorState message={t("jk.auto.error")} onRetry={load} />
      ) : items === null ? (
        <Loading rows={3} height={150} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={IconBot}
          title={t("jk.auto.empty")}
          body={t("jk.auto.emptyBody")}
          action={
            <Link className="jk-btn is-primary" to="/triggers/new">
              <IconPlus size={18} />
              {t("jk.auto.create")}
            </Link>
          }
        />
      ) : (
        <div className="jk-grid-2">
          {items.map((rule) => {
            const then = thenText(t, rule);
            return (
              <article key={rule.id} className={rule.enabled ? "jk-card jk-auto" : "jk-card jk-auto is-off"}>
                <header className="jk-auto-head">
                  <h3>{rule.name}</h3>
                  <Badge tone={rule.enabled ? "solid" : "muted"}>{rule.enabled ? t("jk.auto.active") : t("jk.auto.inactive")}</Badge>
                </header>
                <div className="jk-auto-block">
                  <span className="jk-auto-label">{t("jk.auto.when")}</span>
                  <p>{whenText(t, rule)}</p>
                </div>
                <div className="jk-auto-block">
                  <span className="jk-auto-label">{t("jk.auto.then")}</span>
                  {then ? (
                    <p>{then}</p>
                  ) : (
                    <blockquote className="jk-quote">{truncate(rule.actionConfig.body ?? "")}</blockquote>
                  )}
                </div>
                <p className="jk-auto-meta">
                  {channelText(t, rule.channel)} · {rule.hits === 1 ? t("jk.auto.usedOne") : t("jk.auto.usedMany", { count: rule.hits })}
                </p>
                <footer className="jk-auto-foot">
                  <label className="jk-switch-label">
                    <Switch
                      checked={rule.enabled}
                      disabled={busy === rule.id}
                      label={t("jk.auto.toggle", { name: rule.name })}
                      onChange={(next) => void onToggle(rule, next)}
                    />
                    <span>{rule.enabled ? t("jk.auto.active") : t("jk.auto.inactive")}</span>
                  </label>
                  <span className="jk-auto-actions">
                    <Link className="jk-btn is-secondary is-small" to={`/triggers/${rule.id}/edit`}>
                      <IconPencil size={16} />
                      {t("jk.edit")}
                    </Link>
                    <Dropdown
                      label={t("jk.moreActions", { name: rule.name })}
                      trigger={
                        <span className="jk-icon-btn" aria-hidden="true">
                          <IconMore size={18} />
                        </span>
                      }
                    >
                      {(close) => (
                        <>
                          <button type="button" className="jk-menu-item" onClick={() => { close(); void onDuplicate(rule); }}>
                            <IconCopy size={18} />
                            {t("jk.auto.duplicate")}
                          </button>
                          <Link className="jk-menu-item" to="/triggers/advanced" onClick={close}>
                            <IconCode size={18} />
                            {t("jk.auto.advanced")}
                          </Link>
                          <div className="jk-menu-sep" />
                          <button type="button" className="jk-menu-item" onClick={() => { close(); setToDelete(rule); }}>
                            <IconTrash size={18} />
                            {t("jk.delete")}
                          </button>
                        </>
                      )}
                    </Dropdown>
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <p className="jk-muted jk-small">
        {t("jk.auto.advancedHint")} <Link to="/triggers/advanced">{t("jk.auto.advancedLink")}</Link>
      </p>

      <Fab label={t("jk.auto.create")} icon={IconPlus} onClick={() => navigate("/triggers/new")} />

      {wizardOpen ? (
        <AutomationWizard
          key={editId ?? "new"}
          ruleId={editId}
          onClose={() => navigate("/triggers")}
          onSaved={load}
        />
      ) : null}

      <ConfirmModal
        open={toDelete !== null}
        title={t("jk.auto.deleteTitle")}
        body={t("jk.auto.deleteBody", { name: toDelete?.name ?? "" })}
        confirmLabel={t("jk.delete")}
        busy={busy !== null}
        onConfirm={() => void onDelete()}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

/* ---------- Création / modification en 4 étapes ---------- */

type When = "any" | "keyword" | "code";
type Then = "reply" | "verify" | "software";

type Form = { when: When; word: string; then: Then; reply: string; channel: TriggerChannel; name: string };

const EMPTY: Form = { when: "keyword", word: "", then: "reply", reply: "", channel: "both", name: "" };

function AutomationWizard({ ruleId: id, onClose, onSaved }: { ruleId?: string; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const toast = useToast();
  const { me } = useAuth();
  const [base, setBase] = useState<Trigger | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ word?: string; reply?: string }>({});

  useEffect(() => {
    if (!id) return;
    void api
      .triggers()
      .then((res) => {
        const rule = res.items.find((r) => r.id === id);
        if (!rule) {
          onClose();
          return;
        }
        setBase(rule);
        setForm({
          when: rule.matchType === "keyword" ? "keyword" : rule.matchType === "verification_token" ? "code" : "any",
          word: rule.matchValue ?? "",
          then: rule.actionType === "verify" ? "verify" : rule.actionType === "webhook" ? "software" : "reply",
          reply: rule.actionConfig.body ?? "",
          channel: rule.channel,
          name: rule.name,
        });
      })
      .catch(() => toast({ text: t("jk.auto.error"), tone: "error" }))
      .finally(() => setLoading(false));
  }, [id, onClose, t, toast]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors({});
  };

  const steps = [t("jk.auto.s1"), t("jk.auto.s2"), t("jk.auto.s3"), t("jk.auto.s4")];

  function validate(current: number): boolean {
    if (current === 1 && form.when === "keyword" && !form.word.trim()) {
      setErrors({ word: t("jk.auto.errWord") });
      return false;
    }
    if (current === 3 && form.then === "reply" && !form.reply.trim()) {
      setErrors({ reply: t("jk.auto.errReply") });
      return false;
    }
    return true;
  }

  function next() {
    if (validate(step)) setStep((s) => Math.min(4, s + 1));
  }

  const suggested =
    form.when === "keyword" && form.word.trim()
      ? t("jk.auto.nameWord", { word: form.word.trim() })
      : form.when === "code"
        ? t("jk.auto.nameCode")
        : t("jk.auto.nameAny");

  async function onSave() {
    if (!validate(1)) return setStep(1);
    if (!validate(3)) return setStep(3);
    setBusy(true);
    const keepReaction = base && base.actionType === "reply" && form.then === "reply" && base.reactionId && !form.reply.trim();
    const input: TriggerInput = {
      name: form.name.trim() || suggested,
      enabled: base?.enabled ?? true,
      channel: form.channel,
      matchType: form.when === "keyword" ? "keyword" : form.when === "code" ? "verification_token" : "any",
      matchValue: form.when === "keyword" ? form.word.trim() : null,
      keywordMatch: form.when === "keyword" ? base?.keywordMatch ?? "contains" : undefined,
      listenTypes: base?.listenTypes?.length ? base.listenTypes : ["text"],
      whitelist: base?.whitelist ?? [],
      blacklist: base?.blacklist ?? [],
      stopProcessing: base?.stopProcessing ?? true,
      actionType: form.then === "verify" ? "verify" : form.then === "software" ? "webhook" : "reply",
      actionConfig: form.then === "reply" ? { mode: "text", body: form.reply } : {},
      reactionId: keepReaction ? base.reactionId : null,
    };
    try {
      if (base) await api.updateTrigger(base.id, input);
      else await api.createTrigger(input);
      toast({ text: base ? t("jk.auto.saved") : t("jk.auto.created") });
      onSaved();
      onClose();
    } catch {
      toast({ text: t("jk.auto.saveError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const preview = form.reply.trim() || t("jk.auto.previewEmpty");

  return (
    <Modal
      open
      size="lg"
      title={base ? t("jk.auto.editTitle") : t("jk.auto.create")}
      onClose={onClose}
      // Un clic à côté ou Échap ne fait pas perdre ce qui a été saisi.
      dismissible={false}
      footer={
        loading ? undefined : (
          <>
            {step > 1 ? (
              <button type="button" className="jk-btn is-secondary" onClick={() => setStep((s) => s - 1)}>
                {t("jk.back")}
              </button>
            ) : (
              <button type="button" className="jk-btn is-secondary" onClick={onClose}>
                {t("jk.cancel")}
              </button>
            )}
            {step < 4 ? (
              <button type="button" className="jk-btn is-primary" onClick={next}>
                {t("jk.next")}
              </button>
            ) : (
              <button type="button" className="jk-btn is-primary" disabled={busy} onClick={() => void onSave()}>
                {busy ? t("jk.saving") : base ? t("jk.save") : t("jk.auto.createBtn")}
              </button>
            )}
          </>
        )
      }
    >
      {loading ? (
        <Loading rows={3} height={80} />
      ) : (
        <div className="jk-wizard">
          <p className="jk-muted">{t("jk.auto.wizardSub")}</p>
          <ol className="jk-steps" aria-label={t("jk.auto.steps")}>
            {steps.map((label, index) => {
              const n = index + 1;
              return (
                <li key={label} className={n === step ? "is-current" : n < step ? "is-done" : ""} aria-current={n === step ? "step" : undefined}>
                  <span className="jk-steps-num" aria-hidden="true">
                    {n < step ? <IconCheck size={14} /> : n}
                  </span>
                  <span className="jk-steps-label">{label}</span>
                </li>
              );
            })}
          </ol>

          <div className="jk-wizard-card">
            {step === 1 ? (
              <fieldset className="jk-choices">
                <legend>{t("jk.auto.q1")}</legend>
                <Choice name="when" checked={form.when === "any"} onSelect={() => set("when", "any")} icon={IconMessage} title={t("jk.auto.o1a")} description={t("jk.auto.o1aD")} />
                <Choice name="when" checked={form.when === "keyword"} onSelect={() => set("when", "keyword")} icon={IconTag} title={t("jk.auto.o1b")} description={t("jk.auto.o1bD")} />
                <Choice name="when" checked={form.when === "code"} onSelect={() => set("when", "code")} icon={IconShieldCheck} title={t("jk.auto.o1c")} description={t("jk.auto.o1cD")} />
                {form.when === "keyword" ? (
                  <Field label={t("jk.auto.word")} hint={t("jk.auto.wordHint")} error={errors.word}>
                    <input value={form.word} placeholder={t("jk.auto.wordPh")} onChange={(event) => set("word", event.target.value)} />
                  </Field>
                ) : null}
              </fieldset>
            ) : null}

            {step === 2 ? (
              <fieldset className="jk-choices">
                <legend>{t("jk.auto.q2")}</legend>
                <Choice name="then" checked={form.then === "reply"} onSelect={() => set("then", "reply")} icon={IconMessage} title={t("jk.auto.o2a")} description={t("jk.auto.o2aD")} />
                <Choice name="then" checked={form.then === "verify"} onSelect={() => set("then", "verify")} icon={IconShieldCheck} title={t("jk.auto.o2b")} description={t("jk.auto.o2bD")} />
                <Choice name="then" checked={form.then === "software"} onSelect={() => set("then", "software")} icon={IconCode} title={t("jk.auto.o2c")} description={me?.tenant.webhookUrl ? t("jk.auto.o2cD") : t("jk.auto.o2cNone")} />
              </fieldset>
            ) : null}

            {step === 3 ? (
              <div className="jk-choices">
                {form.then === "reply" ? (
                  <>
                    <h2 className="jk-wizard-q">{t("jk.auto.q3")}</h2>
                    <Field label={t("jk.auto.reply")} hint={t("jk.auto.replyHint")} error={errors.reply}>
                      <textarea rows={5} value={form.reply} placeholder={t("jk.auto.replyPh")} onChange={(event) => set("reply", event.target.value)} />
                    </Field>
                    <div className="jk-preview" aria-label={t("jk.auto.preview")}>
                      <span className="jk-auto-label">{t("jk.auto.preview")}</span>
                      <div className="jk-bubble">
                        <p>{form.when === "keyword" && form.word ? form.word : t("jk.auto.sample")}</p>
                      </div>
                      <div className="jk-bubble is-out">
                        <p>{preview.replaceAll("{{name}}", "Awa")}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="jk-wizard-q">{t("jk.auto.q3other")}</h2>
                    <p className="jk-muted">{form.then === "verify" ? t("jk.auto.verifyInfo") : t("jk.auto.softwareInfo")}</p>
                  </>
                )}
                <fieldset className="jk-choices">
                  <legend className="jk-legend-small">{t("jk.auto.channel")}</legend>
                  <div className="jk-seg">
                    {(["both", "whatsapp", "telegram"] as TriggerChannel[]).map((value) => (
                      <label key={value} className={form.channel === value ? "jk-seg-item is-on" : "jk-seg-item"}>
                        <input type="radio" name="channel" checked={form.channel === value} onChange={() => set("channel", value)} />
                        {channelText(t, value)}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="jk-choices">
                <h2 className="jk-wizard-q">{t("jk.auto.q4")}</h2>
                <dl className="jk-summary">
                  <div>
                    <dt>{t("jk.auto.when")}</dt>
                    <dd>{whenText(t, { matchType: form.when === "keyword" ? "keyword" : form.when === "code" ? "verification_token" : "any", matchValue: form.word })}</dd>
                  </div>
                  <div>
                    <dt>{t("jk.auto.then")}</dt>
                    <dd>
                      {form.then === "reply" ? (
                        <>
                          {t("jk.auto.replyWith")}
                          <blockquote className="jk-quote">{truncate(form.reply, 300)}</blockquote>
                        </>
                      ) : form.then === "verify" ? (
                        t("jk.auto.thenVerify")
                      ) : (
                        t("jk.auto.thenSoftware")
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("jk.auto.channel")}</dt>
                    <dd>{channelText(t, form.channel)}</dd>
                  </div>
                </dl>
                <Field label={t("jk.auto.name")} hint={t("jk.auto.nameHint")}>
                  <input value={form.name} placeholder={suggested} onChange={(event) => set("name", event.target.value)} />
                </Field>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
}
