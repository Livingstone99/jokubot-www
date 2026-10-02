import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api, type WhatsAppPair } from "../api.js";
import { useAuth } from "../auth.js";
import { describeChannel } from "../ChannelLink.js";
import { IconChevronRight, IconEye, IconEyeOff, IconPlus, IconQrCode, IconRefresh, IconTelegram, IconWhatsApp } from "../jk/icons.js";
import { Badge, Card, ConfirmModal, Fab, Field, Modal, PageTitle, useToast, type BadgeTone } from "../jk/ui.js";
import { useT } from "../locale.js";
import { WhatsAppNumberField } from "../WhatsAppNumberField.js";

type Channel = "whatsapp" | "telegram";

function toneOf(status: string): BadgeTone {
  if (status === "connected") return "solid";
  if (status === "off" || status === "disconnected") return "muted";
  return "outline";
}

/** Les deux grandes cartes de canaux, utilisées sur le tableau de bord et la page Canaux. */
export function ChannelCards({ adding = false, onAddingChange }: { adding?: boolean; onAddingChange?: (open: boolean) => void } = {}) {
  const t = useT();
  const { me } = useAuth();
  const [connect, setConnect] = useState<Channel | null>(null);
  const [manage, setManage] = useState<Channel | null>(null);
  const tenant = me?.tenant;

  const cards: Array<{ id: Channel; name: string; value: string | null; Icon: typeof IconWhatsApp }> = [
    { id: "whatsapp", name: "WhatsApp", value: tenant?.whatsappNumber ?? null, Icon: IconWhatsApp },
    {
      id: "telegram",
      name: "Telegram",
      value: tenant?.telegramBotUsername ? `@${tenant.telegramBotUsername}` : null,
      Icon: IconTelegram,
    },
  ];

  return (
    <>
      <div className="jk-grid-2">
        {cards.map(({ id, name, value }) => {
          const state = describeChannel(t, id, tenant);
          const linked = id === "whatsapp" ? tenant?.whatsappLinked : tenant?.telegramLinked;
          return (
            <article key={id} className="jk-card jk-channel">
              <div className="jk-channel-top">
                <img
                  className="jk-channel-logo"
                  src={`${import.meta.env.BASE_URL}channels/${id}.jpg`}
                  alt=""
                  width={52}
                  height={52}
                />
                <Badge tone={toneOf(state.status)}>{state.label}</Badge>
              </div>
              <h3>{name}</h3>
              <p className="jk-channel-value">{value ?? t("jk.ch.notSet")}</p>
              {state.status !== "connected" && state.status !== "off" ? <p className="jk-muted jk-small">{state.detail}</p> : null}
              {linked || state.status === "connected" ? (
                <button type="button" className="jk-btn is-secondary is-block" onClick={() => setManage(id)}>
                  {id === "whatsapp" ? t("jk.ch.manageWa") : t("jk.ch.manageTg")}
                </button>
              ) : (
                <button type="button" className="jk-btn is-primary is-block" onClick={() => setConnect(id)}>
                  {id === "whatsapp" ? t("jk.ch.connectWa") : t("jk.ch.connectTg")}
                </button>
              )}
            </article>
          );
        })}
      </div>
      <AddNetwork
        open={adding}
        onClose={() => onAddingChange?.(false)}
        onPick={(id) => {
          onAddingChange?.(false);
          setConnect(id);
        }}
      />
      <ConnectWhatsApp open={connect === "whatsapp"} onClose={() => setConnect(null)} />
      <ConnectTelegram open={connect === "telegram"} onClose={() => setConnect(null)} />
      <ManageChannel channel={manage} onClose={() => setManage(null)} onReplace={(id) => { setManage(null); setConnect(id); }} />
    </>
  );
}

/* ---------- Ajouter un réseau : choix du réseau, puis sa connexion ---------- */

function AddNetwork({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: Channel) => void }) {
  const t = useT();
  const { me } = useAuth();
  const networks: Array<{ id: Channel; name: string; linked: boolean }> = [
    { id: "whatsapp", name: "WhatsApp", linked: Boolean(me?.tenant.whatsappLinked) },
    { id: "telegram", name: "Telegram", linked: Boolean(me?.tenant.telegramLinked) },
  ];
  return (
    <Modal open={open} title={t("jk.ch.add")} onClose={onClose}>
      <p className="jk-muted">{t("jk.ch.addIntro")}</p>
      <ul className="jk-network-list">
        {networks.map((n) => (
          <li key={n.id}>
            <button type="button" className="jk-network" onClick={() => onPick(n.id)}>
              <img src={`${import.meta.env.BASE_URL}channels/${n.id}.jpg`} alt="" width={40} height={40} />
              <span className="jk-network-text">
                <strong>{n.name}</strong>
                <span>{n.linked ? t("jk.ch.addLinked") : t("jk.ch.addNotLinked")}</span>
              </span>
              <IconChevronRight size={18} />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/* ---------- Connexion WhatsApp : numéro, puis QR code ---------- */

function ConnectWhatsApp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { me, setMe } = useAuth();
  const [number, setNumber] = useState(me?.tenant.whatsappNumber ?? "");
  const [pair, setPair] = useState<WhatsAppPair | null>(null);
  const [step, setStep] = useState<"number" | "qr">("number");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("number");
      setPair(null);
      setError(null);
    }
  }, [open]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Suivi de l'association toutes les 2 s tant que le QR est affiché :
  // la fenêtre reste ouverte jusqu'à ce que WhatsApp confirme le scan.
  useEffect(() => {
    if (!open || step !== "qr") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const result = await api.whatsappPair();
        if (cancelled) return;
        setPair(result.pair);
        setMe((current) => (current ? { ...current, tenant: result.tenant } : current));
        if (result.tenant.whatsappLinked || result.pair.status === "linked") {
          toast({ text: t("jk.ch.waLinked") });
          closeRef.current();
        }
      } catch {
        // On garde le dernier QR affiché si une lecture échoue.
      }
    };
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, step, setMe, toast, t]);

  async function onStart() {
    if (!number.trim()) {
      setError(t("jk.ch.numberRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.startWhatsAppPair(number.trim());
      setPair(result.pair);
      setMe((current) => (current ? { ...current, tenant: result.tenant } : current));
      setStep("qr");
    } catch {
      setError(t("jk.ch.waStartError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={t("jk.ch.connectWa")}
      onClose={onClose}
      dismissible={step === "number"}
      footer={
        step === "number" ? (
          <>
            <button type="button" className="jk-btn is-secondary" onClick={onClose}>
              {t("jk.cancel")}
            </button>
            <button type="button" className="jk-btn is-primary" disabled={busy} onClick={() => void onStart()}>
              {busy ? t("jk.loading") : t("jk.ch.showQr")}
            </button>
          </>
        ) : (
          <button type="button" className="jk-btn is-secondary" onClick={onClose}>
            {t("jk.cancel")}
          </button>
        )
      }
    >
      {step === "number" ? (
        <>
          <p className="jk-muted">{t("jk.ch.waIntro")}</p>
          <WhatsAppNumberField value={number} preferredCountry={me?.tenant.country} onChange={setNumber} />
          {error ? <p className="jk-inline-error">{error}</p> : null}
        </>
      ) : (
        <div className="jk-qr">
          <p className="jk-muted">{t("jk.ch.scan")}</p>
          <div className="jk-qr-box">
            {pair?.qrDataUrl ? (
              <img src={pair.qrDataUrl} alt={t("jk.ch.qrAlt")} />
            ) : (
              <span className="jk-qr-placeholder">
                <IconQrCode size={40} />
              </span>
            )}
          </div>
          {pair?.pairingCode ? (
            <p className="jk-muted">
              {t("jk.ch.orCode")} <strong className="jk-code">{pair.pairingCode}</strong>
            </p>
          ) : null}
          <p className="jk-waiting">
            <span className="jk-spinner" aria-hidden="true" />
            {pair?.status === "error" ? t("jk.ch.pairError") : t("jk.ch.waiting")}
          </p>
          <p className="jk-muted jk-small">{t("jk.ch.keepOpen")}</p>
          <ol className="jk-steps-small">
            <li>{t("jk.ch.waStep1")}</li>
            <li>{t("jk.ch.waStep2")}</li>
            <li>{t("jk.ch.waStep3")}</li>
          </ol>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Connexion Telegram : jeton du bot ---------- */

function ConnectTelegram({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { setMe } = useAuth();
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConnect() {
    const value = token.trim();
    if (!/^\d+:[\w-]{20,}$/.test(value)) {
      setError(t("jk.ch.tokenInvalid"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.connectTelegram(value);
      setMe((current) => (current ? { ...current, tenant: result.tenant } : current));
      toast({ text: t("jk.ch.tgLinked") });
      setToken("");
      onClose();
    } catch {
      setError(t("jk.ch.tgError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={t("jk.ch.connectTg")}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="jk-btn is-secondary" onClick={onClose}>
            {t("jk.cancel")}
          </button>
          <button type="button" className="jk-btn is-primary" disabled={busy} onClick={() => void onConnect()}>
            {busy ? t("jk.loading") : t("jk.ch.connectTg")}
          </button>
        </>
      }
    >
      <ol className="jk-steps-small">
        <li>{t("jk.ch.tgStep1")}</li>
        <li>{t("jk.ch.tgStep2")}</li>
        <li>{t("jk.ch.tgStep3")}</li>
      </ol>
      <Field label={t("jk.ch.token")} error={error}>
        <span className="jk-input-icon">
          <input
            type={show ? "text" : "password"}
            value={token}
            autoComplete="off"
            spellCheck={false}
            placeholder="123456789:AAH…"
            onChange={(event) => setToken(event.target.value)}
          />
          <button
            type="button"
            className="jk-icon-btn"
            aria-label={show ? t("jk.hide") : t("jk.show")}
            aria-pressed={show}
            onClick={() => setShow((value) => !value)}
          >
            {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        </span>
      </Field>
    </Modal>
  );
}

/* ---------- Gérer un canal connecté ---------- */

function ManageChannel({
  channel,
  onClose,
  onReplace,
}: {
  channel: Channel | null;
  onClose: () => void;
  onReplace: (channel: Channel) => void;
}) {
  const t = useT();
  const toast = useToast();
  const { me, setMe } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const tenant = me?.tenant;
  const state = channel ? describeChannel(t, channel, tenant) : null;
  const name = channel === "telegram" ? "Telegram" : "WhatsApp";

  async function run(action: "disconnect" | "reconnect") {
    if (!channel) return;
    setBusy(true);
    try {
      const result =
        channel === "whatsapp"
          ? action === "disconnect"
            ? await api.disconnectWhatsApp()
            : await api.reconnectWhatsApp()
          : action === "disconnect"
            ? await api.disconnectTelegram()
            : await api.reconnectTelegram();
      setMe((current) => (current ? { ...current, tenant: result.tenant } : current));
      toast({ text: action === "disconnect" ? t("jk.ch.disconnected", { name }) : t("jk.ch.reconnecting", { name }) });
      setConfirm(false);
      onClose();
    } catch {
      toast({ text: t("jk.ch.actionError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal open={channel !== null && !confirm} title={t("jk.ch.manageTitle", { name })} onClose={onClose}>
        {channel && state ? (
          <>
            <dl className="jk-details">
              <div>
                <dt>{t("jk.ch.status")}</dt>
                <dd>
                  <Badge tone={toneOf(state.status)}>{state.label}</Badge>
                </dd>
              </div>
              <div>
                <dt>{channel === "whatsapp" ? t("jk.ch.number") : t("jk.ch.bot")}</dt>
                <dd>{channel === "whatsapp" ? tenant?.whatsappNumber ?? "—" : tenant?.telegramBotUsername ? `@${tenant.telegramBotUsername}` : "—"}</dd>
              </div>
            </dl>
            <div className="jk-stack-btns">
              <button type="button" className="jk-btn is-secondary is-block" disabled={busy} onClick={() => void run("reconnect")}>
                <IconRefresh size={18} />
                {t("jk.ch.reconnect")}
              </button>
              <button type="button" className="jk-btn is-secondary is-block" onClick={() => onReplace(channel)}>
                {channel === "whatsapp" ? t("jk.ch.otherNumber") : t("jk.ch.otherBot")}
              </button>
              <button type="button" className="jk-btn is-primary is-block" onClick={() => setConfirm(true)}>
                {t("jk.ch.disconnect")}
              </button>
            </div>
          </>
        ) : null}
      </Modal>
      <ConfirmModal
        open={confirm}
        title={t("jk.ch.disconnectTitle", { name })}
        body={t("jk.ch.disconnectBody")}
        confirmLabel={t("jk.ch.disconnect")}
        busy={busy}
        onConfirm={() => void run("disconnect")}
        onClose={() => setConfirm(false)}
      />
    </>
  );
}

/* ---------- Page Canaux ---------- */

export function ChannelsPage() {
  const t = useT();
  const [search, setSearch] = useSearchParams();
  // « + » du menu Canaux : /channels?add=1 ouvre directement le choix du réseau.
  const adding = search.get("add") === "1";
  const setAdding = (open: boolean) => setSearch(open ? { add: "1" } : {}, { replace: true });
  return (
    <div className="jk-page">
      <PageTitle
        title={t("jk.ch.title")}
        subtitle={t("jk.ch.subtitle")}
        actions={
          <button type="button" className="jk-btn is-primary is-hide-mobile" onClick={() => setAdding(true)}>
            <IconPlus size={18} />
            {t("jk.ch.add")}
          </button>
        }
      />
      <ChannelCards adding={adding} onAddingChange={setAdding} />
      <Fab label={t("jk.ch.add")} icon={IconPlus} onClick={() => setAdding(true)} />
      <Card title={t("jk.ch.howTitle")}>
        <ul className="jk-bullets">
          <li>{t("jk.ch.how1")}</li>
          <li>{t("jk.ch.how2")}</li>
          <li>{t("jk.ch.how3")}</li>
        </ul>
      </Card>
    </div>
  );
}
