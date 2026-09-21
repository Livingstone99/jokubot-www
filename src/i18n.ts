export type Locale = "fr" | "en";

export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_KEY = "mvs.locale";

export type MessageVars = Record<string, string | number>;

const en = {
  "common.whatsapp": "WhatsApp",
  "common.telegram": "Telegram",

  "locale.label": "Language",
  "locale.fr": "FR",
  "locale.en": "EN",

  "theme.toLight": "Switch to light theme",
  "theme.toDark": "Switch to dark theme",

  "nav.status": "Status",
  "nav.security": "Security",
  "nav.docs": "Docs",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",

  "meta.title": "jokubot — WhatsApp and Telegram verification",
  "meta.description":
    "Issue a one-time code. The customer sends it on WhatsApp or Telegram. The session verifies and your webhook fires. You never write back.",

  "land.skip": "Skip to the flow",
  "land.homeAria": "jokubot home",
  "land.pageNav": "Page",
  "land.mobileNav": "Mobile",
  "land.footerNav": "Footer",
  "land.flow": "Flow",
  "land.proof": "Proof",
  "land.signIn": "Sign in",
  "land.workspace": "Workspace",
  "land.openWorkspace": "Open workspace",
  "land.createAccount": "Create a business account",
  "land.eyebrow": "Inbound verification · WhatsApp + Telegram",
  "land.heroTitle": "Your customer sends the code. You never write back.",
  "land.heroLede":
    "Issue a one-time code from your server. The customer sends it to your inbound gateway on WhatsApp or Telegram. The session verifies and your webhook fires.",
  "land.seeApi": "See the API",
  "land.channels": "Channels",
  "land.demoAria": "Example verification session",
  "land.demoGateway": "Inbound gateway",
  "land.demoStatus": "Code received · session closed in 00:42",
  "land.demoVerified": "Session verified",
  "land.demoFoot": "Outbound messages sent: 0",
  "land.modelEyebrow": "Operating model",
  "land.modelTitle": "The message is the check.",
  "land.fact1Title": "No reply path",
  "land.fact1Body":
    "The check completes on the customer’s message. Your business never sends one.",
  "land.fact2Title": "Either channel",
  "land.fact2Body":
    "Connect WhatsApp or Telegram. Either one verifies every session you issue.",
  "land.fact3Title": "Explicit proof",
  "land.fact3Body":
    "A closed session carries what was proved: a phone number, or control of the messaging identity.",
  "land.flowEyebrow": "The flow",
  "land.flowTitle": "A session, from issue to result.",
  "land.flow1Kicker": "01 · Your server",
  "land.flow1Title": "Issue the code",
  "land.flow1Body": "Create a session and show the customer a one-time code.",
  "land.flow2Kicker": "02 · Customer",
  "land.flow2Title": "Send it in",
  "land.flow2Body":
    "A deep link opens a chat with your inbound gateway. The customer sends the code.",
  "land.flow3Kicker": "03 · Gateway",
  "land.flow3Title": "Session verifies",
  "land.flow3Body":
    "The gateway matches the code, closes the session, and calls your webhook.",
  "land.proofEyebrow": "Proof",
  "land.proofTitle": "The result is specific.",
  "land.proofPhone":
    "The channel disclosed the sender’s number. It is stored on the session.",
  "land.proofIdentity":
    "Control of the chat account was proven. No number was disclosed.",
  "land.proofHint":
    "WhatsApp does not always disclose a number. Both outcomes close the session.",
  "land.apiEyebrow": "Developers",
  "land.apiTitle": "A small surface for your backend.",
  "land.apiPoint1":
    "One POST creates a session and returns the code, deep link, and QR.",
  "land.apiPoint2": "A completion webhook fires when the session closes.",
  "land.apiPoint3": "Status streams over WebSocket while the customer sends.",
  "land.nextEyebrow": "Next step",
  "land.nextTitle": "Run a verification session.",
  "land.nextBody": "Create a business account, connect one channel, and issue a code.",
  "land.footTag": "Inbound messaging verification.",
  "docs.title": "API reference",
  "ui.verified": "Verified",
  "ui.proofPhone": "Phone number",
  "ui.proofIdentity": "Messaging identity",
};

export type MessageKey = keyof typeof en;

const fr: Record<MessageKey, string> = {
  "common.whatsapp": "WhatsApp",
  "common.telegram": "Telegram",

  "locale.label": "Langue",
  "locale.fr": "FR",
  "locale.en": "EN",

  "theme.toLight": "Passer au thème clair",
  "theme.toDark": "Passer au thème sombre",

  "nav.status": "État",
  "nav.security": "Sécurité",
  "nav.docs": "Docs",
  "nav.openMenu": "Ouvrir le menu",
  "nav.closeMenu": "Fermer le menu",

  "meta.title": "jokubot — Vérification WhatsApp et Telegram",
  "meta.description":
    "Émettez un code à usage unique. Le client l’envoie sur WhatsApp ou Telegram. La session se vérifie et votre webhook part. Vous n’écrivez jamais.",

  "land.skip": "Aller au parcours",
  "land.homeAria": "Accueil jokubot",
  "land.pageNav": "Page",
  "land.mobileNav": "Mobile",
  "land.footerNav": "Pied de page",
  "land.flow": "Parcours",
  "land.proof": "Preuve",
  "land.signIn": "Connexion",
  "land.workspace": "Espace",
  "land.openWorkspace": "Ouvrir l’espace",
  "land.createAccount": "Créer un compte entreprise",
  "land.eyebrow": "Vérification entrante · WhatsApp + Telegram",
  "land.heroTitle": "Le client envoie le code. Vous n’écrivez jamais.",
  "land.heroLede":
    "Émettez un code à usage unique depuis votre serveur. Le client l’envoie à votre passerelle entrante sur WhatsApp ou Telegram. La session se vérifie et votre webhook part.",
  "land.seeApi": "Voir l’API",
  "land.channels": "Canaux",
  "land.demoAria": "Exemple de session de vérification",
  "land.demoGateway": "Passerelle entrante",
  "land.demoStatus": "Code reçu · session close en 00:42",
  "land.demoVerified": "Session vérifiée",
  "land.demoFoot": "Messages sortants envoyés : 0",
  "land.modelEyebrow": "Modèle d’exploitation",
  "land.modelTitle": "Le message est le contrôle.",
  "land.fact1Title": "Pas de réponse",
  "land.fact1Body":
    "Le contrôle se termine sur le message du client. Votre entreprise n’en envoie aucun.",
  "land.fact2Title": "L’un ou l’autre canal",
  "land.fact2Body":
    "Connectez WhatsApp ou Telegram. L’un des deux suffit pour chaque session émise.",
  "land.fact3Title": "Preuve explicite",
  "land.fact3Body":
    "Une session close porte ce qui a été prouvé : un numéro de téléphone, ou le contrôle de l’identité de messagerie.",
  "land.flowEyebrow": "Le parcours",
  "land.flowTitle": "Une session, de l’émission au résultat.",
  "land.flow1Kicker": "01 · Votre serveur",
  "land.flow1Title": "Émettre le code",
  "land.flow1Body": "Créez une session et montrez le code au client.",
  "land.flow2Kicker": "02 · Client",
  "land.flow2Title": "L’envoyer",
  "land.flow2Body":
    "Un lien profond ouvre une discussion avec votre passerelle. Le client envoie le code.",
  "land.flow3Kicker": "03 · Passerelle",
  "land.flow3Title": "La session se vérifie",
  "land.flow3Body":
    "La passerelle reconnaît le code, clôt la session et appelle votre webhook.",
  "land.proofEyebrow": "Preuve",
  "land.proofTitle": "Le résultat est précis.",
  "land.proofPhone":
    "Le canal a divulgué le numéro de l’expéditeur. Il est stocké sur la session.",
  "land.proofIdentity":
    "Le contrôle du compte de discussion a été prouvé. Aucun numéro n’a été divulgué.",
  "land.proofHint":
    "WhatsApp ne divulgue pas toujours un numéro. Les deux résultats closent la session.",
  "land.apiEyebrow": "Développeurs",
  "land.apiTitle": "Une surface réduite pour votre backend.",
  "land.apiPoint1":
    "Un POST crée une session et renvoie le code, le lien profond et le QR.",
  "land.apiPoint2": "Un webhook de clôture part quand la session se ferme.",
  "land.apiPoint3": "Le statut transite en WebSocket pendant que le client envoie.",
  "land.nextEyebrow": "Étape suivante",
  "land.nextTitle": "Lancer une session de vérification.",
  "land.nextBody": "Créez un compte entreprise, connectez un canal, émettez un code.",
  "land.footTag": "Vérification de messagerie entrante.",
  "docs.title": "Référence API",
  "ui.verified": "Vérifié",
  "ui.proofPhone": "Numéro de téléphone",
  "ui.proofIdentity": "Identité de messagerie",
};

const catalogs: Record<Locale, Record<MessageKey, string>> = { en, fr };

let activeLocale: Locale = DEFAULT_LOCALE;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "fr" || value === "en";
}

export function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (isLocale(stored)) {
      return stored;
    }
  } catch {
    // Private mode or blocked storage.
  }
  return DEFAULT_LOCALE;
}

export function applyLocale(locale: Locale) {
  activeLocale = locale;
  document.documentElement.lang = locale;
}

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function localeTag(locale: Locale = activeLocale): string {
  return locale === "fr" ? "fr-FR" : "en-US";
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: MessageVars,
): string {
  let text = catalogs[locale][key] ?? catalogs.en[key] ?? key;
  if (!vars) {
    return text;
  }
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

export function t(key: MessageKey, vars?: MessageVars): string {
  return translate(activeLocale, key, vars);
}
