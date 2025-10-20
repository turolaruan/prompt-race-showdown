import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MessageSquare, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatHistory } from "@/context/ChatHistoryContext";

const ChatHistoryPanel = () => {
  const { history, currentChatId, setCurrentChat } = useChatHistory();
  const navigate = useNavigate();

  const formattedHistory = useMemo(
    () =>
      history.map((entry) => ({
        ...entry,
        formattedDate: new Date(entry.timestamp).toLocaleDateString(),
      })),
    [history]
  );

  const handleSelect = (id: string) => {
    setCurrentChat(id);
    navigate("/");
  };

  const handleNewChat = () => {
    setCurrentChat(null);
    navigate("/");
  };

  return (
    <aside className="hidden lg:flex w-80 min-h-screen flex-col border-l border-border bg-muted/30">
      <div className="flex flex-col gap-4 p-6 pb-0">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Histórico de Chats
          </h2>
          <p className="text-xs text-muted-foreground">
            Consulte conversas recentes ou abra a Arena para continuar um chat.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleNewChat}>
          <MessageSquare className="h-4 w-4" />
          Abrir Arena
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-2">
        {formattedHistory.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground text-center">
            Nenhum chat registrado ainda. Inicie uma conversa na Arena.
          </div>
        )}

        {formattedHistory.map((chat) => (
          <button
            key={chat.id}
            onClick={() => handleSelect(chat.id)}
            className={`w-full rounded-lg border border-transparent bg-background/70 p-3 text-left transition-colors hover:border-primary/40 ${
              currentChatId === chat.id ? "border-primary/60 bg-primary/5" : ""
            }`}
          >
            <div className="text-sm font-medium text-foreground truncate">{chat.prompt}</div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {chat.formattedDate}
              </span>
              {chat.winner && (
                <span className="flex items-center gap-1 text-emerald-500">
                  <Trophy className="h-3.5 w-3.5" />
                  {chat.winner}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default ChatHistoryPanel;
