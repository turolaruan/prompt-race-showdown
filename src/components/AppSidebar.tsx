import { Link, useLocation } from "react-router-dom";
import { Trophy, TrendingUp, MessageSquare, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import gbcsrtLogo from "@/assets/gb-cs-rt-logo.png";

const AppSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <div className="w-full lg:w-80 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4">
        <div className="flex items-center gap-3 text-sidebar-foreground font-bold text-lg mb-6">
          <img src={gbcsrtLogo} alt="GB-CS-RT" className="w-8 h-8" />
          GB-CS-RT
        </div>
        
        <Link to="/">
          <Button 
            variant={isActive("/") ? "default" : "outline"}
            className="w-full justify-start gap-2 mb-2"
          >
            <MessageSquare size={16} />
            Arena
          </Button>
        </Link>

        <Link to="/leaderboard">
          <Button 
            variant={isActive("/leaderboard") ? "default" : "outline"}
            className="w-full justify-start gap-2 mb-2"
          >
            <TrendingUp size={16} />
            Leaderboard
          </Button>
        </Link>

        <Link to="/dashboard">
          <Button 
            variant={isActive("/dashboard") ? "default" : "outline"}
            className="w-full justify-start gap-2 mb-2"
          >
            <BarChart3 size={16} />
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default AppSidebar;
