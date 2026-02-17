import { Droppable } from "@hello-pangea/dnd";
import { Column, Task } from "../types";
import TaskCard from "./TaskCard";

interface BoardColumnProps {
  column: Column;
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const columnColors: Record<string, string> = {
  "To Do": "bg-gray-400",
  Doing: "bg-blue-500",
  Done: "bg-green-500",
};

export default function BoardColumn({
  column,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: BoardColumnProps) {
  const dotColor = columnColors[column.title] || "bg-purple-500";

  return (
    <div className="flex flex-col bg-gray-50 rounded-xl w-80 shrink-0 max-h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
            {column.title}
          </h3>
          <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
            {column.tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
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
            className={`flex-1 px-3 pb-3 overflow-y-auto scrollbar-thin min-h-[80px]
              transition-colors duration-200 rounded-b-xl
              ${snapshot.isDraggingOver ? "bg-brand-50/50" : ""}`}
          >
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
