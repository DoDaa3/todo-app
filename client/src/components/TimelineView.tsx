import { useMemo } from "react";
import { Column, Task, Priority } from "../types";

interface TimelineViewProps {
  columns: Column[];
  onEditTask: (task: Task) => void;
}

const priorityColor: Record<Priority, { bg: string; border: string; text: string }> = {
  LOW: { bg: "bg-gray-200 dark:bg-gray-600", border: "border-gray-300 dark:border-gray-500", text: "text-gray-700 dark:text-gray-200" },
  MEDIUM: { bg: "bg-blue-200 dark:bg-blue-800", border: "border-blue-300 dark:border-blue-600", text: "text-blue-800 dark:text-blue-200" },
  HIGH: { bg: "bg-orange-200 dark:bg-orange-800", border: "border-orange-300 dark:border-orange-600", text: "text-orange-800 dark:text-orange-200" },
  URGENT: { bg: "bg-red-200 dark:bg-red-800", border: "border-red-300 dark:border-red-600", text: "text-red-800 dark:text-red-200" },
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TimelineView({ columns, onEditTask }: TimelineViewProps) {
  const tasksWithDates = useMemo(() => {
    const tasks: (Task & { columnTitle: string; start: Date; end: Date })[] = [];
    columns.forEach((col) => {
      col.tasks.forEach((t) => {
        if (!t.dueDate && !t.startDate) return;
        const start = t.startDate ? new Date(t.startDate) : t.dueDate ? addDays(new Date(t.dueDate), -3) : new Date();
        const end = t.dueDate ? new Date(t.dueDate) : addDays(start, 3);
        tasks.push({ ...t, columnTitle: col.title, start, end: end < start ? start : end });
      });
    });
    return tasks.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [columns]);

  if (tasksWithDates.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
        <p className="text-gray-400 dark:text-gray-500 text-sm">No tasks with dates to display on the timeline.</p>
        <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Add start dates or due dates to your tasks to see them here.</p>
      </div>
    );
  }

  // Calculate timeline range: start 2 days before earliest, end 2 days after latest
  const timelineStart = addDays(tasksWithDates[0].start, -2);
  const latestEnd = tasksWithDates.reduce((max, t) => (t.end > max ? t.end : max), tasksWithDates[0].end);
  const timelineEnd = addDays(latestEnd, 2);
  const totalDays = Math.max(daysBetween(timelineStart, timelineEnd), 7);

  // Generate week markers
  const weekMarkers: { date: Date; offset: number }[] = [];
  const cursor = new Date(timelineStart);
  cursor.setDate(cursor.getDate() - cursor.getDay()); // Align to Sunday
  while (cursor <= timelineEnd) {
    const offset = daysBetween(timelineStart, cursor);
    if (offset >= 0) {
      weekMarkers.push({ date: new Date(cursor), offset });
    }
    cursor.setDate(cursor.getDate() + 7);
  }

  const today = new Date();
  const todayOffset = daysBetween(timelineStart, today);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header with date markers */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 relative h-8">
            <div className="w-52 shrink-0 px-4 flex items-center">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Task</span>
            </div>
            <div className="flex-1 relative">
              {weekMarkers.map((marker, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex items-center text-[10px] text-gray-400 dark:text-gray-500 font-medium border-l border-gray-200 dark:border-gray-700 pl-1"
                  style={{ left: `${(marker.offset / totalDays) * 100}%` }}
                >
                  {formatShortDate(marker.date)}
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          {tasksWithDates.map((task) => {
            const startOffset = Math.max(daysBetween(timelineStart, task.start), 0);
            const duration = Math.max(daysBetween(task.start, task.end), 1);
            const leftPct = (startOffset / totalDays) * 100;
            const widthPct = (duration / totalDays) * 100;
            const colors = priorityColor[task.priority];

            return (
              <div
                key={task.id}
                className="flex items-center border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors h-10"
              >
                <div className="w-52 shrink-0 px-4">
                  <button
                    onClick={() => onEditTask(task)}
                    className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate block max-w-full text-left hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {task.title}
                  </button>
                </div>
                <div className="flex-1 relative px-1">
                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset <= totalDays && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                      style={{ left: `${(todayOffset / totalDays) * 100}%` }}
                    />
                  )}
                  <button
                    onClick={() => onEditTask(task)}
                    className={`absolute top-1 bottom-1 rounded-md border ${colors.bg} ${colors.border} ${colors.text}
                      text-[10px] font-medium px-1.5 truncate flex items-center hover:opacity-80 transition-opacity`}
                    style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
                    title={`${task.title} (${formatShortDate(task.start)} - ${formatShortDate(task.end)})`}
                  >
                    <span className="truncate">{task.title}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
