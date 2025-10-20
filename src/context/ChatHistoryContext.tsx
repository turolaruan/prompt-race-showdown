import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";

export interface ChatHistoryEntry {
  id: string;
  prompt: string;
  timestamp: string;
  winner?: string;
}

interface ChatHistoryContextValue {
  history: ChatHistoryEntry[];
  currentChatId: string | null;
  addChat: (prompt: string) => string;
  updateChat: (id: string, updates: Partial<Omit<ChatHistoryEntry, "id">>) => void;
  setCurrentChat: (id: string | null) => void;
  clearHistory: () => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextValue | undefined>(undefined);

const HISTORY_STORAGE_KEY = "prompt-race-chat-history";
const CURRENT_CHAT_STORAGE_KEY = "prompt-race-chat-current";

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const ChatHistoryProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<ChatHistoryEntry[]>(() =>
    readStorage<ChatHistoryEntry[]>(HISTORY_STORAGE_KEY, [])
  );
  const [currentChatId, setCurrentChatId] = useState<string | null>(() =>
    readStorage<string | null>(CURRENT_CHAT_STORAGE_KEY, null)
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentChatId) {
      window.localStorage.setItem(CURRENT_CHAT_STORAGE_KEY, JSON.stringify(currentChatId));
    } else {
      window.localStorage.removeItem(CURRENT_CHAT_STORAGE_KEY);
    }
  }, [currentChatId]);

  const addChat = useCallback<ChatHistoryContextValue["addChat"]>((prompt) => {
    const id =
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

    const entry: ChatHistoryEntry = {
      id,
      prompt,
      timestamp: new Date().toISOString(),
    };

    setHistory((prev) => [entry, ...prev]);
    setCurrentChatId(id);
    return id;
  }, []);

  const updateChat = useCallback<ChatHistoryContextValue["updateChat"]>((id, updates) => {
    setHistory((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentChatId(null);
  }, []);

  const value = useMemo<ChatHistoryContextValue>(
    () => ({
      history,
      currentChatId,
      addChat,
      updateChat,
      setCurrentChat: setCurrentChatId,
      clearHistory,
    }),
    [history, currentChatId, addChat, updateChat, clearHistory]
  );

  return <ChatHistoryContext.Provider value={value}>{children}</ChatHistoryContext.Provider>;
};

export const useChatHistory = () => {
  const context = useContext(ChatHistoryContext);
  if (!context) {
    throw new Error("useChatHistory must be used within a ChatHistoryProvider");
  }
  return context;
};
