import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, type ConversationSummary } from "../api.js";

/* Boîte de réception partagée : liste des conversations, non lus et archives.
   L'API ne connaît pas l'état « lu » ni l'archivage : ils sont mémorisés sur
   cet appareil (voir docs/ui-hypotheses.md). */

const SEEN_KEY = "joku.inbox.seen";
const ARCHIVED_KEY = "joku.inbox.archived";
const BASELINE_KEY = "joku.inbox.baseline";
const REFRESH_MS = 30_000;

type Stamps = Record<string, string>;

export function conversationKey(row: { channel: string; senderRef: string }): string {
  return `${row.channel}:${row.senderRef}`;
}

function readStamps(key: string): Stamps {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Stamps) : {};
  } catch {
    return {};
  }
}

function writeStamps(key: string, value: Stamps) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage bloqué : l'état ne sera pas retenu.
  }
}

/** Au tout premier passage, ce qui date de plus de 24 h est considéré comme lu. */
function readBaseline(): string {
  try {
    const stored = localStorage.getItem(BASELINE_KEY);
    if (stored) return stored;
    const value = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    localStorage.setItem(BASELINE_KEY, value);
    return value;
  } catch {
    return new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  }
}

type InboxState = {
  items: ConversationSummary[] | null;
  error: string | null;
  unreadCount: number;
  isUnread: (row: ConversationSummary) => boolean;
  isArchived: (row: ConversationSummary) => boolean;
  markRead: (row: { channel: string; senderRef: string; lastReceivedAt?: string }) => void;
  markAllRead: () => void;
  archive: (row: ConversationSummary) => void;
  unarchive: (row: ConversationSummary) => void;
  refresh: () => Promise<void>;
};

const InboxContext = createContext<InboxState | null>(null);

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState<Stamps>(() => readStamps(SEEN_KEY));
  const [archived, setArchived] = useState<Stamps>(() => readStamps(ARCHIVED_KEY));
  const [baseline] = useState(readBaseline);

  const refresh = useCallback(async () => {
    try {
      const result = await api.conversations();
      setItems(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
      setItems((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const isUnread = useCallback(
    (row: ConversationSummary) => row.lastReceivedAt > (seen[conversationKey(row)] ?? baseline),
    [seen, baseline],
  );

  // Une conversation archivée revient dans la liste si un nouveau message arrive.
  const isArchived = useCallback(
    (row: ConversationSummary) => {
      const at = archived[conversationKey(row)];
      return Boolean(at) && row.lastReceivedAt <= (at as string);
    },
    [archived],
  );

  const markRead = useCallback<InboxState["markRead"]>((row) => {
    setSeen((current) => {
      const next = { ...current, [conversationKey(row)]: row.lastReceivedAt ?? new Date().toISOString() };
      writeStamps(SEEN_KEY, next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setSeen((current) => {
      const next = { ...current };
      for (const row of items ?? []) next[conversationKey(row)] = row.lastReceivedAt;
      writeStamps(SEEN_KEY, next);
      return next;
    });
  }, [items]);

  const archive = useCallback((row: ConversationSummary) => {
    setArchived((current) => {
      const next = { ...current, [conversationKey(row)]: row.lastReceivedAt };
      writeStamps(ARCHIVED_KEY, next);
      return next;
    });
  }, []);

  const unarchive = useCallback((row: ConversationSummary) => {
    setArchived((current) => {
      const next = { ...current };
      delete next[conversationKey(row)];
      writeStamps(ARCHIVED_KEY, next);
      return next;
    });
  }, []);

  const unreadCount = useMemo(
    () => (items ?? []).filter((row) => isUnread(row) && !isArchived(row)).length,
    [items, isUnread, isArchived],
  );

  const value = useMemo(
    () => ({ items, error, unreadCount, isUnread, isArchived, markRead, markAllRead, archive, unarchive, refresh }),
    [items, error, unreadCount, isUnread, isArchived, markRead, markAllRead, archive, unarchive, refresh],
  );
  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxState {
  const value = useContext(InboxContext);
  if (!value) throw new Error("useInbox must be used inside InboxProvider");
  return value;
}
