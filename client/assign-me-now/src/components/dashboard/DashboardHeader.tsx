import { Plus, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

interface Props {
  onCreateTask: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function DashboardHeader({ onCreateTask, onToggleSidebar, sidebarOpen }: Props) {
  const { user, logout } = useAuth();
  
  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-4">
        {!sidebarOpen && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleSidebar}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-base font-semibold text-foreground">Dashboard</h1>
      </div>
      <div className="flex items-center gap-3">
        <div 
          className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground border border-border"
          title={user?.email}
        >
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
        <button
          onClick={onCreateTask}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-md shadow-[var(--shadow-sm)] hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Task
        </button>
        <Button variant="ghost" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
