import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: "pending" | "inprogress" | "done";
  assignedTo: string;
  assignedToUser?: { id: string; name: string };
  createdBy: string;
  createdAt: string;
}

const statusConfig: Record<Task["status"], { label: string; bg: string; text: string }> = {
  pending: { label: "PENDING", bg: "bg-muted", text: "text-muted-foreground" },
  inprogress: { label: "IN PROGRESS", bg: "bg-primary/10", text: "text-primary" },
  done: { label: "DONE", bg: "bg-success/10", text: "text-success" },
};

const statusOptions: Task["status"][] = ["pending", "inprogress", "done"];

interface TaskCardProps {
  task: Task;
  canChangeStatus?: boolean;
  onTaskUpdated?: () => void;
}

export function TaskCard({ task, canChangeStatus, onTaskUpdated }: TaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const status = statusConfig[task.status] || statusConfig.pending; // Fallback
  
  const handleStatusChange = async (newStatus: Task["status"]) => {
      try {
          setIsUpdating(true);
          await api.patch(`/tasks/${task._id}`, { status: newStatus });
          toast.success(`Task marked as ${statusConfig[newStatus].label}`);
          onTaskUpdated?.();
      } catch (e: any) {
          toast.error(e.response?.data?.error || "Failed to update task");
      } finally {
          setIsUpdating(false);
      }
  }

  const badge = (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${status.bg} ${status.text} inline-flex items-center gap-1`}>
      {isUpdating ? <Loader2 className="h-3 w-3 animate-spin"/> : status.label}
      {canChangeStatus && !isUpdating && <ChevronDown className="h-3 w-3" />}
    </span>
  );

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col gap-3 p-4 bg-card border border-border rounded-lg shadow-[var(--shadow-card)] transition-colors hover:border-muted-foreground/30"
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-mono text-muted-foreground tracking-wider line-clamp-1 w-24">
          {task._id}
        </span>
        {canChangeStatus ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isUpdating}>
              <button className="cursor-pointer">{badge}</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {statusOptions.map((s) => (
                <DropdownMenuItem
                  key={s}
                  disabled={s === task.status}
                  onClick={() => handleStatusChange(s)}
                >
                  <span className={`mr-2 h-2 w-2 rounded-full ${statusConfig[s].bg}`} />
                  {statusConfig[s].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          badge
        )}
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-snug text-balance">
        {task.title}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
      
      {task.assignedToUser && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <div className="h-5 w-5 rounded-md bg-muted border border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground">
            {task.assignedToUser.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-[12px] text-muted-foreground font-medium">
            {task.assignedToUser.name}
          </span>
        </div>
      )}
    </motion.div>
  );
}