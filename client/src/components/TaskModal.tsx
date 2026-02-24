import { useState, useEffect, useRef } from "react";
import { Task, Priority } from "../types";

interface TaskModalProps {
  open: boolean;
  task: Partial<Task> | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    priority: Priority;
    dueDate: string | null;
    subtasks: string[];
  }) => void;
}

export default function TaskModal({
  open,
  task,
  onClose,
  onSave,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setPriority(task.priority || "MEDIUM");
      setDueDate(
        task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
      );
    } else {
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDueDate("");
    }
    setSubtasks([]);
    setSubtaskInput("");
  }, [task, open]);

  if (!open) return null;

  const isEditing = task?.id;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || null,
      subtasks,
    });
  }

  function addSubtask() {
    const val = subtaskInput.trim();
    if (!val) return;
    setSubtasks((prev) => [...prev, val]);
    setSubtaskInput("");
    subtaskInputRef.current?.focus();
  }

  function removeSubtask(index: number) {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubtaskKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubtask();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-stone-900 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {isEditing ? "Edit Task" : "New Task"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent
                placeholder:text-stone-400"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent
                placeholder:text-stone-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent
                  bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                  focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
              />
            </div>
          </div>

          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Subtasks
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  ref={subtaskInputRef}
                  type="text"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={handleSubtaskKeyDown}
                  placeholder="Add a subtask..."
                  className="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent
                    placeholder:text-stone-400"
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  className="px-3 py-2 text-sm font-medium text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30
                    border border-brand-200 dark:border-brand-800 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
                >
                  Add
                </button>
              </div>
              {subtasks.length > 0 && (
                <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                  {subtasks.map((st, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 rounded-lg text-sm text-stone-700 dark:text-stone-300"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600 shrink-0" />
                      <span className="flex-1 truncate">{st}</span>
                      <button
                        type="button"
                        onClick={() => removeSubtask(i)}
                        className="text-stone-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800
                rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600
                rounded-lg hover:bg-brand-700 transition-colors"
            >
              {isEditing ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
