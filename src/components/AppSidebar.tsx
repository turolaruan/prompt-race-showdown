import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  MessageSquare,
  MessageSquarePlus,
  BarChart3,
  Clock,
  Trophy,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import gbcsrtLogo from "@/assets/gb-cs-rt-logo.png";
import { cn } from "@/lib/utils";
import { useChatHistory } from "@/context/ChatHistoryContext";
import type { ChatHistoryEntry } from "@/context/ChatHistoryContext";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onStartNewChat?: () => void;
  onSelectChat?: (chat: ChatHistoryEntry) => void;
}

const AppSidebar = ({ collapsed, onToggle, onStartNewChat, onSelectChat }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { history, currentChatId, setCurrentChat } = useChatHistory();
  const MAX_HISTORY_WITHOUT_SCROLL = 5;
  const historyItems = history;
  const hasHistoryOverflow = historyItems.length > MAX_HISTORY_WITHOUT_SCROLL;

  const isActive = (path: string) => currentPath === path;
  const isArena = isActive("/");

  const navItems = [
    isArena
      ? {
          type: "action" as const,
          label: "Novo Chat",
          description: "Iniciar uma nova conversa",
          icon: MessageSquarePlus,
          onClick: onStartNewChat ?? (() => setCurrentChat(null)),
        }
      : {
          type: "link" as const,
          label: "Arena",
          description: "Comparar modelos em tempo real",
          icon: MessageSquare,
          path: "/",
        },
    {
      type: "link" as const,
      label: "Leaderboard",
      description: "Ranking com votos da comunidade",
      icon: TrendingUp,
      path: "/leaderboard",
    },
    {
      type: "link" as const,
      label: "Dashboard",
      description: "Métricas detalhadas e filtros",
      icon: BarChart3,
      path: "/dashboard",
    },
  ];

  return (
    <aside
      className={cn(
        "flex-shrink-0 w-full min-h-screen overflow-y-auto border-b border-sidebar-border bg-sidebar transition-all duration-300 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:sticky lg:top-0 lg:self-start",
        collapsed ? "lg:w-20" : "lg:w-80"
      )}
    >
      <div className="flex h-full flex-col bg-gradient-to-b from-sidebar via-sidebar/95 to-background/40">
        <div className="border-b border-sidebar-border/70 px-4 py-4">
          <div className={cn("flex items-center justify-between gap-3 text-sidebar-foreground", collapsed && "flex-col gap-2") }>
            <div className={cn("flex items-center gap-3", collapsed && "justify-center") }>
              <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-sidebar-border/20">
                <img src={gbcsrtLogo} alt="GB-CS-RT" className="h-8 w-8" />
              </span>
              {!collapsed && (
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-sidebar-foreground/60">AI Arena</p>
                  <p className="text-xl font-bold text-sidebar-foreground">GB-CS-RT</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? "Expandir menu" : "Comprimir menu"}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-sidebar-foreground transition hover:bg-primary/10"
            >
              {collapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <nav className={cn("flex-1 space-y-6 py-6", collapsed ? "px-2" : "px-6") }>
          <div className={cn("space-y-3", collapsed && "space-y-2") }>
            {!collapsed && (
              <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/60">
                Navegação
              </p>
            )}
            <div className={cn("space-y-3", collapsed && "space-y-2") }>
              {navItems.map(item => {
                const Icon = item.icon;

                if (item.type === "action") {
                  const disabled = !item.onClick;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if (item.onClick) {
                          item.onClick();
                        }
                      }}
                      disabled={disabled}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                        "border-white/5 bg-white/0 text-sidebar-foreground/80 hover:-translate-y-[1px] hover:border-primary/30 hover:bg-primary/5 hover:text-sidebar-foreground",
                        collapsed && "justify-center px-3",
                        disabled && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-sidebar-foreground/70 transition group-hover:bg-primary/10 group-hover:text-primary",
                          collapsed && "h-9 w-9"
                        )}
                      >
                        <Icon size={20} />
                      </span>
                      {!collapsed && (
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold leading-none">{item.label}</span>
                          <span className="mt-1 text-xs text-sidebar-foreground/60">{item.description}</span>
                        </div>
                      )}
                    </button>
                  );
                }

                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path} className="block">
                    <div
                      className={cn(
                        "group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
                        "border-white/5 bg-white/0 text-sidebar-foreground/80 hover:-translate-y-[1px] hover:border-primary/30 hover:bg-primary/5 hover:text-sidebar-foreground",
                        collapsed && "justify-center px-3",
                        active &&
                          "border-primary/40 bg-primary/10 text-primary shadow-[0_18px_40px_-18px_rgba(59,130,246,0.45)] hover:border-primary/40 hover:bg-primary/15 hover:text-primary"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-sidebar-foreground/70 transition group-hover:bg-primary/10 group-hover:text-primary",
                          active && "bg-primary/20 text-primary",
                          collapsed && "h-9 w-9"
                        )}
                      >
                        <Icon size={20} />
                      </span>
                      {!collapsed && (
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold leading-none">{item.label}</span>
                          <span className="mt-1 text-xs text-sidebar-foreground/60">{item.description}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          {!collapsed && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/60">
                Histórico
              </p>
              <div
                className={cn(
                  "space-y-2 rounded-2xl border border-white/5 bg-white/0 p-3",
                  hasHistoryOverflow ? "max-h-[20rem] overflow-y-auto custom-scrollbar" : ""
                )}
              >
                {historyItems.length === 0 && (
                  <p className="text-xs text-sidebar-foreground/50">Nenhum chat registrado ainda.</p>
                )}
                {historyItems.map(chat => {
                  const activeChat = currentChatId === chat.id;
                  const isChatActive = isArena && activeChat;
                  const handleClick = () => {
                    setCurrentChat(chat.id);
                    if (onSelectChat) {
                      onSelectChat(chat);
                    } else if (!isArena) {
                      navigate("/");
                    }
                  };
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={handleClick}
                      className={cn(
                        "w-full rounded-xl border border-transparent bg-white/0 px-3 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5",
                        isChatActive && "border-primary/40 bg-primary/10"
                      )}
                    >
                      <p className="truncate text-sm font-medium text-sidebar-foreground">
                        {chat.prompt || "Prompt sem título"}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-sidebar-foreground/60">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(chat.updatedAt ?? chat.timestamp).toLocaleDateString()}
                        </span>
                        {chat.winner && (
                          <span
                            className="flex min-w-0 items-center gap-1 text-emerald-400"
                            title={chat.winner}
                          >
                            <Trophy className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-[110px] truncate">{chat.winner}</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {!collapsed && (
          <div className="px-6 pb-6 pt-2 text-xs text-sidebar-foreground/50">
            <p>Powered by Prompt Race Showdown</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
