import { Droppable } from "@hello-pangea/dnd";
import { Column, Task } from "../types";
import TaskCard from "./TaskCard";

interface BoardColumnProps {
  column: Column;
  canEdit: boolean;
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const columnAccents: Record<string, { border: string; bg: string; text: string; badge: string; icon: string }> = {
  "To Do": {
    border: "border-t-stone-400 dark:border-t-stone-500",
    bg: "bg-stone-50 dark:bg-stone-800/50",
    text: "text-stone-600 dark:text-stone-300",
    badge: "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300",
    icon: "text-stone-400",
  },
  Doing: {
    border: "border-t-amber-500 dark:border-t-amber-400",
    bg: "bg-amber-50/60 dark:bg-amber-900/10",
    text: "text-amber-700 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: "text-amber-400",
  },
  Done: {
    border: "border-t-emerald-500 dark:border-t-emerald-400",
    bg: "bg-emerald-50/60 dark:bg-emerald-900/10",
    text: "text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: "text-emerald-400",
  },
};

const defaultAccent = {
  border: "border-t-brand-500 dark:border-t-brand-400",
  bg: "bg-brand-50/60 dark:bg-brand-900/10",
  text: "text-brand-700 dark:text-brand-400",
  badge: "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400",
  icon: "text-brand-400",
};

export default function BoardColumn({
  column,
  canEdit,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: BoardColumnProps) {
  const accent = columnAccents[column.title] || defaultAccent;

  return (
    <div
      className={`flex flex-col bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 border-t-4 ${accent.border}
        w-full sm:w-80 shrink-0 max-h-[calc(100vh-10rem)] shadow-sm dark:shadow-stone-950/50`}
    >
      <div className={`flex items-center justify-between px-4 py-3.5 ${accent.bg} rounded-t-xl`}>
        <div className="flex items-center gap-2.5">
          <h3 className={`font-bold text-sm uppercase tracking-wider ${accent.text}`}>
            {column.title}
          </h3>
          <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${accent.badge}`}>
            {column.tasks.length}
          </span>
        </div>
        {canEdit && (
          <button
            onClick={() => onAddTask(column.id)}
            className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110
              ${accent.icon} hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-stone-800 hover:shadow-sm`}
            title="Add task"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        )}
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 px-3 pb-3 pt-1 overflow-y-auto scrollbar-thin min-h-[80px]
              transition-all duration-300 rounded-b-2xl
              ${snapshot.isDraggingOver
                ? "bg-brand-50/60 dark:bg-brand-900/10 ring-2 ring-inset ring-brand-200/50 dark:ring-brand-700/30"
                : ""
              }`}
          >
            {column.tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-8 text-stone-300 dark:text-stone-600">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-xs font-medium">No tasks yet</span>
              </div>
            )}
            {column.tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                canEdit={canEdit}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
