import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Task } from "./TaskCard";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: Task | null;
}

export function UpdateTaskModal({ open, onClose, onSuccess, task }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    if (open && task) {
      setTitle(task.title);
      setDescription(task.description);
      setAssigneeId(task.assignedTo);
    }
  }, [open, task]);

  useEffect(() => {
    if (open && user) {
      const fetchUsers = async () => {
        setIsFetchingUsers(true);
        try {
          const res = await api.get("/auth/users");
          setUsers(res.data);
        } catch (error) {
          console.error("Failed to fetch users", error);
        } finally {
          setIsFetchingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim() || !assigneeId) return;
    
    setIsLoading(true);
    const selectedAssignee = users.find(u => u.id === assigneeId);

    try {
      await api.patch(`/tasks/${task._id}`, {
        title,
        description,
        assignedTo: assigneeId,
        assignedToName: selectedAssignee?.name,
      });
      toast.success("Task updated successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
       console.error("Failed to update task", error);
       toast.error(error.response?.data?.error || "Failed to update task");
    } finally {
      setIsLoading(false);
    }
  };

  if (!task) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-foreground/20"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-card border border-border rounded-lg shadow-lg p-6 z-10"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-foreground">Update Task</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-colors"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description"
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-colors resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Assign To</label>
                {isFetchingUsers ? (
                    <div className="text-sm text-muted-foreground flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading users...
                    </div>
                ): (
                   <select
                     value={assigneeId}
                     onChange={(e) => setAssigneeId(e.target.value)}
                     className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-colors"
                   >
                     {users.map((u) => (
                       <option key={u.id} value={u.id}>{u.name}</option>
                     ))}
                   </select>
                )}
                
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-md hover:bg-accent transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isFetchingUsers}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md shadow-[var(--shadow-sm)] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Update Task"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
