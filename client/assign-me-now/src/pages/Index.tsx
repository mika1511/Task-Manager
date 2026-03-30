import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TaskTabs, type TabValue, statusMap, tabs } from "@/components/dashboard/TaskTabs";
import { TaskCard, type Task } from "@/components/dashboard/TaskCard";
import { CreateTaskModal } from "@/components/dashboard/CreateTaskModal";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { UpdateTaskModal } from "@/components/dashboard/UpdateTaskModal";

const Index = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<TabValue>("All");
  const [viewMode, setViewMode] = useState<"assignedTo" | "createdBy">("assignedTo");
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [counts, setCounts] = useState<Record<TabValue, number>>({
    "All": 0, "Pending": 0, "In Progress": 0, "Done": 0
  });
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusParam = statusMap[activeTab];
      
      // 1. Fetch filtered tasks for current tab and viewMode
      let tasksUrl = `/tasks?filter=${viewMode}`;
      if (statusParam) tasksUrl += `&status=${statusParam}`;
      const res = await api.get(tasksUrl);
      setTasks(res.data.tasks || []);

      // 2. Fetch counts for all status tabs within current viewMode
      const countRequests = tabs.map(tab => {
        const s = statusMap[tab];
        const url = s 
          ? `/tasks?filter=${viewMode}&status=${s}&limit=1` 
          : `/tasks?filter=${viewMode}&limit=1`;
        return api.get(url);
      });

      const countResponses = await Promise.all(countRequests);
      const newCounts: any = {};
      tabs.forEach((tab, i) => {
        newCounts[tab] = countResponses[i].data.total || 0;
      });
      setCounts(newCounts);

    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to fetch tasks");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, viewMode, user?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const socket = io(import.meta.env.VITE_NOTIFICATION_URL || "http://localhost:6001", {
      path: "/socket.io",
      auth: { token }
    });

    socket.on("connect", () => {
      console.log("Connected to notification service");
      socket.emit("join", user.id); // JOIN THE USER ROOM
    });

    socket.on("notification", (data: any) => {
      console.log("New notification:", data);
      toast.custom(() => (
        <div className="flex items-center gap-3 bg-card border border-border p-4 rounded-lg shadow-lg">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <p className="text-sm font-medium text-foreground">{data.message || "New notification"}</p>
        </div>
      ));
      fetchTasks();
    });

    return () => {
      socket.disconnect();
    };
  }, [user, fetchTasks]);

  const handleHomeClick = () => {
    setViewMode("assignedTo");
    setActiveTab("All");
    setSidebarOpen(false);
  };

  const handleAiCreate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await api.post("/tasks/smart", { prompt: aiPrompt });
      toast.success(`AI Created: ${res.data.title}`);
      setAiPrompt(""); // Clear input field
      fetchTasks();    // Refresh the task list
    } catch (e: any) {
      toast.error(e.response?.data?.error || "AI failed to parse task");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        activeView={viewMode}
        onViewChange={(view) => {
          setViewMode(view);
          setActiveTab("All"); // Reset status when changing view
        }}
        onHomeClick={handleHomeClick}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          onCreateTask={() => setModalOpen(true)} 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto py-8 px-8">
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-foreground">
                {viewMode === "assignedTo" ? "Tasks Assigned to You" : "Tasks Created by You"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Track, assign, and complete tasks with real-time team synchronization.
              </p>
            </div>
            
            {/* ✨ AI Smart Task Bar */}
            <div className="flex gap-2 p-1.5 bg-secondary/30 rounded-xl mb-8 items-center border border-border shadow-sm group focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <div className="pl-3 text-primary">
                    {isAiLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="h-5 w-5 flex items-center justify-center text-lg">✨</div>
                    )}
                </div>
                <input 
                    className="flex-1 bg-transparent border-none outline-none p-2 text-sm placeholder:text-muted-foreground"
                    placeholder="Type: Remind me to update inventory by Monday..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    disabled={isAiLoading}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiCreate()}
                />
                <button 
                    onClick={handleAiCreate}
                    disabled={isAiLoading || !aiPrompt.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
                >
                    {isAiLoading ? "Thinking..." : "AI Add"}
                </button>
            </div>

            <TaskTabs
              active={activeTab}
              onChange={setActiveTab}
              counts={counts}
            />
            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                   <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : tasks.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col gap-3">
                {tasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    canChangeStatus={viewMode === "assignedTo"}
                    onTaskUpdated={fetchTasks}
                    onEdit={(task) => {
                      setTaskToEdit(task);
                      setEditModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <CreateTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchTasks}
      />
      {taskToEdit && (
        <UpdateTaskModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setTaskToEdit(null);
          }}
          task={taskToEdit}
          onSuccess={() => {
            setTaskToEdit(null);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
};

export default Index;
