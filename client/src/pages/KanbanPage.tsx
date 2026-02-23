import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import api from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { Board, Task, Column, Priority } from "../types";
import Navbar from "../components/Navbar";
import BoardColumn from "../components/BoardColumn";
import TaskModal from "../components/TaskModal";
import FilterBar from "../components/FilterBar";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";

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
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

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
      setBoard(updatedBoard);
    });

    socket.on("task:created", (task: Task) => {
      setBoard((prev) => {
        if (!prev) return prev;
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

    return () => {
      socket.emit("leave-board", boardId);
      socket.off("board:updated");
      socket.off("task:created");
      socket.off("task:updated");
      socket.off("task:deleted");
      socket.off("column:created");
      socket.off("column:deleted");
      disconnectSocket();
    };
  }, [boardId]);

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
    } catch (err) {
      showToast("Failed to delete task", "error");
    }
    setDeleteConfirm({ open: false, taskId: null });
  }

  async function handleSaveTask(data: {
    title: string;
    description: string;
    priority: Priority;
    dueDate: string | null;
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
          ...data,
          columnId: activeColumnId,
        });
        const newTask: Task = res.data;
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map((col) =>
              col.id === newTask.columnId
                ? { ...col, tasks: [...col.tasks, newTask] }
                : col
            ),
          };
        });
        showToast("Task created", "success");
      }
      setModalOpen(false);
    } catch (err) {
      showToast("Failed to save task", "error");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!board) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <Navbar />
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-full mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
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
            <h1 className="text-xl font-bold text-gray-900">{board.title}</h1>
          </div>
          <FilterBar
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            dueDateFilter={dueDateFilter}
            onDueDateChange={setDueDateFilter}
          />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 min-h-0">
            {filteredColumns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      <TaskModal
        open={modalOpen}
        task={editingTask}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTask}
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
    </div>
  );
}
