import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";

export interface ChatTurnOutput {
  id: string;
  modelId: string;
  modelName: string;
  response: string;
  responseTimeMs: number;
}

export interface ChatTurn {
  id: string;
  prompt: string;
  timestamp: string;
  outputs: ChatTurnOutput[];
  winnerOutputId?: string | null;
  winnerModelId?: string | null;
  winnerModelName?: string | null;
}

export interface ChatHistoryEntry {
  id: string;
  prompt: string;
  timestamp: string;
  updatedAt: string;
  winner?: string;
  turns: ChatTurn[];
}

interface ChatHistoryContextValue {
  history: ChatHistoryEntry[];
  currentChatId: string | null;
  addChat: (prompt: string) => string;
  updateChat: (id: string, updates: Partial<Omit<ChatHistoryEntry, "id" | "turns">>) => void;
  appendTurn: (id: string, turn: ChatTurn) => void;
  setTurnWinner: (
    id: string,
    turnId: string,
    winner: { outputId?: string | null; modelId: string; modelName: string }
  ) => void;
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
  const normalizeHistory = useCallback((entries: ChatHistoryEntry[]): ChatHistoryEntry[] => {
    return entries.map(entry => {
      const timestamp = entry?.timestamp ?? new Date().toISOString();
      const updatedAt = entry?.updatedAt ?? timestamp;
      let turns = Array.isArray(entry?.turns)
        ? entry.turns.map(turn => ({
            ...turn,
            outputs: Array.isArray(turn.outputs) ? turn.outputs : [],
            winnerOutputId:
              typeof turn.winnerOutputId === "string" || turn.winnerOutputId === null
                ? turn.winnerOutputId
                : null,
            winnerModelId:
              typeof turn.winnerModelId === "string" || turn.winnerModelId === null
                ? turn.winnerModelId
                : null,
            winnerModelName:
              typeof turn.winnerModelName === "string" || turn.winnerModelName === null
                ? turn.winnerModelName
                : null,
          }))
        : [];

      if (entry.winner && turns.length > 0) {
        const lastIndex = turns.length - 1;
        const lastTurn = turns[lastIndex];
        if (!lastTurn.winnerModelName && !lastTurn.winnerOutputId) {
          const normalizedWinner = entry.winner.trim().toLowerCase();
          let matchedOutputId: string | null = null;
          const outputs = Array.isArray(lastTurn.outputs) ? lastTurn.outputs : [];
          if (normalizedWinner) {
            const matched = outputs.find(output => {
              const label = (output.modelName || output.modelId || "").trim().toLowerCase();
              return label === normalizedWinner;
            });
            matchedOutputId = matched?.id ?? null;
          }

          turns = turns.map((turn, index) =>
            index === lastIndex
              ? {
                  ...turn,
                  winnerOutputId: matchedOutputId,
                  winnerModelId:
                    matchedOutputId && outputs.length > 0
                      ? outputs.find(output => output.id === matchedOutputId)?.modelId ?? null
                      : turn.winnerModelId ?? null,
                  winnerModelName: entry.winner,
                }
              : turn
          );
        }
      }
      return {
        id: entry.id,
        prompt: entry.prompt ?? "",
        timestamp,
        updatedAt,
        winner: entry.winner,
        turns,
      };
    });
  }, []);

  const [history, setHistory] = useState<ChatHistoryEntry[]>(() => {
    const stored = readStorage<ChatHistoryEntry[]>(HISTORY_STORAGE_KEY, []);
    return normalizeHistory(stored);
  });
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

  const sortHistory = useCallback((entries: ChatHistoryEntry[]) => {
    return [...entries].sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.timestamp).getTime();
      const bTime = new Date(b.updatedAt ?? b.timestamp).getTime();
      return bTime - aTime;
    });
  }, []);

  const addChat = useCallback<ChatHistoryContextValue["addChat"]>((prompt) => {
    const id =
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

    const timestamp = new Date().toISOString();
    const entry: ChatHistoryEntry = {
      id,
      prompt,
      timestamp,
      updatedAt: timestamp,
      winner: undefined,
      turns: [],
    };

    setHistory((prev) => sortHistory([entry, ...prev]));
    setCurrentChatId(id);
    return id;
  }, [sortHistory]);

  const updateChat = useCallback<ChatHistoryContextValue["updateChat"]>((id, updates) => {
    const resolvedUpdates = { ...updates } as Partial<ChatHistoryEntry>;
    if (updates.prompt || updates.winner) {
      resolvedUpdates.updatedAt = new Date().toISOString();
    }
    setHistory((prev) => {
      const mapped = prev.map((entry) =>
        entry.id === id ? { ...entry, ...resolvedUpdates } : entry
      );
      return sortHistory(mapped);
    });
  }, [sortHistory]);

  const appendTurn = useCallback<ChatHistoryContextValue["appendTurn"]>((id, turn) => {
    const storedTurn: ChatTurn = {
      ...turn,
      outputs: Array.isArray(turn.outputs) ? [...turn.outputs] : [],
      winnerOutputId: turn.winnerOutputId ?? null,
      winnerModelId: turn.winnerModelId ?? null,
      winnerModelName: turn.winnerModelName ?? null,
    };
    setHistory(prev => {
      const next = prev.map(entry => {
        if (entry.id !== id) return entry;
        return {
          ...entry,
          prompt: turn.prompt,
          updatedAt: turn.timestamp,
          turns: [...entry.turns, storedTurn],
        };
      });
      return sortHistory(next);
    });
  }, [sortHistory]);

  const setTurnWinner = useCallback<ChatHistoryContextValue["setTurnWinner"]>((id, turnId, winner) => {
    const updatedAt = new Date().toISOString();
    setHistory(prev => {
      const next = prev.map(entry => {
        if (entry.id !== id) return entry;
        let turnUpdated = false;
        const turns = entry.turns.map(turn => {
          if (turn.id !== turnId) return turn;
          turnUpdated = true;
          return {
            ...turn,
            winnerOutputId: winner.outputId ?? null,
            winnerModelId: winner.modelId,
            winnerModelName: winner.modelName,
          };
        });
        if (!turnUpdated) {
          return entry;
        }
        return {
          ...entry,
          turns,
          winner: winner.modelName,
          updatedAt,
        };
      });
      return sortHistory(next);
    });
  }, [sortHistory]);

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
      appendTurn,
      setTurnWinner,
      setCurrentChat: setCurrentChatId,
      clearHistory,
    }),
    [history, currentChatId, addChat, updateChat, appendTurn, setTurnWinner, clearHistory]
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
