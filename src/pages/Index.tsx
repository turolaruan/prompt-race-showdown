import { useRef } from "react";
import ArenaInterface, { ArenaInterfaceHandle } from "@/components/ArenaInterface";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/context/SidebarContext";

const Index = () => {
  const arenaRef = useRef<ArenaInterfaceHandle>(null);
  const { collapsed: isSidebarCollapsed, toggle: toggleSidebar } = useSidebar();

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background lg:flex-row">
      <AppSidebar
        collapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        onStartNewChat={() => arenaRef.current?.startNewChat()}
        onSelectChat={chat => arenaRef.current?.loadChat(chat)}
      />
      <main className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <ArenaInterface ref={arenaRef} />
      </main>
    </div>
  );
};

export default Index;
