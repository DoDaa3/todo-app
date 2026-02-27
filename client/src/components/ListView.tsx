import { useState } from "react";
import { Column, Task, Priority } from "../types";
import { formatDate, isOverdue } from "../lib/date";

interface ListViewProps {
  columns: Column[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (columnId: string) => void;
}

const priorityOrder: Record<Priority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const priorityStyle: Record<Priority, string> = {
  LOW: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  MEDIUM: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
  HIGH: "bg-orange-50 text-orange-700 dark:bg-amber-900/30 dark:text-orange-300",
  URGENT: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

type SortKey = "title" | "priority" | "dueDate" | "status";
type SortDir = "asc" | "desc";

export default function ListView({
  columns,
  onEditTask,
  onDeleteTask,
  onAddTask,
}: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const allTasks: (Task & { columnTitle: string })[] = columns.flatMap((col) =>
    col.tasks.map((t) => ({ ...t, columnTitle: col.title }))
  );

  const sorted = [...allTasks].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "title":
        return a.title.localeCompare(b.title) * dir;
      case "priority":
        return (priorityOrder[a.priority] - priorityOrder[b.priority]) * dir;
      case "dueDate": {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dir;
      }
      case "status":
        return a.columnTitle.localeCompare(b.columnTitle) * dir;
      default:
        return 0;
    }
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-stone-300 dark:text-stone-600 ml-1">&uarr;&darr;</span>;
    return <span className="text-brand-600 ml-1">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>;
  }

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80">
              <th
                className="text-left px-4 py-3 font-semibold text-stone-600 dark:text-stone-300 cursor-pointer select-none hover:bg-stone-100 dark:hover:bg-stone-800/50"
                onClick={() => toggleSort("title")}
              >
                Task <SortIcon col="title" />
              </th>
              <th
                className="hidden sm:table-cell text-left px-4 py-3 font-semibold text-stone-600 dark:text-stone-300 cursor-pointer select-none hover:bg-stone-100 dark:hover:bg-stone-800/50 w-28"
                onClick={() => toggleSort("status")}
              >
                Status <SortIcon col="status" />
              </th>
              <th
                className="text-left px-3 sm:px-4 py-3 font-semibold text-stone-600 dark:text-stone-300 cursor-pointer select-none hover:bg-stone-100 dark:hover:bg-stone-800/50 w-24 sm:w-28"
                onClick={() => toggleSort("priority")}
              >
                Priority <SortIcon col="priority" />
              </th>
              <th
                className="hidden md:table-cell text-left px-4 py-3 font-semibold text-stone-600 dark:text-stone-300 cursor-pointer select-none hover:bg-stone-100 dark:hover:bg-stone-800/50 w-36"
                onClick={() => toggleSort("dueDate")}
              >
                Due Date <SortIcon col="dueDate" />
              </th>
              <th className="w-16 sm:w-20 px-2 sm:px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-stone-400 dark:text-stone-500">
                  <p>No tasks to display</p>
                  {columns.length > 0 && (
                    <button
                      onClick={() => onAddTask(columns[0].id)}
                      className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      + Add a task
                    </button>
                  )}
                </td>
              </tr>
            )}
            {sorted.map((task) => (
              <tr
                key={task.id}
                className="border-b border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors cursor-pointer"
                onClick={() => onEditTask(task)}
              >
                <td className="px-3 sm:px-4 py-3">
                  <div className="font-medium text-stone-900 dark:text-stone-100 text-sm">{task.title}</div>
                  {task.description && (
                    <div className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 line-clamp-1">{task.description}</div>
                  )}
                  {/* Show status inline on mobile since column is hidden */}
                  <span className="sm:hidden inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 mt-1">
                    {task.columnTitle}
                  </span>
                </td>
                <td className="hidden sm:table-cell px-4 py-3">
                  <span className="inline-block text-xs font-medium px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                    {task.columnTitle}
                  </span>
                </td>
                <td className="px-3 sm:px-4 py-3">
                  <span className={`inline-block text-xs font-bold uppercase px-2 py-1 rounded-md ${priorityStyle[task.priority]}`}>
                    {task.priority}
                  </span>
                </td>
                <td className="hidden md:table-cell px-4 py-3">
                  <span className={`text-xs ${isOverdue(task.dueDate) ? "text-red-500 font-semibold" : "text-stone-500 dark:text-stone-400"}`}>
                    {formatDate(task.dueDate)}
                  </span>
                </td>
                <td className="px-2 sm:px-4 py-3">
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                      className="p-1.5 text-stone-400 hover:text-brand-600 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                      className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
