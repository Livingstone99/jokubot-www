import type {
  ConversationSummary,
  ConversationThread,
  CreatedVerification,
  InboundRow,
  LlmCatalog,
  ListenType,
  Me,
  Overview,
  Reaction,
  ReactionConfig,
  ReactionInput,
  ReactionKind,
  SetupAct,
  SetupDraft,
  SetupMessage,
  SetupSession,
  Tenant,
  Trigger,
  TriggerChannel,
  TriggerInput,
  TriggerSimulation,
  UsageEvent,
  Verification,
  VerificationPurpose,
  VerificationReplies,
  WebhookDelivery,
  WhatsAppPair,
  WorkspaceUsage,
} from "./api.js";

/**
 * In-memory sample for the business workspace copy.
 * Screens read and write this store. Nothing is sent to the JokuBot API.
 */

const REPLIES: VerificationReplies = {
  verified: "Vérifié.",
  expired: "Ce code a expiré.",
  already_used: "Ce code n'est plus valable.",
  unknown_token: "Ce code n'est pas valide.",
  channel_mismatch: "Envoyez ce code depuis l'application pour laquelle il a été émis.",
  sender_mismatch: "Ce code n'est pas destiné à ce numéro.",
};

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function ahead(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

type Store = {
  email: string;
  name: string;
  tenant: Tenant;
  pair: WhatsAppPair;
  pairPolls: number;
  verifications: Verification[];
  purposes: VerificationPurpose[];
  inbound: InboundRow[];
  triggers: Trigger[];
  reactions: Reaction[];
  threads: ConversationThread[];
  deliveries: WebhookDelivery[];
  setup: SetupSession;
  seq: number;
};

function blankDraft(): SetupDraft {
  return {
    triggerName: "Accueil boutique",
    reactionName: "Réponse boutique",
    channel: "both",
    matchType: "keyword",
    matchValue: null,
    keywordMatch: "contains",
    listenTypes: ["text"],
    whitelist: [],
    blacklist: [],
    context: "Tu réponds pour Maison Kofi, une boutique à Abidjan. Tu confirmes les commandes et tu restes bref.",
    fallback: "Je n'ai pas compris. Envoyez le numéro de commande.",
    provider: "jokubot",
    model: "jokubot-chat",
    hasApiKey: true,
    testText: "Où en est la commande 1842 ?",
  };
}

function freshSetup(): SetupSession {
  const draft = blankDraft();
  return {
    id: "setup_maison",
    status: "open",
    draft,
    pending: { type: "ask_keyword" },
    changeset: null,
    messages: [
      {
        id: "setup_msg_1",
        role: "assistant",
        body: "Quel mot doit ouvrir une réponse pour Maison Kofi ?",
        createdAt: ago(2),
      },
    ],
    workspace: {
      whatsapp: true,
      telegram: true,
      jokubotReady: true,
      triggerCount: 2,
      reactionCount: 2,
    },
  };
}

function tenant(): Tenant {
  return {
    id: "tn_maisonkofi",
    name: "Maison Kofi",
    country: "CI",
    accountKind: "business",
    companySize: "1-10",
    whatsappNumber: "+2250708112200",
    whatsappLinked: true,
    whatsappStatus: "connected",
    whatsappLinkProblem: null,
    telegramBotUsername: "maisonkofi_bot",
    telegramLinked: true,
    telegramStatus: "connected",
    telegramLinkProblem: null,
    telegramCanReconnect: true,
    webhookUrl: "https://maisonkofi.ci/hooks/jokubot",
    hasWebhookSecret: true,
    inboundRetentionDays: 90,
    verificationReplies: { ...REPLIES },
    verificationReplyDefaults: { ...REPLIES },
    createdAt: ago(60 * 24 * 40),
  };
}

function seed(): Store {
  const purposes: VerificationPurpose[] = [
    {
      id: "purpose_auth",
      title: "Connexion",
      slug: "authentication",
      createdAt: ago(60 * 24 * 12),
      updatedAt: ago(60 * 24 * 12),
    },
    {
      id: "purpose_order",
      title: "Confirmation de commande",
      slug: "order",
      createdAt: ago(60 * 24 * 3),
      updatedAt: ago(60 * 24),
    },
  ];

  const reactions: Reaction[] = [
    {
      id: "react_order",
      name: "Suivi de commande",
      kind: "formula",
      config: {
        fallback: "Envoyez le numéro de commande, par exemple 1842.",
        rules: [
          {
            match: "contains",
            value: "1842",
            body: "La commande 1842 est en préparation. Elle part aujourd'hui.",
          },
        ],
      },
      usedBy: 1,
      createdAt: ago(60 * 24 * 6),
      updatedAt: ago(60 * 20),
    },
    {
      id: "react_desk",
      name: "Accueil boutique",
      kind: "agent",
      config: {
        fallback: "Je n'ai pas compris. Reformulez en une phrase.",
        provider: "jokubot",
        model: "jokubot-chat",
        hasApiKey: true,
        context: "Tu réponds pour Maison Kofi, une boutique à Abidjan.",
        tokenLimit: 512,
        replyAs: "text",
      },
      usedBy: 1,
      createdAt: ago(60 * 24 * 6),
      updatedAt: ago(60 * 5),
    },
  ];

  const triggers: Trigger[] = [
    {
      id: "trig_order",
      name: "Mot commande",
      enabled: true,
      channel: "both",
      matchType: "keyword",
      matchValue: "commande",
      keywordMatch: "contains",
      listenTypes: ["text"],
      whitelist: [],
      blacklist: [],
      priority: 0,
      stopProcessing: true,
      actionType: "reply",
      actionConfig: { mode: "text", body: "Votre commande est en préparation." },
      reactionId: "react_order",
      reaction: { id: "react_order", name: "Suivi de commande", kind: "formula" },
      hits: 28,
      lastMatchedAt: ago(18),
      createdAt: ago(60 * 24 * 6),
      updatedAt: ago(18),
    },
    {
      id: "trig_hello",
      name: "Accueil",
      enabled: true,
      channel: "whatsapp",
      matchType: "any",
      matchValue: null,
      keywordMatch: "contains",
      listenTypes: ["text", "audio"],
      whitelist: [],
      blacklist: [],
      priority: 1,
      stopProcessing: false,
      actionType: "reply",
      actionConfig: { mode: "text" },
      reactionId: "react_desk",
      reaction: { id: "react_desk", name: "Accueil boutique", kind: "agent" },
      hits: 64,
      lastMatchedAt: ago(7),
      createdAt: ago(60 * 24 * 6),
      updatedAt: ago(7),
    },
  ];

  const verifications: Verification[] = [
    {
      publicId: "wJ8xK2mP9QrT",
      channel: "whatsapp",
      status: "verified",
      clientRef: "cmd-1842",
      purpose: "order",
      expiresAt: ahead(4),
      createdAt: ago(26),
      verifiedAt: ago(24),
      verifiedSubject: "phone_number",
      identity: {
        kind: "whatsapp_pn",
        ref: "2250704556677@s.whatsapp.net",
        phoneNumber: "+2250704556677",
        displayName: "Awa Bamba",
      },
    },
    {
      publicId: "tQ4nL8cV2HsM",
      channel: "telegram",
      status: "verified",
      clientRef: "user-19",
      purpose: "authentication",
      expiresAt: ahead(8),
      createdAt: ago(50),
      verifiedAt: ago(48),
      verifiedSubject: "messaging_identity",
      identity: {
        kind: "telegram",
        ref: "512340991",
        phoneNumber: null,
        displayName: "Koffi N.",
      },
    },
    {
      publicId: "wP3mWaiting01",
      channel: "whatsapp",
      status: "pending",
      clientRef: "cmd-1904",
      purpose: "order",
      expiresAt: ahead(12),
      createdAt: ago(6),
      verifiedAt: null,
      verifiedSubject: null,
      identity: null,
    },
    {
      publicId: "wExpired4410",
      channel: "whatsapp",
      status: "expired",
      clientRef: "user-4",
      purpose: "authentication",
      expiresAt: ago(90),
      createdAt: ago(110),
      verifiedAt: null,
      verifiedSubject: null,
      identity: null,
    },
  ];

  const inbound: InboundRow[] = [
    {
      id: "in_unknown",
      channel: "whatsapp",
      senderRef: "+2250503982211",
      outcome: "unknown_token",
      receivedAt: ago(15),
      triggerId: null,
      triggerName: null,
      sessionPublicId: null,
    },
    {
      id: "in_expired",
      channel: "telegram",
      senderRef: "512340991",
      outcome: "expired",
      receivedAt: ago(80),
      triggerId: null,
      triggerName: null,
      sessionPublicId: "wExpired4410",
    },
    {
      id: "in_order",
      channel: "whatsapp",
      senderRef: "+2250704556677",
      outcome: "triggered",
      receivedAt: ago(18),
      triggerId: "trig_order",
      triggerName: "Mot commande",
      sessionPublicId: null,
    },
    {
      id: "in_verified",
      channel: "whatsapp",
      senderRef: "+2250704556677",
      outcome: "verified",
      receivedAt: ago(24),
      triggerId: null,
      triggerName: null,
      sessionPublicId: "wJ8xK2mP9QrT",
    },
  ];

  const threads: ConversationThread[] = [
    {
      channel: "whatsapp",
      senderRef: "+2250704556677",
      senderKind: "phone",
      phoneNumber: "+2250704556677",
      displayName: "Awa Bamba",
      messageCount: 3,
      messages: [
        {
          id: "msg_awa_1",
          direction: "in",
          body: "Bonjour, où en est la commande 1842 ?",
          outcome: "triggered",
          receivedAt: ago(28),
          triggerName: "Mot commande",
          sessionPublicId: null,
        },
        {
          id: "msg_awa_2",
          direction: "out",
          body: "La commande 1842 est en préparation. Elle part aujourd'hui.",
          outcome: null,
          receivedAt: ago(28),
          triggerName: "Mot commande",
          sessionPublicId: null,
        },
        {
          id: "msg_awa_3",
          direction: "in",
          body: "VFY-9Q4XK2",
          outcome: "verified",
          receivedAt: ago(24),
          triggerName: null,
          sessionPublicId: "wJ8xK2mP9QrT",
        },
      ],
    },
    {
      channel: "telegram",
      senderRef: "512340991",
      senderKind: "telegram",
      phoneNumber: null,
      displayName: "Koffi N.",
      messageCount: 2,
      messages: [
        {
          id: "msg_koffi_1",
          direction: "in",
          body: "Je veux me connecter",
          outcome: "triggered",
          receivedAt: ago(52),
          triggerName: null,
          sessionPublicId: null,
        },
        {
          id: "msg_koffi_2",
          direction: "in",
          body: "VFY-OLD",
          outcome: "expired",
          receivedAt: ago(80),
          triggerName: null,
          sessionPublicId: "wExpired4410",
        },
      ],
    },
  ];

  const deliveries: WebhookDelivery[] = [
    {
      id: "wh_ok",
      deliveryId: "del_1842",
      event: "verification.completed",
      url: "https://maisonkofi.ci/hooks/jokubot",
      status: "delivered",
      attemptCount: 1,
      lastStatusCode: 200,
      lastError: null,
      nextAttemptAt: ago(24),
      deliveredAt: ago(24),
      createdAt: ago(24),
    },
    {
      id: "wh_retry",
      deliveryId: "del_1904",
      event: "verification.completed",
      url: "https://maisonkofi.ci/hooks/jokubot",
      status: "retrying",
      attemptCount: 2,
      lastStatusCode: 504,
      lastError: "Délai dépassé",
      nextAttemptAt: ahead(5),
      deliveredAt: null,
      createdAt: ago(40),
    },
  ];

  const business = tenant();
  return {
    email: "awa.kofi@maisonkofi.ci",
    name: "Awa Kofi",
    tenant: business,
    pair: {
      status: "linked",
      number: business.whatsappNumber,
      qrDataUrl: null,
      pairingCode: null,
      message: null,
      updatedAt: ago(60 * 24),
    },
    pairPolls: 0,
    verifications,
    purposes,
    inbound,
    triggers,
    reactions,
    threads,
    deliveries,
    setup: freshSetup(),
    seq: 40,
  };
}

const store = seed();

function nextId(prefix: string): string {
  store.seq += 1;
  return `${prefix}_${store.seq.toString(36)}`;
}

function me(): Me {
  return {
    email: store.email,
    name: store.name,
    tenant: clone(store.tenant),
  };
}

function slugify(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "purpose";
}

function uniqueSlug(title: string): string {
  const base = slugify(title);
  const taken = new Set(store.purposes.map((item) => item.slug));
  if (!taken.has(base)) {
    return base;
  }
  return `${base}-${store.seq.toString(36)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readBody(init?: RequestInit): Record<string, unknown> {
  if (!init?.body || typeof init.body !== "string") {
    return {};
  }
  try {
    return asRecord(JSON.parse(init.body));
  } catch {
    return {};
  }
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function isListenType(value: string): value is ListenType {
  return value === "text" || value === "image" || value === "audio" || value === "file";
}

function listenTypes(value: unknown): ListenType[] {
  const items = strList(value).filter(isListenType);
  return items.length > 0 ? items : ["text"];
}

function isChannel(value: unknown): value is TriggerChannel {
  return value === "whatsapp" || value === "telegram" || value === "both";
}

function isReactionKind(value: unknown): value is ReactionKind {
  return value === "http" || value === "formula" || value === "agent";
}

function reactionSummary(id: string | null): Trigger["reaction"] {
  if (!id) {
    return null;
  }
  const reaction = store.reactions.find((item) => item.id === id);
  if (!reaction) {
    return null;
  }
  return { id: reaction.id, name: reaction.name, kind: reaction.kind };
}

function presentTrigger(trigger: Trigger): Trigger {
  return {
    ...clone(trigger),
    reaction: reactionSummary(trigger.reactionId),
  };
}

function presentReactions(): Reaction[] {
  return store.reactions.map((reaction) => ({
    ...clone(reaction),
    usedBy: store.triggers.filter((trigger) => trigger.reactionId === reaction.id).length,
  }));
}

function syncSetupCounts() {
  store.setup.workspace = {
    whatsapp: store.tenant.whatsappLinked,
    telegram: store.tenant.telegramLinked,
    jokubotReady: true,
    triggerCount: store.triggers.length,
    reactionCount: store.reactions.length,
  };
}

function pushMessage(session: SetupSession, role: SetupMessage["role"], body: string) {
  session.messages.push({
    id: nextId("msg"),
    role,
    body,
    createdAt: new Date().toISOString(),
  });
}

function overview(): Overview {
  const day = 24 * 60 * 60 * 1000;
  const recent = (value: string | null) =>
    Boolean(value) && Date.now() - new Date(value ?? 0).getTime() < day;
  const verified = store.verifications.filter((item) => item.status === "verified");
  const channelCounts = (channel: "whatsapp" | "telegram") => {
    const rows = store.verifications.filter((item) => item.channel === channel);
    return {
      pending: rows.filter((item) => item.status === "pending").length,
      verified: rows.filter((item) => item.status === "verified").length,
      expired: rows.filter((item) => item.status === "expired").length,
    };
  };
  const outcomes = new Map<string, number>();
  for (const row of store.inbound.filter((item) => recent(item.receivedAt))) {
    outcomes.set(row.outcome, (outcomes.get(row.outcome) ?? 0) + 1);
  }
  return {
    pending: store.verifications.filter((item) => item.status === "pending").length,
    verified: verified.length,
    expired: store.verifications.filter((item) => item.status === "expired").length,
    verifiedLast24h: verified.filter((item) => recent(item.verifiedAt)).length,
    inboundLast24h: store.inbound.filter((item) => recent(item.receivedAt)).length,
    issuedLast24h: store.verifications.filter((item) => recent(item.createdAt)).length,
    proofLast24h: {
      phoneNumber: verified.filter((item) => item.verifiedSubject === "phone_number").length,
      messagingIdentity: verified.filter((item) => item.verifiedSubject === "messaging_identity").length,
    },
    proofAllTime: {
      phoneNumber: verified.filter((item) => item.verifiedSubject === "phone_number").length,
      messagingIdentity: verified.filter((item) => item.verifiedSubject === "messaging_identity").length,
    },
    byChannel: {
      whatsapp: channelCounts("whatsapp"),
      telegram: channelCounts("telegram"),
    },
    inboundOutcomesLast24h: [...outcomes.entries()].map(([outcome, total]) => ({
      outcome,
      total,
    })),
    recentSessions: clone(store.verifications),
    recentInbound: clone(store.inbound),
    gateway: {
      url: "https://jokubot.com/gateway",
      reachable: true,
      live: true,
      ready: true,
    },
    credits: {
      hasPlan: true,
      included: 10_000,
      spent: 1_840,
      remaining: 8_160,
      exhausted: false,
    },
  };
}

function usage(): WorkspaceUsage {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const events: UsageEvent[] = [
    {
      id: "use_1",
      kind: "jokubot.chat",
      credits: 12,
      billable: true,
      occurredAt: ago(18),
      image: false,
    },
    {
      id: "use_2",
      kind: "jokubot.stt",
      credits: 20,
      billable: true,
      occurredAt: ago(40),
      image: false,
    },
    {
      id: "use_3",
      kind: "jokubot.vision",
      credits: 30,
      billable: true,
      occurredAt: ago(90),
      image: true,
    },
    {
      id: "use_4",
      kind: "jokubot.tts",
      credits: 8,
      billable: true,
      occurredAt: ago(140),
      image: false,
    },
  ];
  return {
    periodStart: `${now.getUTCFullYear()}-${month}-01`,
    credits: {
      hasPlan: true,
      included: 10_000,
      spent: 1_840,
      remaining: 8_160,
      exhausted: false,
    },
    costs: { chat: 980, chatImage: 240, stt: 360, vision: 180, tts: 80 },
    jobs: [
      { kind: "jokubot.chat", credits: 1_220, events: 86 },
      { kind: "jokubot.stt", credits: 360, events: 18 },
      { kind: "jokubot.vision", credits: 180, events: 6 },
      { kind: "jokubot.tts", credits: 80, events: 10 },
    ],
    events,
  };
}

function catalog(): LlmCatalog {
  const provider = {
    id: "jokubot" as const,
    label: "JokuBot",
    customModel: false,
    models: [{ id: "jokubot-chat", label: "JokuBot" }],
  };
  const job = (model: string, choiceLabel: "Model" | "Voice") => ({
    defaultProvider: "jokubot" as const,
    defaultModel: model,
    systemReady: true,
    choiceLabel,
    providers: [{ ...provider, models: [{ id: model, label: "JokuBot" }] }],
  });
  return {
    defaultProvider: "jokubot",
    defaultModel: "jokubot-chat",
    systemDeepseek: false,
    systemJokubot: true,
    providers: [provider],
    media: {
      vision: job("jokubot-vision", "Model"),
      stt: job("jokubot-stt", "Model"),
      tts: job("jokubot-voice", "Voice"),
    },
  };
}

const QR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="160" height="160"><rect width="64" height="64" fill="#fff"/><rect x="4" y="4" width="16" height="16" fill="#0c1628"/><rect x="44" y="4" width="16" height="16" fill="#0c1628"/><rect x="4" y="44" width="16" height="16" fill="#0c1628"/><rect x="28" y="28" width="8" height="8" fill="#0c1628"/><rect x="40" y="28" width="6" height="6" fill="#0c1628"/><rect x="28" y="44" width="6" height="12" fill="#0c1628"/></svg>`;

function issueVerification(body: Record<string, unknown>, verified: boolean): CreatedVerification {
  const channel = body.channel === "telegram" ? "telegram" : "whatsapp";
  const purpose = str(body.purpose) ?? store.purposes[0]?.slug ?? "authentication";
  const clientRef = str(body.clientRef) ?? str(body.phoneNumber) ?? null;
  const code = `VFY-${nextId("code").slice(-6).toUpperCase()}`;
  const publicId = `w${nextId("pub").slice(-8)}`;
  const row: Verification = {
    publicId,
    channel,
    status: verified ? "verified" : "pending",
    clientRef,
    purpose,
    expiresAt: ahead(15),
    createdAt: new Date().toISOString(),
    verifiedAt: verified ? new Date().toISOString() : null,
    verifiedSubject: verified
      ? channel === "whatsapp"
        ? "phone_number"
        : "messaging_identity"
      : null,
    identity: verified
      ? {
          kind: channel === "whatsapp" ? "whatsapp_pn" : "telegram",
          ref: clientRef ?? "sample",
          phoneNumber: channel === "whatsapp" ? clientRef : null,
          displayName: "Client",
        }
      : null,
  };
  store.verifications = [row, ...store.verifications];
  const number = (store.tenant.whatsappNumber ?? "").replace(/[^\d]/g, "");
  return {
    publicId,
    channel,
    token: code,
    messageToSend: code,
    deepLink:
      channel === "whatsapp"
        ? `https://wa.me/${number}?text=${encodeURIComponent(code)}`
        : `https://t.me/${store.tenant.telegramBotUsername ?? "maisonkofi_bot"}?text=${encodeURIComponent(code)}`,
    qrSvg: QR_SVG,
    expiresAt: row.expiresAt,
    realtimeUrl: "preview",
    purpose,
  };
}

function summaries(channel?: string | null): ConversationSummary[] {
  return store.threads
    .filter((thread) => !channel || thread.channel === channel)
    .map((thread) => {
      const last = thread.messages.at(-1);
      const lastOut = [...thread.messages].reverse().find((item) => item.direction === "out");
      return {
        channel: thread.channel,
        senderRef: thread.senderRef,
        senderKind: thread.senderKind,
        phoneNumber: thread.phoneNumber,
        displayName: thread.displayName,
        lastBody: last?.body ?? null,
        lastReplyText: lastOut?.body ?? null,
        lastOutcome: last?.outcome ?? "triggered",
        lastReceivedAt: last?.receivedAt ?? thread.messages[0]?.receivedAt ?? ago(1),
        messageCount: thread.messages.length,
      };
    });
}

function applyKeyword(keyword: string) {
  if (!store.setup.draft) {
    store.setup.draft = blankDraft();
  }
  store.setup.draft.matchType = "keyword";
  store.setup.draft.matchValue = keyword;
  store.setup.draft.triggerName = keyword ? `Mot ${keyword}` : store.setup.draft.triggerName;
  store.setup.pending = { type: "approve_context" };
  pushMessage(
    store.setup,
    "assistant",
    `Le mot « ${keyword} » ouvre la réponse. Relisez le contexte, puis confirmez.`,
  );
}

function onSetupAct(body: Record<string, unknown>): SetupSession {
  const action = str(body.action) as SetupAct["action"] | undefined;
  const draft = store.setup.draft ?? blankDraft();
  store.setup.draft = draft;
  if (action === "set_keyword") {
    applyKeyword(str(body.keyword)?.trim() ?? "");
  } else if (action === "approve_context") {
    draft.context = str(body.context) ?? draft.context;
    store.setup.pending = {
      type: "test_result",
      text: "Bonjour, ici Maison Kofi. Envoyez le numéro de commande.",
      usedFallback: false,
      testText: draft.testText,
    };
    pushMessage(store.setup, "assistant", "Contexte enregistré. Voici une réponse d'essai.");
  } else if (action === "simulate") {
    const text = str(body.text)?.trim() || draft.testText;
    draft.testText = text;
    draft.lastTestReply = "Votre commande est en préparation. Nous écrivons dès qu'elle part.";
    store.setup.pending = {
      type: "test_result",
      text: draft.lastTestReply,
      usedFallback: false,
      testText: text,
    };
  } else if (action === "keep") {
    store.setup.pending = { type: "applied" };
    store.setup.status = "closed";
    store.setup.changeset = {
      triggerId: store.triggers[0]?.id ?? "trig_order",
      reactionId: store.reactions[0]?.id ?? "react_order",
      createdTrigger: false,
      createdReaction: false,
      status: "kept",
    };
    pushMessage(store.setup, "assistant", "Réglage conservé pour Maison Kofi.");
  } else if (action === "revert" || action === "start_over") {
    store.setup = freshSetup();
    if (action === "revert") {
      store.setup.pending = { type: "reverted" };
    }
  } else if (action === "choose_channel" && isChannel(body.channel)) {
    draft.channel = body.channel;
    store.setup.pending = { type: "ask_keyword" };
  } else if (action === "provide_key") {
    draft.hasApiKey = true;
    store.setup.pending = { type: "approve_context" };
  }
  syncSetupCounts();
  return clone(store.setup);
}

function saveSettings(body: Record<string, unknown>): { tenant: Tenant; webhookSecret?: string } {
  const name = str(body.name);
  if (name) {
    store.tenant.name = name;
  }
  if ("whatsappNumber" in body) {
    const next = body.whatsappNumber;
    const number = typeof next === "string" && next.trim() ? next.trim() : null;
    const changed = number !== store.tenant.whatsappNumber;
    store.tenant.whatsappNumber = number;
    if (!number) {
      store.tenant.whatsappLinked = false;
      store.tenant.whatsappStatus = "off";
      store.tenant.whatsappLinkProblem = null;
    } else if (changed) {
      store.tenant.whatsappLinked = false;
      store.tenant.whatsappStatus = "pending";
      store.tenant.whatsappLinkProblem = null;
      store.pair = {
        status: "idle",
        number,
        qrDataUrl: null,
        pairingCode: null,
        message: null,
        updatedAt: new Date().toISOString(),
      };
      store.pairPolls = 0;
    }
  }
  if ("telegramBotUsername" in body) {
    const next = str(body.telegramBotUsername);
    store.tenant.telegramBotUsername = next?.replace(/^@/, "") || null;
  }
  let webhookSecret: string | undefined;
  if ("webhookUrl" in body) {
    const next = str(body.webhookUrl)?.trim() || null;
    const gained = Boolean(next) && !store.tenant.hasWebhookSecret;
    store.tenant.webhookUrl = next;
    if (!next) {
      store.tenant.hasWebhookSecret = false;
    } else if (gained) {
      store.tenant.hasWebhookSecret = true;
      webhookSecret = "whsec_maison_kofi_sample";
    }
  }
  if (typeof body.inboundRetentionDays === "number" && Number.isFinite(body.inboundRetentionDays)) {
    store.tenant.inboundRetentionDays = body.inboundRetentionDays;
  }
  if (body.verificationReplies && typeof body.verificationReplies === "object") {
    store.tenant.verificationReplies = {
      ...store.tenant.verificationReplies,
      ...(body.verificationReplies as Partial<VerificationReplies>),
    };
  }
  syncSetupCounts();
  return webhookSecret
    ? { tenant: clone(store.tenant), webhookSecret }
    : { tenant: clone(store.tenant) };
}

function pairSnapshot(): { tenant: Tenant; pair: WhatsAppPair } {
  if (store.tenant.whatsappStatus === "pending" && store.pair.status === "waiting") {
    store.pairPolls += 1;
    // Démo : le « scan » est simulé après 45 lectures (environ 90 s), pour
    // laisser le temps de voir l'écran du QR code. Le vrai serveur attend le scan.
    if (store.pairPolls >= 45) {
      store.tenant.whatsappLinked = true;
      store.tenant.whatsappStatus = "connected";
      store.tenant.whatsappLinkProblem = null;
      store.pair = {
        status: "linked",
        number: store.tenant.whatsappNumber,
        qrDataUrl: null,
        pairingCode: null,
        message: null,
        updatedAt: new Date().toISOString(),
      };
    }
  }
  return { tenant: clone(store.tenant), pair: clone(store.pair) };
}

/** QR code d'exemple (motif seulement) pour la démo : le vrai vient de WhatsApp. */
function demoQr(seed: string): string {
  const size = 25;
  let h = 2166136261;
  for (const ch of seed || "jokubot") h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const finder = (x: number, y: number) =>
    [[0, 0], [size - 7, 0], [0, size - 7]].some(([fx, fy]) => x >= fx! && x < fx! + 7 && y >= fy! && y < fy! + 7);
  const inFinder = (x: number, y: number) => {
    for (const [fx, fy] of [[0, 0], [size - 7, 0], [0, size - 7]] as const) {
      const dx = x - fx;
      const dy = y - fy;
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) {
        return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
      }
    }
    return false;
  };
  let rects = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = finder(x, y) ? inFinder(x, y) : rand() > 0.52;
      if (on) rects += `<rect x="${x + 2}" y="${y + 2}" width="1" height="1"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 4} ${size + 4}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function startPair(number: string): { tenant: Tenant; pair: WhatsAppPair } {
  store.tenant.whatsappNumber = number;
  store.tenant.whatsappLinked = false;
  store.tenant.whatsappStatus = "pending";
  store.tenant.whatsappLinkProblem = null;
  store.pairPolls = 0;
  store.pair = {
    status: "waiting",
    number,
    qrDataUrl: demoQr(number),
    pairingCode: "K7M2-Q9P4",
    message: null,
    updatedAt: new Date().toISOString(),
  };
  return { tenant: clone(store.tenant), pair: clone(store.pair) };
}

function triggerFromInput(body: Record<string, unknown>, current?: Trigger): Trigger {
  const now = new Date().toISOString();
  const matchType = body.matchType;
  const actionType = body.actionType;
  const actionConfig = body.actionConfig
    ? asRecord(body.actionConfig)
    : (current?.actionConfig ?? {});
  const id = current?.id ?? nextId("trig");
  const reactionId =
    body.reactionId === null ? null : str(body.reactionId) ?? current?.reactionId ?? null;
  const next: Trigger = {
    id,
    name: str(body.name) ?? current?.name ?? "Déclencheur",
    enabled: typeof body.enabled === "boolean" ? body.enabled : current?.enabled ?? true,
    channel: isChannel(body.channel) ? body.channel : current?.channel ?? "both",
    matchType:
      matchType === "any" || matchType === "keyword" || matchType === "verification_token"
        ? matchType
        : current?.matchType ?? "keyword",
    matchValue:
      body.matchValue === null ? null : str(body.matchValue) ?? current?.matchValue ?? null,
    keywordMatch:
      body.keywordMatch === "equals" || body.keywordMatch === "contains"
        ? body.keywordMatch
        : current?.keywordMatch ?? "contains",
    listenTypes: body.listenTypes ? listenTypes(body.listenTypes) : current?.listenTypes ?? ["text"],
    whitelist: body.whitelist ? strList(body.whitelist) : current?.whitelist ?? [],
    blacklist: body.blacklist ? strList(body.blacklist) : current?.blacklist ?? [],
    priority: typeof body.priority === "number" ? body.priority : current?.priority ?? store.triggers.length,
    stopProcessing:
      typeof body.stopProcessing === "boolean"
        ? body.stopProcessing
        : current?.stopProcessing ?? true,
    actionType:
      actionType === "verify" || actionType === "webhook" || actionType === "reply"
        ? actionType
        : current?.actionType ?? "reply",
    actionConfig: {
      mode: actionConfig.mode === "otp" ? "otp" : "text",
      ...(typeof actionConfig.body === "string" ? { body: actionConfig.body } : {}),
    },
    reactionId,
    reaction: reactionSummary(reactionId),
    hits: current?.hits ?? 0,
    lastMatchedAt: current?.lastMatchedAt ?? null,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
  return next;
}

function reactionFromInput(body: Record<string, unknown>, current?: Reaction): Reaction {
  const now = new Date().toISOString();
  const kind = isReactionKind(body.kind) ? body.kind : current?.kind ?? "formula";
  const config = (asRecord(body.config) as ReactionConfig) ?? current?.config ?? { fallback: "" };
  const fallback = typeof config.fallback === "string" ? config.fallback : current?.config.fallback ?? "";
  return {
    id: current?.id ?? nextId("react"),
    name: str(body.name) ?? current?.name ?? "Réaction",
    kind,
    config: { ...current?.config, ...config, fallback },
    usedBy: current?.usedBy ?? 0,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
}

function simulateTriggers(body: Record<string, unknown>): TriggerSimulation {
  const text = (str(body.text) ?? "").trim().toLowerCase();
  const channel = body.channel === "telegram" ? "telegram" : "whatsapp";
  const matched: Trigger[] = [];
  let stoppedAt: string | null = null;
  const ordered = [...store.triggers].sort((a, b) => a.priority - b.priority);
  for (const trigger of ordered) {
    if (!trigger.enabled) {
      continue;
    }
    if (trigger.channel !== "both" && trigger.channel !== channel) {
      continue;
    }
    const value = trigger.matchValue?.toLowerCase() ?? "";
    const keywordHit =
      trigger.matchType === "keyword" &&
      value.length > 0 &&
      (trigger.keywordMatch === "equals" ? text === value : text.includes(value));
    const hit = trigger.matchType === "any" || trigger.matchType === "verification_token" || keywordHit;
    if (!hit) {
      continue;
    }
    matched.push(presentTrigger(trigger));
    if (trigger.stopProcessing) {
      stoppedAt = trigger.id;
      break;
    }
  }
  const replyTrigger = matched.find((item) => item.actionType === "reply");
  return {
    matched,
    stoppedAt,
    reply: replyTrigger
      ? {
          text: replyTrigger.actionConfig.body || "Réponse de Maison Kofi.",
          triggerId: replyTrigger.id,
          mode: replyTrigger.actionConfig.mode ?? "text",
          ...(replyTrigger.reaction
            ? {
                reaction: {
                  id: replyTrigger.reaction.id,
                  name: replyTrigger.reaction.name,
                  kind: replyTrigger.reaction.kind,
                  usedFallback: false,
                },
              }
            : {}),
        }
      : null,
    webhooks: matched
      .filter((item) => item.actionType === "webhook")
      .map((item) => ({ id: item.id, name: item.name })),
  };
}

function dispatch(path: string, init?: RequestInit): unknown {
  const url = new URL(path, "http://preview.local");
  const method = (init?.method ?? "GET").toUpperCase();
  const pathname = url.pathname;
  const body = readBody(init);

  if (method === "GET" && pathname === "/v1/dashboard/me") {
    return { me: me() };
  }
  if (method === "POST" && pathname === "/v1/dashboard/login") {
    return { me: me() };
  }
  if (method === "POST" && pathname === "/v1/dashboard/logout") {
    return { ok: true };
  }
  if (method === "POST" && pathname === "/v1/dashboard/signup") {
    const businessName = str(body.businessName);
    const holder = str(body.accountHolder);
    const email = str(body.email);
    if (email) {
      store.email = email;
    }
    if (holder) {
      store.name = holder;
    }
    if (businessName) {
      store.tenant.name = businessName;
    } else if (holder) {
      store.tenant.name = holder;
    }
    if (body.accountKind === "individual" || body.accountKind === "business") {
      store.tenant.accountKind = body.accountKind;
    }
    if (str(body.country)) {
      store.tenant.country = str(body.country) ?? store.tenant.country;
    }
    if (str(body.companySize)) {
      store.tenant.companySize = str(body.companySize) ?? null;
    }
    return {
      me: me(),
      credentials: {
        apiKey: "jkb_live_maison_kofi_sample",
        ingestSecret: "ing_maison_kofi_sample",
        mintSecret: "mint_maison_kofi_sample",
      },
    };
  }
  if (method === "GET" && pathname === "/v1/dashboard/overview") {
    return overview();
  }
  if (method === "GET" && pathname === "/v1/dashboard/usage") {
    return usage();
  }
  if (method === "GET" && pathname === "/v1/dashboard/verifications") {
    return { items: clone(store.verifications) };
  }
  if (method === "POST" && pathname === "/v1/dashboard/verifications") {
    return issueVerification(body, false);
  }
  if (method === "POST" && pathname === "/v1/dashboard/verifications/simulate") {
    return issueVerification(body, true);
  }
  if (method === "GET" && pathname === "/v1/dashboard/inbound") {
    return { items: clone(store.inbound) };
  }
  if (method === "GET" && pathname === "/v1/dashboard/purposes") {
    return { items: clone(store.purposes) };
  }
  if (method === "POST" && pathname === "/v1/dashboard/purposes") {
    const title = str(body.title)?.trim() || "Nouveau motif";
    const now = new Date().toISOString();
    const purpose: VerificationPurpose = {
      id: nextId("purpose"),
      title,
      slug: str(body.slug) || uniqueSlug(title),
      createdAt: now,
      updatedAt: now,
    };
    store.purposes = [...store.purposes, purpose];
    return clone(purpose);
  }
  const purposeMatch = pathname.match(/^\/v1\/dashboard\/purposes\/([^/]+)$/);
  if (purposeMatch && method === "PATCH") {
    const id = decodeURIComponent(purposeMatch[1] ?? "");
    const title = str(body.title)?.trim();
    store.purposes = store.purposes.map((item) =>
      item.id === id && title
        ? { ...item, title, updatedAt: new Date().toISOString() }
        : item,
    );
    const purpose = store.purposes.find((item) => item.id === id);
    if (!purpose) {
      throw new Error("Purpose not found.");
    }
    return clone(purpose);
  }
  if (purposeMatch && method === "DELETE") {
    const id = decodeURIComponent(purposeMatch[1] ?? "");
    store.purposes = store.purposes.filter((item) => item.id !== id);
    return { ok: true };
  }
  if (method === "GET" && pathname === "/v1/dashboard/conversations") {
    return { items: summaries(url.searchParams.get("channel")) };
  }
  if (method === "GET" && pathname === "/v1/dashboard/conversations/thread") {
    const channel = url.searchParams.get("channel");
    const sender = url.searchParams.get("sender");
    const thread = store.threads.find(
      (item) => item.channel === channel && item.senderRef === sender,
    );
    if (!thread) {
      throw new Error("Session not found.");
    }
    return clone(thread);
  }
  if (method === "PATCH" && pathname === "/v1/dashboard/settings") {
    return saveSettings(body);
  }
  if (method === "POST" && pathname === "/v1/dashboard/whatsapp/pair") {
    return startPair(str(body.number)?.trim() || store.tenant.whatsappNumber || "");
  }
  if (method === "GET" && pathname === "/v1/dashboard/whatsapp/pair") {
    return pairSnapshot();
  }
  if (method === "POST" && pathname === "/v1/dashboard/telegram/connect") {
    store.tenant.telegramLinked = true;
    store.tenant.telegramStatus = "connected";
    store.tenant.telegramLinkProblem = null;
    store.tenant.telegramCanReconnect = true;
    if (!store.tenant.telegramBotUsername) {
      store.tenant.telegramBotUsername = "maisonkofi_bot";
    }
    syncSetupCounts();
    return { tenant: clone(store.tenant) };
  }
  if (method === "POST" && pathname === "/v1/dashboard/whatsapp/disconnect") {
    store.tenant.whatsappLinked = false;
    store.tenant.whatsappStatus = "disconnected";
    store.tenant.whatsappLinkProblem = "user";
    store.pair.status = "idle";
    return { tenant: clone(store.tenant) };
  }
  if (method === "POST" && pathname === "/v1/dashboard/whatsapp/reconnect") {
    store.tenant.whatsappLinked = true;
    store.tenant.whatsappStatus = "connected";
    store.tenant.whatsappLinkProblem = null;
    store.pair = {
      status: "linked",
      number: store.tenant.whatsappNumber,
      qrDataUrl: null,
      pairingCode: null,
      message: null,
      updatedAt: new Date().toISOString(),
    };
    return { tenant: clone(store.tenant), pair: clone(store.pair) };
  }
  if (method === "POST" && pathname === "/v1/dashboard/telegram/disconnect") {
    store.tenant.telegramLinked = false;
    store.tenant.telegramStatus = "disconnected";
    store.tenant.telegramLinkProblem = "user";
    return { tenant: clone(store.tenant) };
  }
  if (method === "POST" && pathname === "/v1/dashboard/telegram/reconnect") {
    store.tenant.telegramLinked = true;
    store.tenant.telegramStatus = "connected";
    store.tenant.telegramLinkProblem = null;
    store.tenant.telegramCanReconnect = true;
    return { tenant: clone(store.tenant) };
  }
  if (method === "POST" && pathname === "/v1/dashboard/keys/rotate-api") {
    return { apiKey: `jkb_live_${nextId("key")}` };
  }
  if (method === "POST" && pathname === "/v1/dashboard/keys/rotate-ingest") {
    return { ingestSecret: `ing_${nextId("key")}` };
  }
  if (method === "POST" && pathname === "/v1/dashboard/keys/rotate-mint") {
    return { mintSecret: `mint_${nextId("key")}`, mintKid: 2 };
  }
  if (method === "GET" && pathname === "/v1/dashboard/triggers") {
    return { items: store.triggers.map(presentTrigger) };
  }
  if (method === "POST" && pathname === "/v1/dashboard/triggers") {
    const trigger = triggerFromInput(body as TriggerInput & Record<string, unknown>);
    store.triggers = [...store.triggers, trigger];
    syncSetupCounts();
    return presentTrigger(trigger);
  }
  if (method === "PATCH" && pathname === "/v1/dashboard/triggers/reorder") {
    const ids = strList(body.ids);
    const byId = new Map(store.triggers.map((item) => [item.id, item]));
    const next: Trigger[] = [];
    for (const id of ids) {
      const item = byId.get(id);
      if (item) {
        next.push(item);
      }
    }
    for (const item of store.triggers) {
      if (!ids.includes(item.id)) {
        next.push(item);
      }
    }
    store.triggers = next.map((item, index) => ({ ...item, priority: index }));
    return { items: store.triggers.map(presentTrigger) };
  }
  if (method === "POST" && pathname === "/v1/dashboard/triggers/simulate") {
    return simulateTriggers(body);
  }
  const triggerMatch = pathname.match(/^\/v1\/dashboard\/triggers\/([^/]+)$/);
  if (triggerMatch && method === "PATCH") {
    const id = decodeURIComponent(triggerMatch[1] ?? "");
    const current = store.triggers.find((item) => item.id === id);
    if (!current) {
      throw new Error("Trigger not found.");
    }
    const trigger = triggerFromInput({ ...current, ...body, id }, current);
    store.triggers = store.triggers.map((item) => (item.id === id ? trigger : item));
    return presentTrigger(trigger);
  }
  if (triggerMatch && method === "DELETE") {
    const id = decodeURIComponent(triggerMatch[1] ?? "");
    store.triggers = store.triggers.filter((item) => item.id !== id);
    syncSetupCounts();
    return { ok: true };
  }
  if (method === "POST" && pathname === "/v1/dashboard/webhook/test") {
    const delivery: WebhookDelivery = {
      id: nextId("wh"),
      deliveryId: nextId("del"),
      event: "verification.test",
      url: store.tenant.webhookUrl ?? "https://maisonkofi.ci/hooks/jokubot",
      status: "delivered",
      attemptCount: 1,
      lastStatusCode: 200,
      lastError: null,
      nextAttemptAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    store.deliveries = [delivery, ...store.deliveries];
    return { ok: true, status: 200 };
  }
  if (method === "GET" && pathname === "/v1/dashboard/webhook/deliveries") {
    return { items: clone(store.deliveries) };
  }
  const replayMatch = pathname.match(/^\/v1\/dashboard\/webhook\/deliveries\/([^/]+)\/replay$/);
  if (replayMatch && method === "POST") {
    const id = decodeURIComponent(replayMatch[1] ?? "");
    const current = store.deliveries.find((item) => item.id === id);
    if (!current) {
      throw new Error("Delivery not found.");
    }
    const updated: WebhookDelivery = {
      ...current,
      status: "delivered",
      attemptCount: current.attemptCount + 1,
      lastStatusCode: 200,
      lastError: null,
      deliveredAt: new Date().toISOString(),
    };
    store.deliveries = store.deliveries.map((item) => (item.id === id ? updated : item));
    return clone(updated);
  }
  if (method === "GET" && pathname === "/v1/dashboard/llm") {
    return catalog();
  }
  if (method === "GET" && pathname === "/v1/dashboard/reactions") {
    return { items: presentReactions() };
  }
  if (method === "POST" && pathname === "/v1/dashboard/reactions") {
    const reaction = reactionFromInput(body as ReactionInput & Record<string, unknown>);
    store.reactions = [...store.reactions, reaction];
    syncSetupCounts();
    return clone(reaction);
  }
  const reactionMatch = pathname.match(/^\/v1\/dashboard\/reactions\/([^/]+)$/);
  if (reactionMatch && method === "PATCH") {
    const id = decodeURIComponent(reactionMatch[1] ?? "");
    const current = store.reactions.find((item) => item.id === id);
    if (!current) {
      throw new Error("Reaction not found.");
    }
    const reaction = reactionFromInput(body, current);
    store.reactions = store.reactions.map((item) => (item.id === id ? reaction : item));
    return clone(reaction);
  }
  if (reactionMatch && method === "DELETE") {
    const id = decodeURIComponent(reactionMatch[1] ?? "");
    store.reactions = store.reactions.filter((item) => item.id !== id);
    store.triggers = store.triggers.map((item) =>
      item.reactionId === id ? { ...item, reactionId: null, reaction: null } : item,
    );
    syncSetupCounts();
    return { ok: true };
  }
  if (method === "GET" && pathname === "/v1/dashboard/setup-agent") {
    syncSetupCounts();
    return clone(store.setup);
  }
  if (method === "POST" && pathname === "/v1/dashboard/setup-agent/messages") {
    const text = str(body.text)?.trim() ?? "";
    if (text) {
      pushMessage(store.setup, "user", text);
      if (store.setup.pending?.type === "ask_keyword") {
        applyKeyword(text);
      } else {
        pushMessage(
          store.setup,
          "assistant",
          "Noté pour Maison Kofi. Confirmez le contexte pour voir une réponse d'essai.",
        );
      }
    }
    syncSetupCounts();
    return clone(store.setup);
  }
  if (method === "POST" && pathname === "/v1/dashboard/setup-agent/act") {
    return onSetupAct(body);
  }
  if (method === "POST" && pathname === "/v1/dashboard/setup-agent/reset") {
    store.setup = freshSetup();
    syncSetupCounts();
    return clone(store.setup);
  }

  throw new Error(`Sample data has no ${method} ${pathname}`);
}

export async function previewRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return dispatch(path, init) as T;
}
