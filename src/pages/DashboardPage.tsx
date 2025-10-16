import { useNavigate } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import Dashboard from "./Dashboard";

const DashboardPage = () => {
  const navigate = useNavigate();

  const handleNavigate = (view: "chat" | "leaderboard" | "dashboard") => {
    if (view === "chat") {
      navigate("/");
    } else if (view === "leaderboard") {
      navigate("/leaderboard");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background overflow-hidden">
      <AppSidebar
        currentView="dashboard"
        onNavigate={handleNavigate}
      />
      <Dashboard />
    </div>
  );
};

export default DashboardPage;
