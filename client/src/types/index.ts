export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type WorkspaceRole = "ADMIN" | "MEMBER" | "VIEWER";
export type SprintStatus = "PLANNING" | "ACTIVE" | "COMPLETED";
export type NotificationType =
  | "TASK_ASSIGNED"
  | "COMMENT_ADDED"
  | "MENTIONED"
  | "SPRINT_STARTING"
  | "DUE_DATE_APPROACHING"
  | "STATUS_CHANGED"
  | "BOARD_SHARED"
  | "ROLE_CHANGED"
  | "BOARD_REMOVED";

// ─── User ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  darkMode?: boolean;
}

// ─── Workspace ──────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: WorkspaceMember[];
  boards: BoardSummary[];
  createdAt: string;
  updatedAt: string;
  _count?: { members: number; boards: number };
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  user: User;
  createdAt: string;
}

// ─── Board ──────────────────────────────────────────────────────────

export type BoardRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export interface Board {
  id: string;
  title: string;
  userId: string;
  workspaceId?: string | null;
  columns: Column[];
  labels?: Label[];
  sprints?: Sprint[];
  userRole?: BoardRole;
  createdAt: string;
  updatedAt: string;
}

export interface BoardSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  workspaceId?: string | null;
  _count: { columns: number };
}

// ─── Column ─────────────────────────────────────────────────────────

export interface Column {
  id: string;
  title: string;
  position: number;
  wipLimit?: number | null;
  boardId: string;
  tasks: Task[];
}

// ─── Sprint ─────────────────────────────────────────────────────────

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  boardId: string;
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
  completedCount?: number;
  totalCount?: number;
}

// ─── Task ───────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  startDate: string | null;
  storyPoints: number | null;
  position: number;
  isBacklog: boolean;
  columnId: string;
  sprintId: string | null;
  subtasks?: Subtask[];
  comments?: Comment[];
  labels?: TaskLabel[];
  assignees?: TaskAssignee[];
  dependencies?: TaskDependency[];
  dependents?: TaskDependency[];
  activities?: ActivityLog[];
  createdAt: string;
  updatedAt: string;
}

// ─── Subtask ────────────────────────────────────────────────────────

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  taskId: string;
}

// ─── Comment ────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

// ─── Label ──────────────────────────────────────────────────────────

export interface Label {
  id: string;
  name: string;
  color: string;
  boardId: string;
}

export interface TaskLabel {
  id: string;
  taskId: string;
  labelId: string;
  label?: Label;
}

// ─── Task Dependencies ──────────────────────────────────────────────

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnId: string;
  dependsOn?: Task;
  task?: Task;
}

// ─── Task Assignees ─────────────────────────────────────────────────

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  user?: User;
}

// ─── Notification ───────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  read: boolean;
  userId: string;
  relatedTaskId?: string | null;
  relatedBoardId?: string | null;
  createdAt: string;
}

// ─── Activity Log ───────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  action: string;
  details?: string | null;
  taskId?: string | null;
  boardId?: string | null;
  userId: string;
  user?: User;
  createdAt: string;
}

// ─── Search Results ─────────────────────────────────────────────────

export interface SearchResultTask {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  column: {
    id: string;
    board: { id: string; title: string };
  };
  updatedAt: string;
}

export interface SearchResultComment {
  id: string;
  content: string;
  task: {
    id: string;
    title: string;
    column: {
      board: { id: string; title: string };
    };
  };
  user: { id: string; name: string };
  createdAt: string;
}

export interface SearchResults {
  tasks: SearchResultTask[];
  boards: BoardSummary[];
  comments: SearchResultComment[];
}
