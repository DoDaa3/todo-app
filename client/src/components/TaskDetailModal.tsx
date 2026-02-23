import { useState, useEffect, useCallback } from "react";
import { Task, Priority, Subtask, Comment } from "../types";
import api from "../lib/api";
import { useToast } from "./Toast";

interface TaskDetailModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
}

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: "LOW", label: "Low", color: "bg-stone-400" },
  { value: "MEDIUM", label: "Medium", color: "bg-brand-500" },
  { value: "HIGH", label: "High", color: "bg-orange-500" },
  { value: "URGENT", label: "Urgent", color: "bg-red-500" },
];

export default function TaskDetailModal({ open, task, onClose, onTaskUpdated }: TaskDetailModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"details" | "subtasks" | "comments">("details");

  // Details form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const loadSubtasks = useCallback(async (taskId: string) => {
    setLoadingSubtasks(true);
    try {
      const res = await api.get(`/subtasks/task/${taskId}`);
      setSubtasks(res.data);
    } catch {
      // Subtasks endpoint may not exist yet
      setSubtasks([]);
    } finally {
      setLoadingSubtasks(false);
    }
  }, []);

  const loadComments = useCallback(async (taskId: string) => {
    setLoadingComments(true);
    try {
      const res = await api.get(`/comments/task/${taskId}`);
      setComments(res.data);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    if (task && open) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setPriority(task.priority || "MEDIUM");
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
      loadSubtasks(task.id);
      loadComments(task.id);
      setActiveTab("details");
    }
  }, [task, open, loadSubtasks, loadComments]);

  if (!open || !task) return null;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.patch(`/tasks/${task!.id}`, {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || null,
      });
      onTaskUpdated(res.data);
      showToast("Task updated", "success");
    } catch {
      showToast("Failed to update task", "error");
    } finally {
      setSaving(false);
    }
  }

  async function addSubtask() {
    if (!newSubtask.trim()) return;
    try {
      const res = await api.post("/subtasks", { title: newSubtask.trim(), taskId: task!.id });
      setSubtasks((prev) => [...prev, res.data]);
      setNewSubtask("");
    } catch {
      showToast("Failed to add subtask", "error");
    }
  }

  async function toggleSubtask(subtask: Subtask) {
    try {
      const res = await api.patch(`/subtasks/${subtask.id}`, { completed: !subtask.completed });
      setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? res.data : s)));
    } catch {
      showToast("Failed to update subtask", "error");
    }
  }

  async function deleteSubtask(id: string) {
    try {
      await api.delete(`/subtasks/${id}`);
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
    } catch {
      showToast("Failed to delete subtask", "error");
    }
  }

  async function addComment() {
    if (!newComment.trim()) return;
    try {
      const res = await api.post("/comments", { content: newComment.trim(), taskId: task!.id });
      setComments((prev) => [res.data, ...prev]);
      setNewComment("");
    } catch {
      showToast("Failed to add comment", "error");
    }
  }

  async function deleteComment(id: string) {
    try {
      await api.delete(`/comments/${id}`);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      showToast("Failed to delete comment", "error");
    }
  }

  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  const tabs = [
    { key: "details" as const, label: "Details" },
    { key: "subtasks" as const, label: `Subtasks${subtasks.length ? ` (${completedSubtasks}/${subtasks.length})` : ""}` },
    { key: "comments" as const, label: `Comments${comments.length ? ` (${comments.length})` : ""}` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-stone-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Task Details</h2>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-100 dark:border-stone-800 px-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "details" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                      focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
                  >
                    {priorityOptions.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                      focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !title.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "subtasks" && (
            <div className="space-y-3">
              {/* Progress bar */}
              {subtasks.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
                    <span>Progress</span>
                    <span>{completedSubtasks}/{subtasks.length}</span>
                  </div>
                  <div className="h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-600 rounded-full transition-all duration-300"
                      style={{ width: `${subtaskProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Add subtask */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                  placeholder="Add a subtask..."
                  className="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent placeholder:text-stone-400"
                />
                <button
                  onClick={addSubtask}
                  disabled={!newSubtask.trim()}
                  className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700
                    disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Subtask list */}
              {loadingSubtasks ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                </div>
              ) : subtasks.length === 0 ? (
                <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-4">No subtasks yet</p>
              ) : (
                <div className="space-y-1">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/50 group"
                    >
                      <button
                        onClick={() => toggleSubtask(subtask)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          subtask.completed
                            ? "bg-brand-600 border-brand-600"
                            : "border-stone-300 dark:border-stone-700 hover:border-brand-400"
                        }`}
                      >
                        {subtask.completed && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className={`text-sm flex-1 ${subtask.completed ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-700 dark:text-stone-300"}`}>
                        {subtask.title}
                      </span>
                      <button
                        onClick={() => deleteSubtask(subtask.id)}
                        className="p-1 text-stone-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="space-y-3">
              {/* Add comment */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addComment()}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent placeholder:text-stone-400"
                />
                <button
                  onClick={addComment}
                  disabled={!newComment.trim()}
                  className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700
                    disabled:opacity-50 transition-colors"
                >
                  Send
                </button>
              </div>

              {/* Comments list */}
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-4">No comments yet</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-stone-50 dark:bg-stone-800/50 rounded-lg p-3 group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                          {comment.user?.name || "User"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-400 dark:text-stone-500">
                            {new Date(comment.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="p-0.5 text-stone-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-stone-600 dark:text-stone-300">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
