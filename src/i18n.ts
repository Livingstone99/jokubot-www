export type Locale = "fr" | "en";

export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_KEY = "mvs.locale";

const fr = {
  "nav.skip": "Aller au contenu",
  "nav.brandAria": "JokuBot — accueil",
  "nav.aria": "Navigation principale",
  "nav.mobileAria": "Navigation mobile",
  "nav.features": "Fonctionnalités",
  "nav.pricing": "Tarifs",
  "nav.contact": "Contact",
  "nav.docs": "Docs",
  "nav.openMenu": "Ouvrir le menu",
  "nav.closeMenu": "Fermer le menu",
  "nav.footerAria": "Pied de page",

  "locale.label": "Langue",
  "locale.fr": "Français",
  "locale.en": "English",

  "theme.toLight": "Passer en clair",
  "theme.toDark": "Passer en sombre",

  "hero.eyebrow": "Automatisation intelligente — WhatsApp & Telegram",
  "hero.title": "Un bot IA qui gère votre business, 24h/24",
  "hero.lede":
    "Service client, réseaux sociaux, comptabilité, publicités Meta et paiement — automatisés de bout en bout.",
  "hero.cta": "Commencer maintenant",
  "hero.photoAlt": "Agent IA JokuBot",

  "why.eyebrow": "Pourquoi JokuBot",
  "why.title": "Tout ce qu'un employé ferait, sans les limites d'un employé",
  "why.1title": "Disponible 24h/24",
  "why.1body": "7j/7, sans pause ni congé.",
  "why.2title": "Une seule solution",
  "why.2body": "Au lieu de cinq outils séparés.",
  "why.3title": "Zéro intervention",
  "why.3body": "Du premier message au paiement encaissé.",
  "why.4title": "S'adapte à vous",
  "why.4body": "De l'activité solo à la PME.",
  "why.5title": "Résultat",
  "why.5body": "Moins de temps perdu, plus de ventes conclues.",

  "features.eyebrow": "Fonctionnalités clés",
  "features.title": "Six moteurs, une seule interface",
  "features.role": "Fonctionnalité JokuBot",
  "features.1name": "Service client",
  "features.1text": "Répond aux messages texte et vocaux, en continu, sur WhatsApp et Telegram.",
  "features.2name": "Gestion des réseaux",
  "features.2text": "Connecte vos comptes et publie du contenu automatiquement.",
  "features.3name": "Comptabilité",
  "features.3text": "Enregistre les ventes et paiements, génère les rapports.",
  "features.4name": "Création de contenu",
  "features.4text": "Génère images et vidéos à la demande, prêtes à publier.",
  "features.5name": "Campagnes Meta",
  "features.5text": "Lance des publicités et redirige les prospects vers WhatsApp.",
  "features.6name": "Paiement Nafolo",
  "features.6text": "Envoie le lien de paiement et valide la transaction par capture d'écran.",

  "content.eyebrow": "Conversation & contenu",
  "content.title": "Le bot écoute, comprend et crée",
  "content.cta": "Découvrir la fonction",
  "content.1title": "Notes vocales",
  "content.1body":
    "Transcrit et comprend les messages vocaux des clients, puis répond avec la même naturalité qu'un humain.",
  "content.2title": "Génération d'images",
  "content.2body": "Crée des visuels produits, affiches et bannières à la demande, sans designer.",
  "content.3title": "Génération de vidéos",
  "content.3body":
    "Produit des courtes vidéos publicitaires prêtes à poster ou à diffuser en campagne.",

  "social.eyebrow": "Réseaux sociaux",
  "social.title": "Connecté à vos réseaux, il gère et publie seul",
  "social.row1Label": "Connexion des comptes",
  "social.row1Body": "Facebook, Instagram, TikTok liés en quelques clics.",
  "social.row2Label": "Calendrier automatique",
  "social.row2Body": "Planifie et publie le contenu généré sans validation manuelle.",
  "social.row3Label": "Réponses aux commentaires",
  "social.row3Body": "Interagit avec votre communauté et remonte les leads chauds.",
  "social.resultLabel": "Résultat",
  "social.resultText": "Une présence en ligne active, tous les jours, sans y penser.",

  "payment.eyebrow": "Paiement",
  "payment.title": "De la conversation à l'argent encaissé, sans humain",
  "payment.step1": "Étape 1",
  "payment.step1Title": "Envoi du lien",
  "payment.step1Body":
    "Le bot génère et envoie le lien de paiement Nafolo dès que le client confirme sa commande.",
  "payment.step2": "Étape 2",
  "payment.step2Title": "Réception de la preuve",
  "payment.step2Body":
    "Le client envoie une capture d'écran de son paiement directement dans la conversation.",
  "payment.step3": "Étape 3",
  "payment.step3Title": "Validation automatique",
  "payment.step3Body":
    "Le bot lit la capture, confirme le montant et la référence, puis valide la commande seul.",

  "pricing.eyebrow": "Formules d'abonnement",
  "pricing.title": "Un plan pour chaque étape de croissance",
  "pricing.perMonth": " / mois",
  "pricing.starterName": "Starter",
  "pricing.starterFor": "Pour tester l'automatisation",
  "pricing.starterFeat1": "1 canal (WhatsApp ou Telegram)",
  "pricing.starterFeat2": "Réponses automatiques texte",
  "pricing.starterFeat3": "500 conversations / mois",
  "pricing.starterFeat4": "FAQ et service client basique",
  "pricing.starterCta": "Acheter",
  "pricing.proName": "Pro",
  "pricing.proFor": "Pour automatiser la relation client",
  "pricing.proFeat1": "WhatsApp + Telegram",
  "pricing.proFeat2": "Réponses texte et vocales",
  "pricing.proFeat3": "Génération d'images",
  "pricing.proFeat4": "Paiement Nafolo intégré",
  "pricing.proFeat5": "2 000 conversations / mois",
  "pricing.proCta": "Acheter",
  "pricing.businessTag": "Le plus choisi",
  "pricing.businessName": "Business",
  "pricing.businessFor": "Pour piloter tout le business",
  "pricing.businessFeat1": "Tout Pro, sans limite de conversations",
  "pricing.businessFeat2": "Génération de vidéos",
  "pricing.businessFeat3": "Gestion et publication multi-réseaux",
  "pricing.businessFeat4": "Comptabilité automatisée",
  "pricing.businessFeat5": "Campagnes Meta avancées",
  "pricing.businessCta": "Acheter",
  "pricing.customName": "Sur mesure",
  "pricing.customPrice": "Prix personnalisé",
  "pricing.customFor": "Pour les grandes structures",
  "pricing.customFeat1": "Tout Business",
  "pricing.customFeat2": "Intégrations sur mesure",
  "pricing.customFeat3": "Support et onboarding dédiés",
  "pricing.customFeat4": "Volumes illimités, SLA garanti",
  "pricing.customCta": "Nous contacter",

  "platform.eyebrow": "Plateforme",
  "platform.title": "Un tableau de bord pour piloter tout votre business",
  "platform.lede":
    "JokuBot centralise conversations, commandes, publications et paiements dans un seul espace. Vous voyez en temps réel tout ce que le bot fait pour vous.",
  "platform.feat1": "Conversations WhatsApp & Telegram",
  "platform.feat2": "Paiements Nafolo",
  "platform.feat3": "Publications réseaux sociaux",
  "platform.feat4": "Comptabilité et rapports",
  "platform.feat5": "Campagnes Meta",
  "platform.feat6": "Images et vidéos générées",
  "platform.cta": "Accéder à la plateforme",
  "platform.stat1Label": "Conversations",
  "platform.stat1Value": "3 482",
  "platform.stat2Label": "Messages vocaux",
  "platform.stat2Value": "614",
  "platform.stat3Label": "Commandes",
  "platform.stat3Value": "286",
  "platform.stat4Label": "Paiements validés",
  "platform.stat4Value": "271",
  "platform.stat5Label": "Posts publiés",
  "platform.stat5Value": "48",
  "platform.stat6Label": "Taux de réponse",
  "platform.stat6Value": "99 %",
  "platform.activity1": "Paiement Nafolo — commande #1042",
  "platform.activity1Status": "Validé",
  "platform.activity2": "Post Instagram « Nouvelle collection »",
  "platform.activity2Status": "Publié",
  "platform.activity3": "Campagne Meta « Soldes »",
  "platform.activity3Status": "En cours",

  "footer.tagline": "Le bot IA qui automatise votre relation client sur WhatsApp et Telegram.",
  "footer.colProduct": "Produit",
  "footer.colCompany": "Entreprise",
  "footer.colLegal": "Légal",
  "footer.linkAbout": "Pourquoi JokuBot",
  "footer.linkSupport": "Support",
  "footer.linkTerms": "Conditions d'utilisation",
  "footer.linkPrivacy": "Politique de confidentialité",
  "footer.copyright": "© {year} JokuBot — Tous droits réservés.",
  "footer.bottomTag": "Fait pour automatiser votre business.",
  "footer.socialAria": "Réseaux sociaux JokuBot",

  "meta.title": "JokuBot IA — Un bot IA qui gère votre business 24h/24",
  "meta.description":
    "Service client, réseaux sociaux, comptabilité, publicités Meta et paiement — automatisés de bout en bout sur WhatsApp et Telegram.",
} as const;

const en: Record<keyof typeof fr, string> = {
  "nav.skip": "Skip to content",
  "nav.brandAria": "JokuBot — home",
  "nav.aria": "Main navigation",
  "nav.mobileAria": "Mobile navigation",
  "nav.features": "Features",
  "nav.pricing": "Pricing",
  "nav.contact": "Contact",
  "nav.docs": "Docs",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "nav.footerAria": "Footer",

  "locale.label": "Language",
  "locale.fr": "Français",
  "locale.en": "English",

  "theme.toLight": "Switch to light",
  "theme.toDark": "Switch to dark",

  "hero.eyebrow": "Smart automation — WhatsApp & Telegram",
  "hero.title": "An AI bot that runs your business, 24/7",
  "hero.lede":
    "Customer service, social media, bookkeeping, Meta ads and payments — automated end to end.",
  "hero.cta": "Get started",
  "hero.photoAlt": "JokuBot AI agent",

  "why.eyebrow": "Why JokuBot",
  "why.title": "Everything an employee would do, without an employee's limits",
  "why.1title": "Available 24/7",
  "why.1body": "No breaks, no days off.",
  "why.2title": "One single solution",
  "why.2body": "Instead of five separate tools.",
  "why.3title": "Zero intervention",
  "why.3body": "From the first message to the payment collected.",
  "why.4title": "Adapts to you",
  "why.4body": "From solo activity to SME.",
  "why.5title": "Result",
  "why.5body": "Less time wasted, more sales closed.",

  "features.eyebrow": "Key features",
  "features.title": "Six engines, one interface",
  "features.role": "JokuBot feature",
  "features.1name": "Customer service",
  "features.1text": "Replies to text and voice messages, around the clock, on WhatsApp and Telegram.",
  "features.2name": "Social media management",
  "features.2text": "Connects your accounts and publishes content automatically.",
  "features.3name": "Bookkeeping",
  "features.3text": "Records sales and payments, generates reports.",
  "features.4name": "Content creation",
  "features.4text": "Generates images and videos on demand, ready to publish.",
  "features.5name": "Meta campaigns",
  "features.5text": "Launches ads and redirects prospects to WhatsApp.",
  "features.6name": "Nafolo payments",
  "features.6text": "Sends the payment link and validates the transaction from a screenshot.",

  "content.eyebrow": "Conversation & content",
  "content.title": "The bot listens, understands and creates",
  "content.cta": "See how it works",
  "content.1title": "Voice notes",
  "content.1body":
    "Transcribes and understands customers' voice messages, then replies with the same natural feel as a human.",
  "content.2title": "Image generation",
  "content.2body": "Creates product visuals, posters and banners on demand, no designer needed.",
  "content.3title": "Video generation",
  "content.3body": "Produces short ad videos ready to post or run as a campaign.",

  "social.eyebrow": "Social media",
  "social.title": "Connected to your channels, it manages and posts on its own",
  "social.row1Label": "Account connection",
  "social.row1Body": "Facebook, Instagram, TikTok linked in a few clicks.",
  "social.row2Label": "Automatic calendar",
  "social.row2Body": "Schedules and publishes generated content without manual approval.",
  "social.row3Label": "Comment replies",
  "social.row3Body": "Engages your community and surfaces hot leads.",
  "social.resultLabel": "Result",
  "social.resultText": "An active online presence, every day, without thinking about it.",

  "payment.eyebrow": "Payments",
  "payment.title": "From conversation to cash collected, no human involved",
  "payment.step1": "Step 1",
  "payment.step1Title": "Link sent",
  "payment.step1Body":
    "The bot generates and sends the Nafolo payment link as soon as the customer confirms their order.",
  "payment.step2": "Step 2",
  "payment.step2Title": "Proof received",
  "payment.step2Body": "The customer sends a screenshot of their payment directly in the conversation.",
  "payment.step3": "Step 3",
  "payment.step3Title": "Automatic validation",
  "payment.step3Body":
    "The bot reads the screenshot, confirms the amount and reference, then validates the order on its own.",

  "pricing.eyebrow": "Subscription plans",
  "pricing.title": "A plan for every stage of growth",
  "pricing.perMonth": " / month",
  "pricing.starterName": "Starter",
  "pricing.starterFor": "To try automation",
  "pricing.starterFeat1": "1 channel (WhatsApp or Telegram)",
  "pricing.starterFeat2": "Automatic text replies",
  "pricing.starterFeat3": "500 conversations / month",
  "pricing.starterFeat4": "Basic FAQ and customer service",
  "pricing.starterCta": "Buy now",
  "pricing.proName": "Pro",
  "pricing.proFor": "To automate customer relations",
  "pricing.proFeat1": "WhatsApp + Telegram",
  "pricing.proFeat2": "Text and voice replies",
  "pricing.proFeat3": "Image generation",
  "pricing.proFeat4": "Built-in Nafolo payments",
  "pricing.proFeat5": "2,000 conversations / month",
  "pricing.proCta": "Buy now",
  "pricing.businessTag": "Most popular",
  "pricing.businessName": "Business",
  "pricing.businessFor": "To run your whole business",
  "pricing.businessFeat1": "Everything in Pro, unlimited conversations",
  "pricing.businessFeat2": "Video generation",
  "pricing.businessFeat3": "Multi-channel social management",
  "pricing.businessFeat4": "Automated bookkeeping",
  "pricing.businessFeat5": "Advanced Meta campaigns",
  "pricing.businessCta": "Buy now",
  "pricing.customName": "Custom",
  "pricing.customPrice": "Custom pricing",
  "pricing.customFor": "For large organizations",
  "pricing.customFeat1": "Everything in Business",
  "pricing.customFeat2": "Custom integrations",
  "pricing.customFeat3": "Dedicated support and onboarding",
  "pricing.customFeat4": "Unlimited volumes, guaranteed SLA",
  "pricing.customCta": "Contact us",

  "platform.eyebrow": "Platform",
  "platform.title": "One dashboard to run your whole business",
  "platform.lede":
    "JokuBot brings conversations, orders, posts and payments into a single workspace. See everything the bot does for you, in real time.",
  "platform.feat1": "WhatsApp & Telegram conversations",
  "platform.feat2": "Nafolo payments",
  "platform.feat3": "Social media posts",
  "platform.feat4": "Bookkeeping and reports",
  "platform.feat5": "Meta campaigns",
  "platform.feat6": "Generated images and videos",
  "platform.cta": "Go to the platform",
  "platform.stat1Label": "Conversations",
  "platform.stat1Value": "3,482",
  "platform.stat2Label": "Voice messages",
  "platform.stat2Value": "614",
  "platform.stat3Label": "Orders",
  "platform.stat3Value": "286",
  "platform.stat4Label": "Payments validated",
  "platform.stat4Value": "271",
  "platform.stat5Label": "Posts published",
  "platform.stat5Value": "48",
  "platform.stat6Label": "Response rate",
  "platform.stat6Value": "99%",
  "platform.activity1": "Nafolo payment — order #1042",
  "platform.activity1Status": "Validated",
  "platform.activity2": "Instagram post “New collection”",
  "platform.activity2Status": "Published",
  "platform.activity3": "Meta campaign “Sale”",
  "platform.activity3Status": "Running",

  "footer.tagline": "The AI bot that automates your customer relationships on WhatsApp and Telegram.",
  "footer.colProduct": "Product",
  "footer.colCompany": "Company",
  "footer.colLegal": "Legal",
  "footer.linkAbout": "Why JokuBot",
  "footer.linkSupport": "Support",
  "footer.linkTerms": "Terms of service",
  "footer.linkPrivacy": "Privacy policy",
  "footer.copyright": "© {year} JokuBot — All rights reserved.",
  "footer.bottomTag": "Built to automate your business.",
  "footer.socialAria": "JokuBot on social media",

  "meta.title": "JokuBot AI — An AI bot that runs your business 24/7",
  "meta.description":
    "Customer service, social media, bookkeeping, Meta ads and payments — automated end to end on WhatsApp and Telegram.",
};

const catalogs: Record<Locale, Record<keyof typeof fr, string>> = { fr, en };

export type MessageKey = keyof typeof fr;
export type MessageVars = Record<string, string | number>;

export function translate(locale: Locale, key: MessageKey, vars?: MessageVars): string {
  const template = catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key] ?? key;
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === "fr" || stored === "en") {
      return stored;
    }
  } catch {
    // Private mode or blocked storage.
  }
  return DEFAULT_LOCALE;
}

export function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
}

export function localeTag(locale: Locale): string {
  return locale === "fr" ? "fr_FR" : "en_US";
}
