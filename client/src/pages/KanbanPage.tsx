import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import api from "../lib/api";
import { connectSocket } from "../lib/socket";
import { Board, Task, Column, Priority } from "../types";
import Navbar from "../components/Navbar";
import BoardColumn from "../components/BoardColumn";
import TaskModal from "../components/TaskModal";
import TaskDetailModal from "../components/TaskDetailModal";
import FilterBar from "../components/FilterBar";
import ConfirmModal from "../components/ConfirmModal";
import SearchModal from "../components/SearchModal";
import ViewSwitcher, { ViewMode } from "../components/ViewSwitcher";
import ListView from "../components/ListView";
import CalendarView from "../components/CalendarView";
import TimelineView from "../components/TimelineView";
import ShareBoardModal from "../components/ShareBoardModal";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";

type DueDateFilter = "ALL" | "OVERDUE" | "TODAY" | "THIS_WEEK" | "NO_DATE";

function filterTasks(
  tasks: Task[],
  priorityFilter: Priority | "ALL",
  dueDateFilter: DueDateFilter
): Task[] {
  return tasks.filter((task) => {
    if (priorityFilter !== "ALL" && task.priority !== priorityFilter)
      return false;

    if (dueDateFilter !== "ALL") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (dueDateFilter) {
        case "OVERDUE":
          if (!task.dueDate || new Date(task.dueDate) >= today) return false;
          break;
        case "TODAY":
          if (!task.dueDate) return false;
          {
            const d = new Date(task.dueDate);
            const taskDay = new Date(
              d.getFullYear(),
              d.getMonth(),
              d.getDate()
            );
            if (taskDay.getTime() !== today.getTime()) return false;
          }
          break;
        case "THIS_WEEK": {
          if (!task.dueDate) return false;
          const endOfWeek = new Date(today);
          endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
          const d = new Date(task.dueDate);
          if (d < today || d > endOfWeek) return false;
          break;
        }
        case "NO_DATE":
          if (task.dueDate) return false;
          break;
      }
    }

    return true;
  });
}

export default function KanbanPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  // Task detail modal
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    taskId: string | null;
  }>({ open: false, taskId: null });

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<Priority | "ALL">(
    "ALL"
  );
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("ALL");

  // Search
  const [searchOpen, setSearchOpen] = useState(false);

  // Share modal
  const [shareOpen, setShareOpen] = useState(false);

  // Global Cmd+K handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api.get(`/boards/${boardId}`);
      setBoard(res.data);
    } catch {
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [boardId, navigate]);

  // Fetch board data
  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Socket.io real-time
  useEffect(() => {
    if (!boardId) return;

    const socket = connectSocket();
    socket.emit("join-board", boardId);

    socket.on("board:updated", (updatedBoard: Board) => {
      setBoard((prev) => ({
        ...updatedBoard,
        userRole: updatedBoard.userRole ?? prev?.userRole,
      }));
    });

    socket.on("task:created", (task: Task) => {
      setBoard((prev) => {
        if (!prev) return prev;
        // Skip if task already exists (from optimistic update)
        const exists = prev.columns.some((col) =>
          col.tasks.some((t) => t.id === task.id)
        );
        if (exists) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === task.columnId
              ? { ...col, tasks: [...col.tasks, task] }
              : col
          ),
        };
      });
    });

    socket.on("task:updated", (task: Task) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            tasks: col.tasks.map((t) => (t.id === task.id ? task : t)),
          })),
        };
      });
    });

    socket.on(
      "task:deleted",
      (data: { id: string; columnId: string }) => {
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map((col) =>
              col.id === data.columnId
                ? { ...col, tasks: col.tasks.filter((t) => t.id !== data.id) }
                : col
            ),
          };
        });
      }
    );

    socket.on("column:created", (column: Column) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return { ...prev, columns: [...prev.columns, column] };
      });
    });

    socket.on("column:deleted", (data: { id: string }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.filter((c) => c.id !== data.id),
        };
      });
    });

    // If access is revoked (kicked from board), redirect to boards list
    socket.on("board:access-revoked", (data: { boardId: string }) => {
      if (data.boardId === boardId) {
        showToast("You have been removed from this board", "error");
        navigate("/");
      }
    });

    return () => {
      socket.emit("leave-board", boardId);
      socket.off("board:updated");
      socket.off("task:created");
      socket.off("task:updated");
      socket.off("task:deleted");
      socket.off("column:created");
      socket.off("column:deleted");
      socket.off("board:access-revoked");
    };
  }, [boardId, navigate, showToast]);

  // Filtered columns with filtered tasks
  const filteredColumns = useMemo(() => {
    if (!board) return [];
    return board.columns.map((col) => ({
      ...col,
      tasks: filterTasks(col.tasks, priorityFilter, dueDateFilter),
    }));
  }, [board, priorityFilter, dueDateFilter]);

  // Drag and drop handler
  async function handleDragEnd(result: DropResult) {
    const { draggableId, source, destination } = result;
    if (!destination || !board) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    // Optimistic update
    setBoard((prev) => {
      if (!prev) return prev;
      const newColumns = prev.columns.map((col) => ({
        ...col,
        tasks: [...col.tasks],
      }));

      const sourceCol = newColumns.find((c) => c.id === source.droppableId)!;
      const destCol = newColumns.find(
        (c) => c.id === destination.droppableId
      )!;

      const [movedTask] = sourceCol.tasks.splice(source.index, 1);
      movedTask.columnId = destination.droppableId;
      destCol.tasks.splice(destination.index, 0, movedTask);

      // Update positions
      sourceCol.tasks.forEach((t, i) => (t.position = i));
      destCol.tasks.forEach((t, i) => (t.position = i));

      return { ...prev, columns: newColumns };
    });

    try {
      await api.patch(`/tasks/${draggableId}/move`, {
        columnId: destination.droppableId,
        position: destination.index,
      });
    } catch {
      showToast("Failed to move task", "error");
      fetchBoard();
    }
  }

  function handleAddTask(columnId: string) {
    setActiveColumnId(columnId);
    setEditingTask(null);
    setModalOpen(true);
  }

  function handleEditTask(task: Task) {
    setDetailTask(task);
    setDetailOpen(true);
  }

  function handleQuickEditTask(task: Task) {
    setActiveColumnId(task.columnId);
    setEditingTask(task);
    setModalOpen(true);
  }

  function handleDeleteTask(taskId: string) {
    setDeleteConfirm({ open: true, taskId });
  }

  async function confirmDeleteTask() {
    if (!deleteConfirm.taskId) return;
    const taskId = deleteConfirm.taskId;
    try {
      await api.delete(`/tasks/${taskId}`);
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            tasks: col.tasks.filter((t) => t.id !== taskId),
          })),
        };
      });
      showToast("Task deleted", "success");
    } catch {
      showToast("Failed to delete task", "error");
    }
    setDeleteConfirm({ open: false, taskId: null });
  }

  async function handleSaveTask(data: {
    title: string;
    description: string;
    priority: Priority;
    dueDate: string | null;
    subtasks: string[];
  }) {
    try {
      if (editingTask?.id) {
        const res = await api.patch(`/tasks/${editingTask.id}`, data);
        const updated: Task = res.data;
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map((col) => ({
              ...col,
              tasks: col.tasks.map((t) => (t.id === updated.id ? updated : t)),
            })),
          };
        });
        showToast("Task updated", "success");
      } else {
        const res = await api.post("/tasks", {
          title: data.title,
          description: data.description,
          priority: data.priority,
          dueDate: data.dueDate,
          columnId: activeColumnId,
        });
        const newTask = res.data;
        // Optimistically add task to board state (works even when Socket.io is unavailable)
        setBoard((prev) => {
          if (!prev) return prev;
          const exists = prev.columns.some((col) =>
            col.tasks.some((t) => t.id === newTask.id)
          );
          if (exists) return prev;
          return {
            ...prev,
            columns: prev.columns.map((col) =>
              col.id === activeColumnId
                ? { ...col, tasks: [...col.tasks, newTask] }
                : col
            ),
          };
        });
        // Create subtasks sequentially after task is created
        if (data.subtasks.length > 0) {
          for (const subtaskTitle of data.subtasks) {
            await api.post("/subtasks", { title: subtaskTitle, taskId: newTask.id });
          }
        }
        showToast("Task created", "success");
      }
      setModalOpen(false);
    } catch {
      showToast("Failed to save task", "error");
    }
  }

  function handleTaskUpdated(updatedTask: Task) {
    setBoard((prev) => {
      if (!prev) return prev;
      // Check if the task moved to a different column (status change)
      const oldCol = prev.columns.find((col) => col.tasks.some((t) => t.id === updatedTask.id));
      if (oldCol && oldCol.id !== updatedTask.columnId) {
        // Task moved columns: remove from old, add to new
        return {
          ...prev,
          columns: prev.columns.map((col) => {
            if (col.id === oldCol.id) {
              return { ...col, tasks: col.tasks.filter((t) => t.id !== updatedTask.id) };
            }
            if (col.id === updatedTask.columnId) {
              return { ...col, tasks: [updatedTask, ...col.tasks] };
            }
            return col;
          }),
        };
      }
      // Same column: just update in place
      return {
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
        })),
      };
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        <Navbar onSearchOpen={() => setSearchOpen(true)} />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-200 dark:border-brand-800 border-t-brand-600 dark:border-t-brand-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!board) return null;

  const canEdit = board.userRole === "OWNER" || board.userRole === "ADMIN" || board.userRole === "EDITOR";

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-950 dark:to-stone-900 flex flex-col">
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-b border-stone-200/60 dark:border-stone-800/60 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm">
        <div className="max-w-full mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => navigate("/")}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white truncate max-w-[150px] sm:max-w-none">{board.title}</h1>
            <ViewSwitcher active={viewMode} onChange={setViewMode} />
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm font-medium text-brand-700 dark:text-brand-300
                bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800
                rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {canEdit ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
              </svg>
              <span className="hidden sm:inline">{canEdit ? "Share" : "People"}</span>
            </button>
          </div>
          <FilterBar
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            dueDateFilter={dueDateFilter}
            onDueDateChange={setDueDateFilter}
          />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-3 sm:p-4 lg:p-6">
        {viewMode === "kanban" && (
          <DragDropContext onDragEnd={canEdit ? handleDragEnd : () => {}}>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 min-h-0 sm:items-start">
              {filteredColumns.map((column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  canEdit={canEdit}
                  onAddTask={handleAddTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                />
              ))}
            </div>
          </DragDropContext>
        )}

        {viewMode === "list" && (
          <ListView
            columns={filteredColumns}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
          />
        )}

        {viewMode === "calendar" && (
          <CalendarView
            columns={filteredColumns}
            onEditTask={handleEditTask}
          />
        )}

        {viewMode === "timeline" && (
          <TimelineView
            columns={filteredColumns}
            onEditTask={handleEditTask}
          />
        )}
      </div>

      <TaskModal
        open={modalOpen}
        task={editingTask}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTask}
      />

      <TaskDetailModal
        open={detailOpen}
        task={detailTask}
        canEdit={canEdit}
        columns={board.columns}
        onClose={() => setDetailOpen(false)}
        onTaskUpdated={handleTaskUpdated}
      />

      <ConfirmModal
        open={deleteConfirm.open}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteConfirm({ open: false, taskId: null })}
      />

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      <ShareBoardModal
        open={shareOpen}
        boardId={boardId!}
        currentUserId={user?.id}
        userRole={board.userRole}
        onClose={() => setShareOpen(false)}
        onLeave={() => navigate("/")}
      />
    </div>
  );
}
