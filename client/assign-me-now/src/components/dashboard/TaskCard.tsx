import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2, MoreVertical, Trash2, Edit3 } from "lucide-react";
import { api } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: "pending" | "inprogress" | "done";
  assignedTo: string;
  assignedToName?: string;
  createdBy: string;
  createdByName?: string;
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
  onEdit?: (task: Task) => void;
}

export function TaskCard({ task, canChangeStatus, onTaskUpdated, onEdit }: TaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user: currentUser } = useAuth();
  const status = statusConfig[task.status] || statusConfig.pending; // Fallback
  
  const isCreator = currentUser?.id === task.createdBy;

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

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
        setIsDeleting(true);
        await api.delete(`/tasks/${task._id}`);
        toast.success("Task deleted successfully");
        onTaskUpdated?.();
    } catch (e: any) {
        toast.error(e.response?.data?.error || "Failed to delete task");
    } finally {
        setIsDeleting(false);
    }
  };

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
      className={`group flex flex-col gap-3 p-4 bg-card border border-border rounded-lg shadow-[var(--shadow-card)] transition-colors hover:border-muted-foreground/30 ${isDeleting ? 'opacity-50 grayscale pointer-events-none' : ''}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-mono text-muted-foreground tracking-wider line-clamp-1 w-24">
          {task._id}
        </span>
        
        <div className="flex items-center gap-2">
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

            {isCreator && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit?.(task)}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Task
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-snug text-balance">
        {task.title}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
      
      <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
                {currentUser?.id === task.assignedTo ? "To:" : "Assignee:"}
            </span>
            <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                {(currentUser?.id === task.assignedTo ? "Me" : (task.assignedToName || "U")).charAt(0).toUpperCase()}
            </div>
            <span className="text-[12px] text-foreground font-medium">
                {currentUser?.id === task.assignedTo ? "Assigned to me" : (task.assignedToName || "Unassigned")}
            </span>
        </div>
        
        {task.createdByName && !isCreator && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">By:</span>
            <span className="text-[12px] text-muted-foreground italic font-medium">
              {task.createdByName}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}