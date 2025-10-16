import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import LeaderboardContent from "@/components/Leaderboard";

const LeaderboardPage = () => {
  const navigate = useNavigate();

  const handleNavigate = (view: "chat" | "leaderboard" | "dashboard") => {
    if (view === "chat") {
      navigate("/");
    } else if (view === "dashboard") {
      navigate("/dashboard");
    } else {
      navigate("/leaderboard");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background overflow-hidden">
      <AppSidebar
        currentView="leaderboard"
        onNavigate={handleNavigate}
      />
      <LeaderboardContent />
    </div>
  );
};

export default LeaderboardPage;
