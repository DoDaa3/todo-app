import { Priority } from "../types";

interface FilterBarProps {
  priorityFilter: Priority | "ALL";
  onPriorityChange: (p: Priority | "ALL") => void;
  dueDateFilter: "ALL" | "OVERDUE" | "TODAY" | "THIS_WEEK" | "NO_DATE";
  onDueDateChange: (
    f: "ALL" | "OVERDUE" | "TODAY" | "THIS_WEEK" | "NO_DATE"
  ) => void;
}

export default function FilterBar({
  priorityFilter,
  onPriorityChange,
  dueDateFilter,
  onDueDateChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Priority:
        </span>
        <select
          value={priorityFilter}
          onChange={(e) => onPriorityChange(e.target.value as Priority | "ALL")}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          <option value="ALL">All</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Due:
        </span>
        <select
          value={dueDateFilter}
          onChange={(e) =>
            onDueDateChange(
              e.target.value as
                | "ALL"
                | "OVERDUE"
                | "TODAY"
                | "THIS_WEEK"
                | "NO_DATE"
            )
          }
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          <option value="ALL">All dates</option>
          <option value="OVERDUE">Overdue</option>
          <option value="TODAY">Due today</option>
          <option value="THIS_WEEK">This week</option>
          <option value="NO_DATE">No date</option>
        </select>
      </div>
      {(priorityFilter !== "ALL" || dueDateFilter !== "ALL") && (
        <button
          onClick={() => {
            onPriorityChange("ALL");
            onDueDateChange("ALL");
          }}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
