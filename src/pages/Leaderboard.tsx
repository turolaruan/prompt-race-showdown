import Leaderboard from "@/components/Leaderboard";
import AppSidebar from "@/components/AppSidebar";

const LeaderboardPage = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <Leaderboard />
    </div>
  );
};

export default LeaderboardPage;
