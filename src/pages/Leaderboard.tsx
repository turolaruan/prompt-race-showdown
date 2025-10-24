import Leaderboard from "@/components/Leaderboard";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/context/SidebarContext";

const LeaderboardPage = () => {
  const { collapsed: isSidebarCollapsed, toggle: toggleSidebar } = useSidebar();
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <AppSidebar collapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <main className="flex flex-1 flex-col">
        <Leaderboard />
      </main>
    </div>
  );
};

export default LeaderboardPage;
