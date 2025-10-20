import Leaderboard from "@/components/Leaderboard";
import AppSidebar from "@/components/AppSidebar";

const LeaderboardPage = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <AppSidebar />
      <Leaderboard />
    </div>
  );
};

export default LeaderboardPage;
