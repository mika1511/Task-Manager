import { Home, UserCheck, UserPlus, Zap, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: "assignedTo" | "createdBy";
  onViewChange: (view: "assignedTo" | "createdBy") => void;
  onHomeClick: () => void;
}

export function AppSidebar({ isOpen, onClose, activeView, onViewChange, onHomeClick }: SidebarProps) {
  const handleHomeClick = () => {
    onHomeClick();
    onClose(); // Close sidebar on Home click as requested
  };

  const navItems = [
    { label: "Home", icon: Home, onClick: handleHomeClick, active: false },
    { 
      label: "Assigned To Me", 
      icon: UserCheck, 
      onClick: () => onViewChange("assignedTo"), 
      active: activeView === "assignedTo" 
    },
    { 
      label: "Created By Me", 
      icon: UserPlus, 
      onClick: () => onViewChange("createdBy"), 
      active: activeView === "createdBy" 
    },
  ];

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 256, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:flex flex-col border-r border-border bg-sidebar shrink-0 overflow-hidden"
        >
          <div className="h-16 flex items-center justify-between px-6 border-b border-border min-w-[256px]">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground tracking-tight">TaskFlow</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground md:flex hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex-1 p-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  item.active 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
