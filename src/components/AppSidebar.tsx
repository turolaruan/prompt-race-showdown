import { MessageSquare, TrendingUp, BarChart3, Clock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import gbcsrtLogo from "@/assets/gb-cs-rt-logo.png";

interface ChatHistory {
  id: string;
  prompt: string;
  timestamp: Date;
  winner?: string;
}

interface AppSidebarProps {
  currentView: "chat" | "leaderboard" | "dashboard";
  onNavigate: (view: "chat" | "leaderboard" | "dashboard") => void;
  onNewChat?: () => void;
  chatHistory?: ChatHistory[];
  onLoadChat?: (chat: ChatHistory) => void;
}

const AppSidebar = ({ 
  currentView, 
  onNavigate, 
  onNewChat, 
  chatHistory = [], 
  onLoadChat 
}: AppSidebarProps) => {
  return (
    <div className="w-full lg:w-80 bg-sidebar border-r border-sidebar-border flex flex-col max-h-screen overflow-hidden">
      <div className="p-4 overflow-y-auto">
        <div className="flex items-center gap-3 text-sidebar-foreground font-bold text-lg mb-6">
          <img src={gbcsrtLogo} alt="GB-CS-RT" className="w-8 h-8" />
          GB-CS-RT
        </div>
        
        {onNewChat && (
          <Button 
            onClick={onNewChat} 
            className="w-full justify-start gap-2 mb-4 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground"
          >
            <MessageSquare size={16} />
            Novo Chat
          </Button>
        )}

        <Button 
          onClick={() => onNavigate("leaderboard")} 
          variant={currentView === "leaderboard" ? "default" : "outline"}
          className="w-full justify-start gap-2 mb-2"
        >
          <TrendingUp size={16} />
          Leaderboard
        </Button>

        <Button 
          onClick={() => onNavigate("dashboard")} 
          variant={currentView === "dashboard" ? "default" : "outline"}
          className="w-full justify-start gap-2 mb-6"
        >
          <BarChart3 size={16} />
          Dashboard
        </Button>
        
        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-sidebar-foreground mb-3">Histórico</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {chatHistory.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => onLoadChat?.(chat)}
                  className="w-full text-left p-3 rounded-lg hover:bg-sidebar-accent/50 transition-colors group"
                >
                  <div className="text-sm text-sidebar-foreground truncate mb-1">
                    {chat.prompt}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {chat.timestamp.toLocaleDateString()}
                    </span>
                    {chat.winner && (
                      <span className="flex items-center gap-1 text-winner">
                        <Trophy size={12} />
                        {chat.winner}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {chatHistory.length === 0 && onNewChat && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum chat realizado ainda
          </p>
        )}
      </div>
    </div>
  );
};

export default AppSidebar;
