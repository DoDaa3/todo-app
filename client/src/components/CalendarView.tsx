import { useState, useMemo } from "react";
import { Column, Task, Priority } from "../types";

interface CalendarViewProps {
  columns: Column[];
  onEditTask: (task: Task) => void;
}

const priorityDot: Record<Priority, string> = {
  LOW: "bg-stone-400",
  MEDIUM: "bg-brand-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarView({ columns, onEditTask }: CalendarViewProps) {
  const [viewDate, setViewDate] = useState(() => new Date());

  const allTasks = useMemo(() => {
    return columns.flatMap((col) =>
      col.tasks.filter((t) => t.dueDate).map((t) => ({ ...t, columnTitle: col.title }))
    );
  }, [columns]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof allTasks> = {};
    allTasks.forEach((task) => {
      if (!task.dueDate) return;
      const d = new Date(task.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [allTasks]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function prev() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function next() {
    setViewDate(new Date(year, month + 1, 1));
  }
  function goToday() {
    setViewDate(new Date());
  }

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={prev}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 min-w-[160px] text-center">
            {monthLabel}
          </h3>
          <button
            onClick={next}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={goToday}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-400 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-800">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400 py-1.5 sm:py-2">
            <span className="sm:hidden">{day.charAt(0)}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] bg-stone-50/50 dark:bg-stone-900/50 border-b border-r border-stone-100 dark:border-stone-800/50" />;
          }
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === todayStr;
          const dayTasks = tasksByDate[dateStr] || [];

          return (
            <div
              key={dateStr}
              className={`min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] border-b border-r border-stone-100 dark:border-stone-800/50 p-1 sm:p-1.5 ${
                isToday ? "bg-brand-50/50 dark:bg-brand-900/10" : "hover:bg-stone-50 dark:hover:bg-stone-800/20"
              } transition-colors`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1 ${
                  isToday
                    ? "bg-brand-600 text-white"
                    : "text-stone-700 dark:text-stone-300"
                }`}
              >
                {day}
              </span>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 2).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className="w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate flex items-center gap-1
                      bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[task.priority]}`} />
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
                {dayTasks.length > 2 && (
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 px-1.5">
                    +{dayTasks.length - 2} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
