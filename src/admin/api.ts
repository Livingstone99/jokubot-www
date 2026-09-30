import { t } from "./i18n.js";
import { previewRequest } from "./preview.js";

export type VerificationReplyKey =
  | "verified"
  | "expired"
  | "already_used"
  | "unknown_token"
  | "channel_mismatch"
  | "sender_mismatch";

export type VerificationReplies = Record<VerificationReplyKey, string>;

export type WhatsAppLinkStatus =
  | "off"
  | "pending"
  | "connected"
  | "reconnecting"
  | "paused"
  | "disconnected";

export type WhatsAppLinkProblem = "logged_out" | "replaced" | "forbidden" | "user";

export type TelegramLinkStatus =
  | "off"
  | "pending"
  | "connected"
  | "degraded"
  | "disconnected";

export type TelegramLinkProblem = "unauthorized" | "webhook" | "user";

export type Tenant = {
  id: string;
  name: string;
  country: string | null;
  accountKind: "individual" | "business";
  companySize: string | null;
  whatsappNumber: string | null;
  whatsappLinked: boolean;
  whatsappStatus: WhatsAppLinkStatus;
  whatsappLinkProblem: WhatsAppLinkProblem | null;
  telegramBotUsername: string | null;
  telegramLinked: boolean;
  telegramStatus: TelegramLinkStatus;
  telegramLinkProblem: TelegramLinkProblem | null;
  /** True when a bot token is stored and reconnect does not need a new paste. */
  telegramCanReconnect: boolean;
  webhookUrl: string | null;
  hasWebhookSecret: boolean;
  inboundRetentionDays: number;
  verificationReplies: VerificationReplies;
  verificationReplyDefaults: VerificationReplies;
  createdAt: string;
};

export type Me = {
  email: string;
  name: string | null;
  tenant: Tenant;
};

export type ChannelCounts = {
  pending: number;
  verified: number;
  expired: number;
};

export type ProofSplit = {
  phoneNumber: number;
  messagingIdentity: number;
};

export type Overview = {
  pending: number;
  verified: number;
  expired: number;
  verifiedLast24h: number;
  inboundLast24h: number;
  issuedLast24h: number;
  proofLast24h: ProofSplit;
  proofAllTime: ProofSplit;
  byChannel: {
    whatsapp: ChannelCounts;
    telegram: ChannelCounts;
  };
  inboundOutcomesLast24h: Array<{ outcome: string; total: number }>;
  recentSessions: Verification[];
  recentInbound: InboundRow[];
  gateway: {
    url: string;
    reachable: boolean;
    live: boolean;
    ready: boolean;
  };
  credits?: UsageCredits;
};

export type UsageCredits = {
  hasPlan: boolean;
  included: number;
  spent: number;
  remaining: number;
  exhausted: boolean;
};

export type UsageJobKind =
  | "jokubot.chat"
  | "jokubot.stt"
  | "jokubot.vision"
  | "jokubot.tts";

export type UsageJob = {
  kind: UsageJobKind;
  credits: number;
  events: number;
};

export type UsageEvent = {
  id: string;
  kind: UsageJobKind;
  credits: number;
  billable: boolean;
  occurredAt: string;
  image: boolean;
};

export type WorkspaceUsage = {
  periodStart: string;
  credits: UsageCredits;
  costs: {
    chat: number;
    chatImage: number;
    stt: number;
    vision: number;
    tts: number;
  };
  jobs: UsageJob[];
  events: UsageEvent[];
};

export type Verification = {
  publicId: string;
  channel: "whatsapp" | "telegram";
  status: "pending" | "verified" | "expired";
  clientRef: string | null;
  purpose: string | null;
  expiresAt: string;
  createdAt: string;
  verifiedAt: string | null;
  verifiedSubject: "phone_number" | "messaging_identity" | null;
  identity: {
    kind: string | null;
    ref: string;
    phoneNumber: string | null;
    displayName: string | null;
  } | null;
};

export type CreatedVerification = {
  publicId: string;
  channel: "whatsapp" | "telegram";
  token: string;
  messageToSend: string;
  deepLink: string;
  qrSvg: string;
  expiresAt: string;
  realtimeUrl: string;
  purpose?: string;
};

export type VerificationPurpose = {
  id: string;
  title: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type InboundRow = {
  id: string;
  channel: "whatsapp" | "telegram";
  senderRef: string;
  outcome: string;
  receivedAt: string;
  triggerId: string | null;
  triggerName: string | null;
  sessionPublicId: string | null;
};

export type WebhookDelivery = {
  id: string;
  deliveryId: string;
  event: string;
  url: string;
  status: "pending" | "delivering" | "delivered" | "retrying" | "dead";
  attemptCount: number;
  lastStatusCode: number | null;
  lastError: string | null;
  nextAttemptAt: string;
  deliveredAt: string | null;
  createdAt: string;
};

export type PublicStatus = {
  checkedAt: string;
  overall: "ok" | "degraded" | "down";
  services: Array<{
    name: string;
    status: "ok" | "degraded" | "down";
    note: string;
  }>;
  webhooks: {
    pending: number;
    retrying: number;
    delivering: number;
    dead: number;
    oldestDueAt: string | null;
  };
};

export type ConversationSummary = {
  channel: "whatsapp" | "telegram";
  senderRef: string;
  senderKind: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  lastBody: string | null;
  lastReplyText: string | null;
  lastOutcome: string;
  lastReceivedAt: string;
  messageCount: number;
};

export type ConversationMessage = {
  id: string;
  direction: "in" | "out";
  body: string | null;
  mediaType?: "image" | "audio" | "file" | null;
  outcome: string | null;
  receivedAt: string;
  triggerName: string | null;
  sessionPublicId: string | null;
};

export type ConversationThread = {
  channel: "whatsapp" | "telegram";
  senderRef: string;
  senderKind: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  messageCount: number;
  messages: ConversationMessage[];
};

export type TriggerMatch = "any" | "keyword" | "verification_token";
export type TriggerKeywordMatch = "contains" | "equals";
export type TriggerAction = "verify" | "webhook" | "reply";

export type TriggerChannel = "whatsapp" | "telegram" | "both";

export type ListenType = "text" | "image" | "audio" | "file";

export type Trigger = {
  id: string;
  name: string;
  enabled: boolean;
  channel: TriggerChannel;
  matchType: TriggerMatch;
  matchValue: string | null;
  keywordMatch: TriggerKeywordMatch;
  listenTypes: ListenType[];
  whitelist: string[];
  blacklist: string[];
  priority: number;
  stopProcessing: boolean;
  actionType: TriggerAction;
  actionConfig: { mode?: "text" | "otp"; body?: string };
  reactionId: string | null;
  reaction: { id: string; name: string; kind: ReactionKind } | null;
  hits: number;
  lastMatchedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReactionKind = "http" | "formula" | "agent";

export type LlmProvider =
  | "jokubot"
  | "deepseek"
  | "gpt"
  | "claude"
  | "grok"
  | "kimi"
  | "openrouter";

export type LlmModelOption = {
  id: string;
  label: string;
};

export type LlmProviderOption = {
  id: LlmProvider;
  label: string;
  models: LlmModelOption[];
  customModel: boolean;
};

export type LlmCatalog = {
  defaultProvider: LlmProvider;
  defaultModel: string;
  systemDeepseek: boolean;
  systemJokubot: boolean;
  providers: LlmProviderOption[];
  media: {
    vision: MediaJobCatalog;
    stt: MediaJobCatalog;
    tts: MediaJobCatalog;
  };
};

export type MediaJobCatalog = {
  defaultProvider: LlmProvider;
  defaultModel: string;
  systemReady: boolean;
  choiceLabel?: "Model" | "Voice";
  providers: LlmProviderOption[];
};

export function reactionKindLabel(kind: ReactionKind): string {
  switch (kind) {
    case "http":
      return t("reactions.kindHttpShort");
    case "agent":
      return t("reactions.kindAgent");
    default:
      return t("reactions.kindFormula");
  }
}

export type FormulaReactionRule = {
  match: "contains" | "equals";
  value: string;
  body: string;
};

export type HttpReactionBinding = {
  name: string;
  path: string;
};

export type HttpChatValue =
  | "name"
  | "text"
  | "channel"
  | "number"
  | "sender"
  | "timestamp";

export type HttpReactionRequestParam = {
  key: string;
  from: HttpChatValue;
  in: "query" | "body";
};

export type ReactionConfig = {
  fallback: string;
  url?: string;
  timeoutMs?: number;
  responsePath?: string;
  responseExample?: string;
  requestParams?: HttpReactionRequestParam[];
  bindings?: HttpReactionBinding[];
  body?: string;
  rules?: FormulaReactionRule[];
  provider?: LlmProvider;
  model?: string;
  apiKey?: string;
  hasApiKey?: boolean;
  context?: string;
  tokenLimit?: number;
  replyAs?: "text" | "voice";
  visionProvider?: LlmProvider;
  visionModel?: string;
  visionApiKey?: string;
  hasVisionApiKey?: boolean;
  sttProvider?: LlmProvider;
  sttModel?: string;
  sttApiKey?: string;
  hasSttApiKey?: boolean;
  ttsProvider?: LlmProvider;
  ttsModel?: string;
  ttsApiKey?: string;
  hasTtsApiKey?: boolean;
};

export type Reaction = {
  id: string;
  name: string;
  kind: ReactionKind;
  config: ReactionConfig;
  usedBy: number;
  createdAt: string;
  updatedAt: string;
};

export type ReactionInput = {
  name: string;
  kind: ReactionKind;
  config: ReactionConfig;
};

export type TriggerSimulation = {
  matched: Trigger[];
  stoppedAt: string | null;
  reply: {
    text: string;
    triggerId: string;
    mode: "text" | "otp";
    reaction?: {
      id: string;
      name: string;
      kind: ReactionKind;
      usedFallback: boolean;
      error?: string;
    };
  } | null;
  webhooks: Array<{ id: string; name: string }>;
};

export type TriggerInput = {
  name: string;
  enabled?: boolean;
  channel?: TriggerChannel;
  matchType: TriggerMatch;
  matchValue?: string | null;
  keywordMatch?: TriggerKeywordMatch;
  listenTypes?: ListenType[];
  whitelist?: string[];
  blacklist?: string[];
  priority?: number;
  stopProcessing?: boolean;
  actionType: TriggerAction;
  actionConfig?: { mode?: "text" | "otp"; body?: string };
  reactionId?: string | null;
};

export type SetupDraft = {
  triggerName: string;
  reactionName: string;
  channel: TriggerChannel;
  matchType: "any" | "keyword";
  matchValue: string | null;
  keywordMatch: TriggerKeywordMatch;
  listenTypes: ListenType[];
  whitelist: string[];
  blacklist: string[];
  context: string;
  fallback: string;
  provider: LlmProvider;
  model: string;
  hasApiKey: boolean;
  testText: string;
  lastTestReply?: string;
  reactionKind?: "agent" | "other";
  lockMatch?: boolean;
};

export type SenderList = "whitelist" | "blacklist";

export type SetupPending =
  | { type: "connect_channel" }
  | { type: "ask_channel"; options: Array<"whatsapp" | "telegram" | "both"> }
  | { type: "ask_keyword" }
  | { type: "ask_sender"; list: SenderList; action?: "add" | "remove" }
  | {
      type: "ask_rule";
      list: SenderList;
      entries: string[];
      action?: "add" | "remove";
      options: Array<{ id: string; name: string }>;
    }
  | {
      type: "hold_sender";
      list: SenderList;
      entries: string[];
      action?: "add" | "remove";
    }
  | { type: "hold_listen"; listenTypes: ListenType[] }
  | { type: "approve_context" }
  | { type: "ask_key"; provider: LlmProvider }
  | {
      type: "test_result";
      text: string;
      usedFallback: boolean;
      error?: string;
      testText: string;
    }
  | { type: "applied" }
  | { type: "reverted" };

export type SetupChangeset = {
  triggerId: string;
  reactionId: string;
  createdTrigger: boolean;
  createdReaction: boolean;
  status: "applied" | "reverted" | "kept";
};

export type SetupMessage = {
  id: string;
  role: "user" | "assistant";
  body: string;
  createdAt: string;
};

export type SetupSession = {
  id: string;
  status: "open" | "closed";
  draft: SetupDraft | null;
  pending: SetupPending | null;
  changeset: SetupChangeset | null;
  messages: SetupMessage[];
  workspace: {
    whatsapp: boolean;
    telegram: boolean;
    jokubotReady: boolean;
    triggerCount: number;
    reactionCount: number;
  };
};

export type SetupAct =
  | { action: "approve_context"; context?: string }
  | { action: "set_keyword"; keyword: string }
  | { action: "choose_channel"; channel: TriggerChannel }
  | { action: "set_sender"; entry: string; list?: SenderList }
  | { action: "choose_rule"; triggerId: string }
  | { action: "provide_key"; apiKey: string; provider?: LlmProvider }
  | { action: "simulate"; text?: string }
  | { action: "revert" }
  | { action: "keep" }
  | { action: "start_over" }
  | { action: "focus"; triggerId?: string; reactionId?: string };

export type WhatsAppPair = {
  status: "idle" | "waiting" | "linked" | "error";
  number: string | null;
  qrDataUrl: string | null;
  pairingCode: string | null;
  message: string | null;
  updatedAt: string;
};

export class ApiError extends Error {
  constructor(
    override readonly message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return previewRequest<T>(path, init);
}

export const api = {
  me: () => request<{ me: Me }>("/v1/dashboard/me"),
  login: (email: string, password: string) =>
    request<{ me: Me }>("/v1/dashboard/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (body: {
    accountKind: "individual" | "business";
    accountHolder: string;
    email: string;
    country: string;
    password: string;
    businessName?: string;
    companySize?: string;
  }) =>
    request<{ me: Me; credentials: { apiKey: string; ingestSecret: string; mintSecret: string } }>(
      "/v1/dashboard/signup",
      { method: "POST", body: JSON.stringify(body) },
    ),
  logout: () => request<{ ok: boolean }>("/v1/dashboard/logout", { method: "POST" }),
  overview: () => request<Overview>("/v1/dashboard/overview"),
  usage: () => request<WorkspaceUsage>("/v1/dashboard/usage"),
  verifications: () =>
    request<{ items: Verification[] }>("/v1/dashboard/verifications"),
  createVerification: (
    channel: "whatsapp" | "telegram",
    clientRef?: string,
    prompt?: string,
    purpose?: string,
  ) =>
    request<CreatedVerification>("/v1/dashboard/verifications", {
      method: "POST",
      body: JSON.stringify({
        channel,
        clientRef,
        phoneNumber: channel === "whatsapp" ? clientRef : undefined,
        prompt,
        purpose,
      }),
    }),
  simulateVerification: (
    channel: "whatsapp" | "telegram",
    phoneNumber?: string,
    purpose?: string,
  ) =>
    request<CreatedVerification>("/v1/dashboard/verifications/simulate", {
      method: "POST",
      body: JSON.stringify({ channel, phoneNumber, purpose }),
    }),
  inbound: () => request<{ items: InboundRow[] }>("/v1/dashboard/inbound"),
  purposes: () => request<{ items: VerificationPurpose[] }>("/v1/dashboard/purposes"),
  createPurpose: (body: { title: string; slug?: string }) =>
    request<VerificationPurpose>("/v1/dashboard/purposes", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePurpose: (id: string, body: { title: string }) =>
    request<VerificationPurpose>(`/v1/dashboard/purposes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deletePurpose: (id: string) =>
    request<{ ok: boolean }>(`/v1/dashboard/purposes/${id}`, {
      method: "DELETE",
    }),
  conversations: (channel?: "whatsapp" | "telegram") => {
    const query = channel ? `?channel=${channel}` : "";
    return request<{ items: ConversationSummary[] }>(
      `/v1/dashboard/conversations${query}`,
    );
  },
  conversation: (channel: "whatsapp" | "telegram", sender: string) => {
    const params = new URLSearchParams({ channel, sender });
    return request<ConversationThread>(
      `/v1/dashboard/conversations/thread?${params.toString()}`,
    );
  },
  saveSettings: (body: {
    name?: string;
    whatsappNumber?: string | null;
    telegramBotUsername?: string | null;
    webhookUrl?: string | null;
    inboundRetentionDays?: number;
    verificationReplies?: Partial<VerificationReplies>;
  }) =>
    request<{ tenant: Tenant; webhookSecret?: string }>(
      "/v1/dashboard/settings",
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  startWhatsAppPair: (number: string) =>
    request<{ tenant: Tenant; pair: WhatsAppPair }>(
      "/v1/dashboard/whatsapp/pair",
      { method: "POST", body: JSON.stringify({ number }) },
    ),
  whatsappPair: () =>
    request<{ tenant: Tenant; pair: WhatsAppPair }>("/v1/dashboard/whatsapp/pair"),
  connectTelegram: (token: string) =>
    request<{ tenant: Tenant }>("/v1/dashboard/telegram/connect", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  disconnectWhatsApp: () =>
    request<{ tenant: Tenant }>("/v1/dashboard/whatsapp/disconnect", {
      method: "POST",
    }),
  reconnectWhatsApp: () =>
    request<{ tenant: Tenant; pair: WhatsAppPair }>(
      "/v1/dashboard/whatsapp/reconnect",
      { method: "POST" },
    ),
  disconnectTelegram: () =>
    request<{ tenant: Tenant }>("/v1/dashboard/telegram/disconnect", {
      method: "POST",
    }),
  reconnectTelegram: () =>
    request<{ tenant: Tenant }>("/v1/dashboard/telegram/reconnect", {
      method: "POST",
    }),
  rotateApiKey: () =>
    request<{ apiKey: string }>("/v1/dashboard/keys/rotate-api", {
      method: "POST",
    }),
  rotateIngest: () =>
    request<{ ingestSecret: string }>("/v1/dashboard/keys/rotate-ingest", {
      method: "POST",
    }),
  rotateMint: () =>
    request<{ mintSecret: string; mintKid: number }>("/v1/dashboard/keys/rotate-mint", {
      method: "POST",
    }),
  triggers: () => request<{ items: Trigger[] }>("/v1/dashboard/triggers"),
  createTrigger: (body: TriggerInput) =>
    request<Trigger>("/v1/dashboard/triggers", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateTrigger: (id: string, body: Partial<TriggerInput>) =>
    request<Trigger>(`/v1/dashboard/triggers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  reorderTriggers: (ids: string[]) =>
    request<{ items: Trigger[] }>("/v1/dashboard/triggers/reorder", {
      method: "PATCH",
      body: JSON.stringify({ ids }),
    }),
  simulateTriggers: (body: {
    text: string;
    senderName?: string;
    senderNumber?: string;
    channel?: "whatsapp" | "telegram";
    mediaType?: ListenType;
  }) =>
    request<TriggerSimulation>("/v1/dashboard/triggers/simulate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  testWebhook: () =>
    request<{ ok: boolean; status: number }>("/v1/dashboard/webhook/test", {
      method: "POST",
    }),
  webhookDeliveries: () =>
    request<{ items: WebhookDelivery[] }>("/v1/dashboard/webhook/deliveries"),
  replayWebhook: (id: string) =>
    request<WebhookDelivery>(`/v1/dashboard/webhook/deliveries/${id}/replay`, {
      method: "POST",
    }),
  publicStatus: () => request<PublicStatus>("/v1/status"),
  deleteTrigger: (id: string) =>
    request<{ ok: boolean }>(`/v1/dashboard/triggers/${id}`, {
      method: "DELETE",
    }),
  llm: () => request<LlmCatalog>("/v1/dashboard/llm"),
  reactions: () => request<{ items: Reaction[] }>("/v1/dashboard/reactions"),
  createReaction: (body: ReactionInput) =>
    request<Reaction>("/v1/dashboard/reactions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateReaction: (id: string, body: Partial<ReactionInput>) =>
    request<Reaction>(`/v1/dashboard/reactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteReaction: (id: string) =>
    request<{ ok: boolean }>(`/v1/dashboard/reactions/${id}`, {
      method: "DELETE",
    }),
  setupSession: () => request<SetupSession>("/v1/dashboard/setup-agent"),
  setupMessage: (text: string) =>
    request<SetupSession>("/v1/dashboard/setup-agent/messages", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  setupAct: (body: SetupAct) =>
    request<SetupSession>("/v1/dashboard/setup-agent/act", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setupReset: () =>
    request<SetupSession>("/v1/dashboard/setup-agent/reset", {
      method: "POST",
    }),
};
