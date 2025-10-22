import { useRef } from "react";
import ArenaInterface, { ArenaInterfaceHandle } from "@/components/ArenaInterface";
import AppSidebar from "@/components/AppSidebar";

const Index = () => {
  const arenaRef = useRef<ArenaInterfaceHandle>(null);

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <AppSidebar
        onStartNewChat={() => arenaRef.current?.startNewChat()}
        onSelectChat={chat => arenaRef.current?.loadChat(chat)}
      />
      <main className="flex flex-1 flex-col">
        <ArenaInterface ref={arenaRef} />
      </main>
    </div>
  );
};

export default Index;
