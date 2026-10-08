// Parcours de connexion des messageries.

import { useEffect, useMemo, useRef, useState } from "react";

import * as api from "../api.js";
import { network } from "../catalog.js";
import { ACCOUNT_TYPES, RHYTHM_LABEL } from "../social.js";
import type { NetworkId, SocialId } from "../db.js";
import { fullPhone } from "../format.js";
import { t } from "../prefs.js";
import { copyText, Icon, Rich, Spinner, useMedia, usePolling, useToast } from "../ui.js";
import { list, phone, str, type Values } from "../wizard/fields.js";
import type { FlowDef, StepContext } from "../wizard/Wizard.js";

const BACK = { to: "/", label: "Connexions" };

/* ------------------------------ WhatsApp ------------------------------ */

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** QR de démonstration : il a l'allure d'un vrai code et change à chaque renouvellement. */
function DemoQr({ seed }: { seed: string }) {
  const size = 25;
  const cells = useMemo(() => {
    const out: string[] = [];
    let state = hash(seed) || 1;
    const finder = (x: number, y: number) => {
      for (const [fx, fy] of [
        [0, 0],
        [size - 7, 0],
        [0, size - 7],
      ] as const) {
        const dx = x - fx;
        const dy = y - fy;
        if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
          if (dx === -1 || dy === -1 || dx === 7 || dy === 7) return 0;
          const ring = Math.min(dx, dy, 6 - dx, 6 - dy);
          return ring === 1 ? 0 : 1;
        }
      }
      return -1;
    };
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const fixed = finder(x, y);
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        const on = fixed === -1 ? (state >>> 0) % 100 < 48 : fixed === 1;
        if (on) out.push(`M${x} ${y}h1v1h-1z`);
      }
    }
    return out.join("");
  }, [seed]);
  return (
    <svg className="qr-svg" viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label={t("Code QR à scanner avec WhatsApp")}>
      <rect x="-2" y="-2" width={size + 4} height={size + 4} fill="#fff" />
      <path d={cells} fill="#000" />
    </svg>
  );
}

function WhatsAppLink({ context }: { context: StepContext }) {
  const touch = useMedia("(pointer: coarse)");
  const [mode, setMode] = useState<"code" | "qr">(touch ? "code" : "qr");
  const [status, setStatus] = useState<{ linked: boolean; qrSeed: string; secondsLeft: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const code = str(context.values._code);
  const advanced = useRef(false);

  usePolling(
    async () => {
      try {
        const next = await api.whatsappStatus();
        setStatus(next);
        setError(null);
        if (next.linked && !advanced.current) {
          advanced.current = true;
          setTimeout(context.next, 900);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("La liaison a échoué. Revenez en arrière pour recommencer."));
      }
    },
    2000,
    !status?.linked,
  );

  const tabs = [
    { id: "code", label: "Code à saisir" },
    { id: "qr", label: "QR code" },
  ] as const;

  return (
    <div className="link-box">
      <div className="segmented" role="tablist" aria-label={t("Façon de relier le téléphone")}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={mode === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={mode === tab.id ? 0 : -1}
            className={`segment${mode === tab.id ? " is-active" : ""}`}
            onClick={() => setMode(tab.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                const other = tab.id === "code" ? "qr" : "code";
                setMode(other);
                document.getElementById(`tab-${other}`)?.focus();
              }
            }}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {mode === "code" ? (
        <div id="panel-code" role="tabpanel" aria-labelledby="tab-code" className="link-panel">
          <p className="pair-code" aria-label={`Code : ${code.split("").join(" ")}`}>
            {code}
          </p>
          <div className="link-buttons">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => toast((await copyText(code)) ? t("Code copié") : t("Copie impossible : recopiez le code à la main."))}
            >
              <Icon name="copy" size={18} />
              {t("Copier le code")}
            </button>
            <a className="btn btn-ghost" href="whatsapp://">
              <Icon name="external" size={18} />
              {t("Ouvrir WhatsApp")}
            </a>
          </div>
          <ol className="howto">
            <li>{t("Ouvrez WhatsApp sur le téléphone de ce numéro.")}</li>
            <li>
              <Rich text="Touchez **Paramètres** (iPhone) ou **⋮** (Android), puis **Appareils connectés**." />
            </li>
            <li>
              <Rich text="Touchez **Connecter un appareil**, puis **Connecter avec le numéro de téléphone**." />
            </li>
            <li>{t("Saisissez le code ci-dessus.")}</li>
          </ol>
        </div>
      ) : (
        <div id="panel-qr" role="tabpanel" aria-labelledby="tab-qr" className="link-panel">
          <div className="qr">
            {status ? <DemoQr seed={status.qrSeed} /> : <div className="qr-wait"><Spinner label="Préparation du code QR" /></div>}
            <span className="qr-scan" aria-hidden="true" />
          </div>
          <p className="qr-timer">
            {status ? t("Le code QR se renouvelle dans {n} s.", { n: status.secondsLeft }) : t("Préparation du code QR…")}
          </p>
          <ol className="howto">
            <li>{t("Ouvrez WhatsApp sur le téléphone de ce numéro.")}</li>
            <li>
              <Rich text="Touchez **Appareils connectés**, puis **Connecter un appareil**." />
            </li>
            <li>{t("Pointez l'appareil photo vers ce code.")}</li>
          </ol>
        </div>
      )}

      <p className={`link-status${status?.linked ? " is-linked" : ""}`} role="status">
        {status?.linked ? (
          <>
            <Icon name="check" size={18} /> {t("Téléphone relié !")}
          </>
        ) : error ? (
          <span className="field-error">{error}</span>
        ) : (
          <>
            <Spinner /> {t("En attente de votre téléphone…")}
          </>
        )}
      </p>
    </div>
  );
}

function phoneLabel(values: Values): string {
  const p = phone(values.phone);
  return fullPhone(p.dial, p.number);
}

export const whatsappFlow: FlowDef = {
  title: "Connecter WhatsApp",
  description: "Reliez votre numéro WhatsApp en deux minutes. Gardez votre téléphone à portée de main.",
  back: BACK,
  initial: { phone: { dial: "+225", number: "" } },
  steps: [
    {
      id: "numero",
      label: "Numéro",
      title: "Quel numéro WhatsApp voulez-vous relier ?",
      help: "C'est le numéro sur lequel vos clients vous écrivent. JokuBot leur répondra depuis ce numéro.",
      fields: [{ kind: "phone", name: "phone", label: "Numéro WhatsApp" }],
      onSubmit: async (values) => {
        const { code } = await api.whatsappStart(phoneLabel(values));
        return { patch: { _code: code } };
      },
    },
    {
      id: "liaison",
      label: "Liaison du téléphone",
      title: "Reliez votre téléphone",
      help: (values) => t("Utilisez le téléphone du {numero}. Cette page avance seule dès que c'est fait.", { numero: phoneLabel(values) }),
      render: (context) => <WhatsAppLink context={context} />,
      hideSubmit: true,
    },
  ],
  done: {
    title: "WhatsApp est connecté",
    text: (values) => t("JokuBot peut maintenant répondre à vos clients sur le {numero}.", { numero: phoneLabel(values) }),
    primary: { label: "Apprendre mon activité à JokuBot", to: "/conversations" },
    secondary: { label: "Retour aux connexions", to: "/" },
  },
};

/* ------------------------------ Telegram ------------------------------ */

const BOTFATHER_URL = "https://t.me/BotFather";

function BotFatherLink() {
  return (
    <div className="link-box">
      <a className="btn btn-primary btn-block" href={BOTFATHER_URL} target="_blank" rel="noreferrer">
        <Icon name="external" size={18} />
        {t("Ouvrir BotFather dans Telegram")}
      </a>
      <ol className="howto">
        <li>
          <Rich text="Dans Telegram, écrivez à **BotFather** (le compte officiel, avec la coche bleue)." />
        </li>
        <li>
          <Rich text="Envoyez **/newbot**, puis donnez un nom à votre bot, par exemple Boutique Awa." />
        </li>
        <li>
          <Rich text="Choisissez un identifiant qui finit par **bot**, par exemple BoutiqueAwaBot." />
        </li>
        <li>{t("BotFather vous envoie un jeton qui ressemble à 123456789:AAH… : copiez-le.")}</li>
      </ol>
    </div>
  );
}

export const telegramFlow: FlowDef = {
  title: "Connecter Telegram",
  description: "Créez votre bot Telegram avec BotFather, puis collez son jeton : JokuBot répondra à vos clients avec ce bot.",
  back: BACK,
  initial: { token: "", _bot: "" },
  steps: [
    {
      id: "botfather",
      label: "BotFather",
      title: "Créez votre bot avec BotFather",
      render: () => <BotFatherLink />,
      submitLabel: "J'ai copié le jeton",
    },
    {
      id: "jeton",
      label: "Jeton du bot",
      title: "Collez le jeton du bot",
      fields: [
        {
          kind: "secret",
          name: "token",
          label: "Jeton du bot",
          placeholder: "123456789:AAH…",
          required: "Collez le jeton que BotFather vous a envoyé.",
          validate: (value) =>
            /^\d{5,}:[A-Za-z0-9_-]{5,}$/.test(str(value).trim())
              ? null
              : "Ce jeton semble incomplet. Il ressemble à 123456789:AAH… : copiez-le en entier depuis BotFather.",
        },
      ],
      submitLabel: "Connecter Telegram",
      onSubmit: async (values) => {
        const bot = await api.telegramBotConnect(str(values.token));
        return { patch: { _bot: bot.username } };
      },
    },
  ],
  done: {
    title: "Telegram est connecté",
    text: (values) => (
      <>
        {t("Vos clients peuvent écrire à votre bot : JokuBot leur répond.")}{" "}
        <a href={`https://t.me/${str(values._bot)}`} target="_blank" rel="noreferrer">
          t.me/{str(values._bot)}
        </a>
      </>
    ),
    primary: { label: "Apprendre mon activité à JokuBot", to: "/conversations" },
    secondary: { label: "Retour aux connexions", to: "/" },
  },
};

/* -------------- Réseaux sociaux (PostFast, connexion fictive) -------------- */

function SocialAuthorize({ network: id, context }: { network: SocialId; context: StepContext }) {
  const name = network(id).name;
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const advanced = useRef(false);

  usePolling(
    async () => {
      try {
        const status = await api.socialStatus(id);
        setError(null);
        if (status.connected && !advanced.current) {
          advanced.current = true;
          setConnected(true);
          context.set("_account", status.account ?? "");
          setTimeout(context.next, 900);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("La connexion a échoué. Touchez de nouveau le bouton pour recommencer."));
        setStarted(false);
      }
    },
    3000,
    started && !connected,
  );

  const start = async () => {
    setError(null);
    setStarting(true);
    try {
      await api.socialStart(id);
      setStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("La connexion a échoué. Touchez de nouveau le bouton pour recommencer."));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="link-box">
      <button type="button" className="btn btn-primary btn-block" onClick={() => void start()} disabled={starting || connected} aria-busy={starting}>
        {starting ? <Spinner /> : <Icon name="external" size={18} />}
        {started ? t("Rouvrir la page de connexion") : t("Continuer sur {reseau}", { reseau: name })}
      </button>
      <ol className="howto">
        <li>{t("Une page sécurisée s'ouvre dans un nouvel onglet.")}</li>
        <li>{t("Connectez-vous à {reseau} et autorisez JokuBot.", { reseau: name })}</li>
        <li>{t("Revenez ici : cette fenêtre avance seule.")}</li>
      </ol>
      <p className="demo-note">{t("Démonstration : le compte se connecte seul après quelques secondes.")}</p>
      <p className={`link-status${connected ? " is-linked" : ""}`} role="status">
        {connected ? (
          <>
            <Icon name="check" size={18} /> {t("Compte relié !")}
          </>
        ) : error ? (
          <span className="field-error">{error}</span>
        ) : started ? (
          <>
            <Spinner /> {t("En attente de votre connexion…")}
          </>
        ) : (
          t("Touchez le bouton ci-dessus pour commencer.")
        )}
      </p>
    </div>
  );
}

// Textes fixes par réseau, pour qu'ils restent traduisibles.
const SOCIAL_FLOW_TEXT: Record<SocialId, { title: string; done: string; description: string; manage: string }> = {
  facebook: {
    title: "Connecter Facebook",
    done: "Facebook est connecté",
    description: "JokuBot publie sur votre page Facebook et répond à ses messages.",
    manage: "Gérer Facebook",
  },
  instagram: {
    title: "Connecter Instagram",
    done: "Instagram est connecté",
    description: "JokuBot publie sur votre compte Instagram professionnel.",
    manage: "Gérer Instagram",
  },
  x: {
    title: "Connecter X",
    done: "X est connecté",
    description: "JokuBot publie sur votre compte X (Twitter).",
    manage: "Gérer X",
  },
  tiktok: {
    title: "Connecter TikTok",
    done: "TikTok est connecté",
    description: "JokuBot publie vos vidéos sur votre compte TikTok.",
    manage: "Gérer TikTok",
  },
};

function socialFlow(id: SocialId): FlowDef {
  const text = SOCIAL_FLOW_TEXT[id];
  const types = ACCOUNT_TYPES[id];
  return {
    title: text.title,
    description: text.description,
    back: { to: `/reseaux/${id}`, label: "Retour" },
    initial: {
      _account: "",
      accountType: types.find((type) => !type.disabled)?.value ?? "",
      rhythm: "3-semaine",
      time: "18:00",
      topics: ["produits", "promotions"],
    },
    steps: [
      {
        id: "compte",
        label: "Compte",
        title: "Quel type de compte ?",
        fields: [
          {
            kind: "radio",
            name: "accountType",
            label: "Type de compte",
            columns: types.length > 2 ? 3 : 2,
            options: types,
            required: "Choisissez le type de compte à relier.",
          },
        ],
      },
      {
        id: "autorisation",
        label: "Autorisation",
        title: text.title,
        render: (context) => <SocialAuthorize network={id} context={context} />,
        hideSubmit: true,
      },
      {
        id: "publication",
        label: "Publication",
        title: "À quel rythme JokuBot publie-t-il ?",
        fields: [
          {
            kind: "radio",
            name: "rhythm",
            label: "Rythme",
            columns: 2,
            options: (Object.keys(RHYTHM_LABEL) as (keyof typeof RHYTHM_LABEL)[]).map((value) => ({ value, label: RHYTHM_LABEL[value] })),
          },
          {
            kind: "time",
            name: "time",
            label: "Heure de publication",
            when: (v) => v.rhythm !== "manuel",
            required: "Choisissez l'heure de publication.",
          },
          {
            kind: "checks",
            name: "topics",
            label: "Sujets à publier",
            columns: 2,
            options: [
              { value: "produits", label: "Nouveaux produits" },
              { value: "promotions", label: "Promotions" },
              { value: "conseils", label: "Conseils" },
              { value: "coulisses", label: "Coulisses de la boutique" },
            ],
            required: "Choisissez au moins un sujet.",
          },
        ],
        submitLabel: "Terminer",
        onSubmit: async (values) => {
          await api.saveSocialPrefs(id, {
            accountType: str(values.accountType),
            rhythm: str(values.rhythm) as "jour",
            time: str(values.time),
            topics: list(values.topics),
          });
        },
      },
    ],
    done: {
      title: text.done,
      text: (values) =>
        str(values._account)
          ? t("JokuBot peut maintenant publier sur {compte}.", { compte: str(values._account) })
          : t("JokuBot peut maintenant publier sur ce compte."),
      primary: { label: text.manage, to: `/reseaux/${id}` },
      secondary: { label: "Retour aux connexions", to: "/" },
    },
  };
}

/* ------------------- PostFast : tous les réseaux sociaux ------------------- */

const POSTFAST_URL = "https://app.postfa.st";

function PostFastLink() {
  return (
    <div className="link-box">
      <a className="btn btn-primary btn-block" href={POSTFAST_URL} target="_blank" rel="noreferrer">
        <Icon name="external" size={18} />
        {t("Ouvrir PostFast")}
      </a>
      <ol className="howto">
        <li>{t("Créez votre compte PostFast, ou connectez-vous.")}</li>
        <li>{t("Connectez vos réseaux dans PostFast : Facebook, Instagram, X, TikTok…")}</li>
        <li>
          <Rich text="Dans **Workspace Settings**, créez une **clé API** et copiez-la." />
        </li>
      </ol>
    </div>
  );
}

const SOCIAL_NAMES: Record<SocialId, string> = { facebook: "Facebook", instagram: "Instagram", x: "X", tiktok: "TikTok" };

export const postfastFlow: FlowDef = {
  title: "Connecter PostFast",
  description: "Une seule connexion pour tous vos réseaux sociaux.",
  back: BACK,
  initial: { apiKey: "", _found: [] },
  steps: [
    {
      id: "postfast",
      label: "PostFast",
      title: "Connectez vos réseaux dans PostFast",
      render: () => <PostFastLink />,
      submitLabel: "J'ai copié la clé",
    },
    {
      id: "cle",
      label: "Clé API",
      title: "Collez votre clé API PostFast",
      fields: [
        {
          kind: "secret",
          name: "apiKey",
          label: "Clé API PostFast",
          required: "Collez la clé API copiée dans PostFast.",
          validate: (value) => (str(value).trim().length >= 8 ? null : "Cette clé semble incomplète : copiez-la en entier depuis PostFast."),
        },
      ],
      submitLabel: "Connecter mes réseaux",
      onSubmit: async (values) => {
        const { networks } = await api.postfastConnect(str(values.apiKey));
        return { patch: { _found: networks, apiKey: "" } };
      },
    },
  ],
  done: {
    title: "PostFast est connecté",
    text: (values) => {
      const found = list(values._found) as SocialId[];
      return found.length
        ? t("Réseaux reliés : {reseaux}.", { reseaux: found.map((id) => SOCIAL_NAMES[id]).join(", ") })
        : t("Aucun réseau n'est encore relié dans PostFast. Connectez-les dans PostFast, puis recommencez.");
    },
    primary: { label: "Voir mes réseaux", to: "/" },
    secondary: { label: "Apprendre mon activité à JokuBot", to: "/conversations" },
  },
};

export const CHANNEL_FLOWS: Partial<Record<NetworkId, FlowDef>> = {
  whatsapp: whatsappFlow,
  telegram: telegramFlow,
  facebook: socialFlow("facebook"),
  instagram: socialFlow("instagram"),
  x: socialFlow("x"),
  tiktok: socialFlow("tiktok"),
};
