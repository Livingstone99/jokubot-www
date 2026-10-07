// Parcours de réglage des moteurs. Les valeurs déjà enregistrées pré-remplissent les champs.

import * as api from "../api.js";
import { network } from "../catalog.js";
import { connectedNetworks, connectionOf, type DB, type EngineId, type NetworkId } from "../db.js";
import { COUNTRIES, fullPhone } from "../format.js";
import { t } from "../prefs.js";
import { AppLink, Rich } from "../ui.js";
import { list, phone, range, str } from "../wizard/fields.js";
import type { FlowDef } from "../wizard/Wizard.js";

const BACK = { to: "/moteurs", label: "Services" };

function doneFor(id: EngineId, title: string, text: string): FlowDef["done"] {
  return {
    title,
    text,
    primary: { label: "Ouvrir l'espace", to: `/moteurs/${id}` },
    secondary: { label: "Retour aux services", to: "/moteurs" },
  };
}

function serviceClientFlow(db: DB): FlowDef {
  const saved = db.engines["service-client"];
  const connected = connectedNetworks(db);
  return {
    title: "Service client",
    description: "JokuBot répond à vos clients avec vos prix, vos horaires et le ton que vous choisissez.",
    back: BACK,
    initial: {
      channels: saved?.channels ?? connected,
      tone: saved?.tone ?? "chaleureux",
      hours: saved?.hours ?? "toujours",
      range: { from: saved?.from ?? "08:00", to: saved?.to ?? "19:00" },
      businessName: saved?.businessName ?? "",
      description: saved?.description ?? "",
    },
    steps: [
      {
        id: "canaux",
        label: "Canaux",
        title: "Sur quelles messageries JokuBot répond-il ?",
        help: "Seules vos messageries connectées sont proposées.",
        fields: [
          {
            kind: "checks",
            name: "channels",
            label: "Messageries",
            options: connected.map((id) => ({
              value: id,
              label: network(id).name,
              description: connectionOf(db, id).account ?? "",
            })),
            empty: (
              <p>
                {t("Aucune messagerie n'est connectée.")} <AppLink to="/">{t("Connectez une messagerie")}</AppLink>
                {t(", puis revenez ici.")}
              </p>
            ),
            required: "Choisissez au moins une messagerie. S'il n'y en a aucune, connectez-en une d'abord.",
          },
        ],
      },
      {
        id: "ton",
        label: "Ton et horaires",
        title: "Comment JokuBot parle-t-il à vos clients ?",
        fields: [
          {
            kind: "radio",
            name: "tone",
            label: "Ton",
            columns: 3,
            options: [
              { value: "chaleureux", label: "Chaleureux", description: "« Bonjour Aya ! Oui, il nous en reste. »" },
              { value: "professionnel", label: "Professionnel", description: "« Bonjour Madame, l'article est disponible. »" },
              { value: "direct", label: "Direct", description: "« Disponible. 12 000 FCFA. »" },
            ],
          },
          {
            kind: "radio",
            name: "hours",
            label: "Quand répond-il ?",
            columns: 2,
            options: [
              { value: "toujours", label: "24 h sur 24", description: "Tout le temps, même quand vous êtes là." },
              { value: "hors", label: "Hors de mes horaires", description: "Seulement quand la boutique est fermée." },
            ],
          },
          { kind: "range", name: "range", label: "Vos horaires d'ouverture", when: (v) => v.hours === "hors" },
        ],
      },
      {
        id: "activite",
        label: "Activité",
        title: "Présentez votre activité",
        help: "JokuBot s'en sert pour se présenter. Vous pourrez lui apprendre le reste dans Conversations.",
        fields: [
          { kind: "text", name: "businessName", label: "Nom de l'activité", placeholder: "Boutique Awa", required: "Indiquez le nom de votre activité." },
          {
            kind: "textarea",
            name: "description",
            label: "Ce que vous vendez",
            rows: 4,
            placeholder: "Pagnes wax de 6 000 à 15 000 FCFA. Livraison à Abidjan pour 1 000 FCFA.",
            required: "Décrivez en une ou deux phrases ce que vous vendez.",
          },
        ],
        submitLabel: "Activer le service client",
        onSubmit: async (values) => {
          const r = range(values.range);
          await api.saveEngine("service-client", {
            channels: list(values.channels) as NetworkId[],
            tone: str(values.tone) as "chaleureux",
            hours: str(values.hours) as "toujours",
            from: r.from,
            to: r.to,
            businessName: str(values.businessName).trim(),
            description: str(values.description).trim(),
          });
        },
      },
    ],
    done: {
      ...doneFor("service-client", "Service client activé", "JokuBot répond maintenant à vos clients. Continuez à lui apprendre votre activité dans Conversations."),
      // « Ouvrir » mène à la discussion avec JokuBot.
      primary: { label: "Ouvrir les conversations", to: "/conversations" },
    },
  };
}

function reseauxFlow(db: DB): FlowDef {
  const saved = db.engines.reseaux;
  return {
    title: "Gestion des réseaux",
    description: "JokuBot publie sur votre page Facebook et votre compte Instagram, seul ou quand vous le demandez.",
    back: BACK,
    initial: {
      pageId: saved?.pageId ?? "",
      token: "",
      instagramId: saved?.instagramId ?? "",
      autoPublish: saved ? (saved.autoPublish ? "oui" : "non") : "non",
      frequency: saved?.frequency ?? "lmv",
      time: saved?.time ?? "18:00",
      topics: saved?.topics.join("\n") ?? "",
    },
    steps: [
      {
        id: "page",
        label: "Page Facebook",
        title: "Reliez votre page Facebook",
        help: (
          <>
            <Rich text="L'identifiant se trouve dans votre page, rubrique **À propos**, puis **Transparence de la page**." />
          </>
        ),
        fields: [
          { kind: "text", name: "pageId", label: "Identifiant de la page Facebook", inputMode: "numeric", placeholder: "104857362918374", required: "Indiquez l'identifiant de votre page Facebook." },
          {
            kind: "secret",
            name: "token",
            label: "Jeton d'accès de la page",
            ...(saved
              ? { optional: true, hint: "Laissez vide pour garder le jeton déjà enregistré." }
              : { required: "Collez le jeton d'accès de votre page." }),
          },
          { kind: "text", name: "instagramId", label: "Identifiant Instagram", optional: true, inputMode: "numeric", hint: "Pour publier aussi sur votre compte Instagram professionnel." },
        ],
      },
      {
        id: "publication",
        label: "Publication",
        title: "JokuBot publie-t-il tout seul ?",
        fields: [
          {
            kind: "radio",
            name: "autoPublish",
            label: "Publication automatique",
            columns: 2,
            options: [
              { value: "oui", label: "Oui", description: "JokuBot prépare et publie selon le rythme choisi." },
              { value: "non", label: "Non", description: "Vous publiez vous-même depuis l'espace." },
            ],
          },
          {
            kind: "select",
            name: "frequency",
            label: "Fréquence",
            when: (v) => v.autoPublish === "oui",
            options: [
              { value: "jour", label: "Chaque jour" },
              { value: "lmv", label: "Lundi, mercredi et vendredi" },
              { value: "lundi", label: "Chaque lundi" },
            ],
          },
          { kind: "time", name: "time", label: "Heure de publication", when: (v) => v.autoPublish === "oui", required: "Choisissez l'heure de publication." },
          {
            kind: "textarea",
            name: "topics",
            label: "Sujets",
            when: (v) => v.autoPublish === "oui",
            rows: 4,
            placeholder: "Nouveaux pagnes de la semaine\nPromo du vendredi\nConseils pour coudre un wax",
            hint: "Un sujet par ligne. JokuBot les utilise à tour de rôle.",
            required: "Écrivez au moins un sujet, un par ligne.",
          },
        ],
        submitLabel: "Enregistrer",
        onSubmit: async (values) => {
          await api.saveEngine("reseaux", {
            pageId: str(values.pageId).trim(),
            token: str(values.token).trim() || saved?.token || "",
            instagramId: str(values.instagramId).trim(),
            autoPublish: values.autoPublish === "oui",
            frequency: str(values.frequency) as "jour",
            time: str(values.time),
            topics: str(values.topics)
              .split("\n")
              .map((t) => t.trim())
              .filter(Boolean),
          });
        },
      },
    ],
    done: doneFor("reseaux", "Réseaux reliés", "Vous pouvez publier depuis l'espace Gestion des réseaux."),
  };
}

function comptaFlow(db: DB): FlowDef {
  const saved = db.engines.comptabilite;
  return {
    title: "Comptabilité",
    description: "JokuBot enregistre vos ventes et vous envoie un rapport, sans tableur.",
    back: BACK,
    initial: {
      company: saved?.company ?? db.engines["service-client"]?.businessName ?? "",
      currency: saved?.currency ?? "FCFA",
      reportFrequency: saved?.reportFrequency ?? "soir",
      reportChannel: saved?.reportChannel ?? (db.connections.whatsapp.connected ? "whatsapp" : "email"),
    },
    steps: [
      {
        id: "entreprise",
        label: "Entreprise",
        title: "Votre entreprise",
        fields: [
          { kind: "text", name: "company", label: "Nom de l'entreprise", required: "Indiquez le nom de votre entreprise." },
          {
            kind: "select",
            name: "currency",
            label: "Devise",
            options: [
              { value: "FCFA", label: "Franc CFA (FCFA)" },
              { value: "€", label: "Euro (€)" },
              { value: "GNF", label: "Franc guinéen (GNF)" },
            ],
          },
        ],
      },
      {
        id: "rapport",
        label: "Rapport",
        title: "Quand recevez-vous votre rapport ?",
        fields: [
          {
            kind: "radio",
            name: "reportFrequency",
            label: "Fréquence du rapport",
            columns: 3,
            options: [
              { value: "soir", label: "Chaque soir", description: "À 20 h, les ventes du jour." },
              { value: "lundi", label: "Chaque lundi", description: "La semaine écoulée." },
              { value: "mois", label: "Le 1er du mois", description: "Le mois écoulé." },
            ],
          },
          {
            kind: "radio",
            name: "reportChannel",
            label: "Envoi",
            columns: 2,
            options: [
              {
                value: "whatsapp",
                label: "WhatsApp",
                description: db.connections.whatsapp.account ?? "WhatsApp n'est pas connecté",
                disabled: !db.connections.whatsapp.connected,
              },
              { value: "email", label: "E-mail", description: db.account?.email ?? "" },
            ],
          },
        ],
        submitLabel: "Activer la comptabilité",
        onSubmit: async (values) => {
          await api.saveEngine("comptabilite", {
            company: str(values.company).trim(),
            currency: str(values.currency),
            reportFrequency: str(values.reportFrequency) as "soir",
            reportChannel: str(values.reportChannel) as "whatsapp",
          });
        },
      },
    ],
    done: doneFor("comptabilite", "Comptabilité activée", "Vos ventes sont enregistrées. Dites « j'ai vendu… » à JokuBot pour en ajouter une."),
  };
}

function creationFlow(db: DB): FlowDef {
  const saved = db.engines.creation;
  return {
    title: "Création de contenu",
    description: "JokuBot crée des affiches pour vos produits, avec une légende prête à publier.",
    back: BACK,
    initial: { format: saved?.format ?? "carre" },
    steps: [
      {
        id: "format",
        label: "Format",
        title: "Quel format par défaut ?",
        help: "Vous pourrez le changer à chaque création.",
        fields: [
          {
            kind: "radio",
            name: "format",
            label: "Format",
            columns: 2,
            options: [
              { value: "carre", label: "Carré", description: "Pour les publications Facebook et Instagram." },
              { value: "vertical", label: "Vertical", description: "Pour les statuts WhatsApp et les stories." },
            ],
          },
        ],
        submitLabel: "Activer la création",
        onSubmit: async (values) => {
          await api.saveEngine("creation", { format: str(values.format) as "carre" });
        },
      },
    ],
    done: doneFor("creation", "Création de contenu activée", "Décrivez un produit, JokuBot crée l'affiche et la légende."),
  };
}

function metaFlow(db: DB): FlowDef {
  const saved = db.engines.meta;
  return {
    title: "Campagnes Meta",
    description: "JokuBot lance vos publicités Facebook et Instagram avec votre compte publicitaire.",
    back: BACK,
    initial: {
      adAccount: saved?.adAccount ?? "",
      token: "",
      page: saved?.page ?? db.engines.reseaux?.pageId ?? "",
      country: saved?.country ?? "CI",
    },
    steps: [
      {
        id: "compte",
        label: "Compte publicitaire",
        title: "Votre compte publicitaire Meta",
        help: (
          <>
            <Rich text="Ces informations se trouvent dans le **Gestionnaire de publicités** de Meta, menu **Paramètres**." />
          </>
        ),
        fields: [
          {
            kind: "text",
            name: "adAccount",
            label: "Identifiant du compte publicitaire",
            placeholder: "act_1234567890",
            required: "Indiquez l'identifiant du compte publicitaire.",
            validate: (value) =>
              /^(act_)?\d{6,}$/.test(str(value).trim()) ? null : "L'identifiant ressemble à act_1234567890 : « act_ » suivi de chiffres.",
          },
          {
            kind: "secret",
            name: "token",
            label: "Jeton d'accès",
            ...(saved ? { optional: true, hint: "Laissez vide pour garder le jeton déjà enregistré." } : { required: "Collez le jeton d'accès Meta." }),
          },
          { kind: "text", name: "page", label: "Identifiant de la page Facebook", inputMode: "numeric", required: "Indiquez la page qui portera la publicité." },
          {
            kind: "select",
            name: "country",
            label: "Pays ciblé",
            options: COUNTRIES.map((c) => ({ value: c.code, label: c.name })),
          },
        ],
        submitLabel: "Activer les campagnes",
        onSubmit: async (values) => {
          const account = str(values.adAccount).trim();
          await api.saveEngine("meta", {
            adAccount: account.startsWith("act_") ? account : `act_${account}`,
            token: str(values.token).trim() || saved?.token || "",
            page: str(values.page).trim(),
            country: str(values.country),
          });
        },
      },
    ],
    done: doneFor("meta", "Campagnes Meta activées", "Choisissez un visuel, un budget et une durée : JokuBot crée la campagne."),
  };
}

function nafoloFlow(db: DB): FlowDef {
  const saved = db.engines.nafolo;
  const savedPhone = saved?.number.match(/^(\+\d+)\s(.*)$/);
  return {
    title: "Paiement Nafolo",
    description: "Vos clients paient avec Nafolo. JokuBot vérifie la capture d'écran avant de confirmer la commande.",
    back: BACK,
    initial: {
      mode: saved?.mode ?? "lien",
      link: saved?.link ?? "",
      number: { dial: savedPhone?.[1] ?? "+225", number: savedPhone?.[2] ?? "" },
      displayName: saved?.displayName ?? db.engines["service-client"]?.businessName ?? "",
      validation: saved?.validation ?? "demander",
    },
    steps: [
      {
        id: "reception",
        label: "Réception",
        title: "Où vos clients paient-ils ?",
        fields: [
          {
            kind: "radio",
            name: "mode",
            label: "Moyen de réception",
            columns: 2,
            options: [
              { value: "lien", label: "Lien de paiement", description: "Le client paie en touchant le lien." },
              { value: "numero", label: "Numéro de réception", description: "Le client envoie l'argent à ce numéro." },
            ],
          },
          { kind: "url", name: "link", label: "Lien de paiement Nafolo", placeholder: "https://pay.nafolo.com/boutique-awa", when: (v) => v.mode === "lien", required: "Collez votre lien de paiement Nafolo." },
          { kind: "phone", name: "number", label: "Numéro de réception", when: (v) => v.mode === "numero" },
          { kind: "text", name: "displayName", label: "Nom affiché au client", hint: "Le nom que le client voit au moment de payer.", required: "Indiquez le nom que vos clients verront." },
        ],
      },
      {
        id: "validation",
        label: "Validation",
        title: "Qui valide les paiements ?",
        help: "JokuBot vérifie le montant, la référence et le destinataire sur chaque capture.",
        fields: [
          {
            kind: "radio",
            name: "validation",
            label: "Validation",
            options: [
              { value: "auto", label: "Validation automatique", description: "Si tout est bon, JokuBot confirme la commande seul." },
              { value: "demander", label: "Me demander", description: "JokuBot met le paiement de côté et vous le validez." },
            ],
          },
        ],
        submitLabel: "Activer le paiement",
        onSubmit: async (values) => {
          const p = phone(values.number);
          await api.saveEngine("nafolo", {
            mode: str(values.mode) as "lien",
            link: str(values.link).trim(),
            number: p.number ? fullPhone(p.dial, p.number) : "",
            displayName: str(values.displayName).trim(),
            validation: str(values.validation) as "auto",
          });
        },
      },
    ],
    done: doneFor("nafolo", "Paiement Nafolo activé", "JokuBot envoie votre moyen de paiement aux clients et vérifie leurs captures."),
  };
}

export function engineFlow(id: EngineId, db: DB): FlowDef {
  switch (id) {
    case "service-client":
      return serviceClientFlow(db);
    case "reseaux":
      return reseauxFlow(db);
    case "comptabilite":
      return comptaFlow(db);
    case "creation":
      return creationFlow(db);
    case "meta":
      return metaFlow(db);
    case "nafolo":
      return nafoloFlow(db);
  }
}
