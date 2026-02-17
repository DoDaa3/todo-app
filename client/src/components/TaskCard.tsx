import { Draggable } from "@hello-pangea/dnd";
import { Task, Priority } from "../types";

interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const priorityConfig: Record<
  Priority,
  { label: string; bg: string; text: string }
> = {
  LOW: { label: "Low", bg: "bg-gray-100", text: "text-gray-600" },
  MEDIUM: { label: "Medium", bg: "bg-blue-100", text: "text-blue-700" },
  HIGH: { label: "High", bg: "bg-orange-100", text: "text-orange-700" },
  URGENT: { label: "Urgent", bg: "bg-red-100", text: "text-red-700" },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export default function TaskCard({
  task,
  index,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const p = priorityConfig[task.priority];
  const overdue = isOverdue(task.dueDate);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg border p-3 mb-2 cursor-grab active:cursor-grabbing
            transition-shadow duration-200
            ${
              snapshot.isDragging
                ? "shadow-lg border-brand-300 ring-2 ring-brand-100"
                : "border-gray-200 hover:border-gray-300 shadow-sm hover:shadow"
            }`}
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-gray-900 flex-1 leading-snug">
              {task.title}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                className="p-1 text-gray-400 hover:text-brand-600 rounded transition-colors"
                title="Edit task"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                title="Delete task"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${p.bg} ${p.text}`}
            >
              {p.label}
            </span>
            {task.dueDate && (
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 ${
                  overdue
                    ? "bg-red-50 text-red-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {formatDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
