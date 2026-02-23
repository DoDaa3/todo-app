import { Droppable } from "@hello-pangea/dnd";
import { Column, Task } from "../types";
import TaskCard from "./TaskCard";

interface BoardColumnProps {
  column: Column;
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const columnAccents: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  "To Do": {
    border: "border-t-slate-400",
    bg: "bg-slate-50",
    text: "text-slate-700",
    badge: "bg-slate-200 text-slate-600",
  },
  Doing: {
    border: "border-t-blue-500",
    bg: "bg-blue-50/50",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-600",
  },
  Done: {
    border: "border-t-emerald-500",
    bg: "bg-emerald-50/50",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-600",
  },
};

const defaultAccent = {
  border: "border-t-purple-500",
  bg: "bg-purple-50/50",
  text: "text-purple-700",
  badge: "bg-purple-100 text-purple-600",
};

export default function BoardColumn({
  column,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: BoardColumnProps) {
  const accent = columnAccents[column.title] || defaultAccent;

  return (
    <div
      className={`flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 border-t-4 ${accent.border}
        w-full sm:w-80 shrink-0 max-h-[calc(100vh-10rem)] shadow-sm`}
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
        <button
          onClick={() => onAddTask(column.id)}
          className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110
            text-gray-400 hover:text-brand-600 hover:bg-white hover:shadow-sm"
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
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 px-3 pb-3 pt-1 overflow-y-auto scrollbar-thin min-h-[80px]
              transition-all duration-300 rounded-b-2xl
              ${snapshot.isDraggingOver
                ? "bg-brand-50/60 ring-2 ring-inset ring-brand-200/50"
                : ""
              }`}
          >
            {column.tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-300">
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
