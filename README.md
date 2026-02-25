# FlowBoard — Collaborative Kanban Task Manager

A full-stack collaborative Kanban board application with real-time updates, drag-and-drop task management, board sharing, sprint planning, and JWT authentication.

## Tech Stack

- **Frontend:** React 18 (Vite), TypeScript, Tailwind CSS, Framer Motion, @hello-pangea/dnd
- **Backend:** Node.js, Express, TypeScript, Zod validation
- **Database:** PostgreSQL 16 with Prisma ORM
- **Cache:** Redis 7 (Socket.io adapter)
- **Real-time:** Socket.io
- **Auth:** JWT-based signup/login with email verification
- **Email:** Resend / Nodemailer (transactional email)

## Features

- **Kanban board** with default columns: To Do, In Progress, In Review, Done
- **Drag and drop** tasks between columns with smooth animations
- **Create, edit, and delete** tasks with title, description, priority, due date, start date, and story points
- **Subtasks** — checklists within each task with completion tracking
- **Labels** — color-coded tags for task categorization
- **Comments** — threaded discussions on tasks
- **Task assignment** — assign tasks to multiple collaborators
- **Task dependencies** — define relationships between tasks
- **Board sharing** — invite users by email with role-based access (Admin, Editor, Viewer)
- **Workspaces** — organize boards into team workspaces with member management
- **Sprint planning** — create sprints, assign tasks, start/complete sprint cycles
- **Multiple views** — Kanban board, List, Calendar, and Timeline views
- **Global search** — search tasks, boards, and comments (Cmd+K)
- **Real-time updates** — all connected clients see changes instantly via Socket.io
- **Notifications** — in-app notifications for assignments, comments, mentions, role changes, due dates
- **Activity log** — audit trail for all task and board changes
- **Dark mode** — toggle between light and dark themes
- **Email verification** — users must verify email before signing in
- **Responsive design** for mobile and desktop

## Project Structure

```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # UI components (Board, TaskModal, ViewSwitcher, etc.)
│   │   ├── hooks/          # Custom hooks (useAuth, useTheme)
│   │   ├── lib/            # API client, socket client, date helpers
│   │   ├── pages/          # Page components (Login, Signup, Boards, Kanban, etc.)
│   │   └── types/          # TypeScript type definitions
│   └── ...
├── server/                 # Express backend
│   ├── prisma/             # Prisma schema & migrations
│   ├── src/
│   │   ├── lib/            # Prisma client, socket setup, email, cron jobs
│   │   ├── middleware/     # Auth middleware
│   │   └── routes/         # API route handlers
│   └── ...
├── docker-compose.yml      # PostgreSQL + Redis containers
└── package.json            # Root workspace scripts
```

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL and Redis)

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd todo-app
npm install
npm run install:all
```

### 2. Start PostgreSQL and Redis

```bash
docker compose up -d
```

### 3. Configure environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your values:

| Variable         | Default                                                        | Description                        |
| ---------------- | -------------------------------------------------------------- | ---------------------------------- |
| `DATABASE_URL`   | `postgresql://kanban_user:kanban_pass@localhost:5432/kanban_db` | PostgreSQL connection              |
| `JWT_SECRET`     | `your-super-secret-jwt-key-change-in-production`               | JWT signing secret                 |
| `PORT`           | `3001`                                                         | Server port                        |
| `CLIENT_URL`     | `http://localhost:5173`                                        | CORS allowed origin                |
| `RESEND_API_KEY` | —                                                              | Resend API key (from resend.com)   |
| `EMAIL_FROM`     | `FlowBoard <onboarding@resend.dev>`                            | "From" address for outgoing emails |
| `REDIS_URL`      | `redis://localhost:6379`                                       | Redis connection (optional)        |

### 4. Run database migrations

```bash
cd server
npx prisma migrate dev
```

### 5. (Optional) Seed demo data

```bash
cd server
npx prisma db seed
```

This creates a demo user (`demo@kanban.app` / `demo1234`) with a sample board.

### 6. Start the development servers

From the project root:

```bash
npm run dev
```

Or start them separately:

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

### 7. Open the app

Visit [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start both server and client concurrently |
| `npm run dev:server` | Start server only                        |
| `npm run dev:client` | Start client only                        |
| `npm run install:all`| Install all dependencies                 |
| `npm run build:client`| Build frontend for production           |
| `npm run db:migrate` | Run Prisma database migrations           |
| `npm run db:seed`    | Seed demo data                           |
| `npm run db:studio`  | Open Prisma Studio GUI                   |

## API Endpoints

### Auth

| Method | Endpoint               | Description                         |
| ------ | ---------------------- | ----------------------------------- |
| POST   | `/api/auth/signup`     | Create account (sends verification) |
| GET    | `/api/auth/verify/:token` | Verify email address             |
| POST   | `/api/auth/login`      | Sign in (requires verified email)   |
| GET    | `/api/auth/me`         | Get current user                    |

### Boards

| Method | Endpoint           | Description                        |
| ------ | ------------------ | ---------------------------------- |
| GET    | `/api/boards`      | List user's boards (owned + shared)|
| POST   | `/api/boards`      | Create board (with default columns)|
| GET    | `/api/boards/:id`  | Get board with columns and tasks   |
| PATCH  | `/api/boards/:id`  | Update board title                 |
| DELETE | `/api/boards/:id`  | Delete board (owner only)          |

### Board Sharing

| Method | Endpoint                            | Description                     |
| ------ | ----------------------------------- | ------------------------------- |
| GET    | `/api/boards/:boardId/shares`       | List collaborators              |
| POST   | `/api/boards/:boardId/shares`       | Invite user by email            |
| PATCH  | `/api/boards/:boardId/shares/:shareId` | Update collaborator role     |
| DELETE | `/api/boards/:boardId/shares/:shareId` | Remove collaborator / leave  |

### Columns

| Method | Endpoint            | Description       |
| ------ | ------------------- | ----------------- |
| POST   | `/api/columns`      | Add column        |
| PATCH  | `/api/columns/:id`  | Update column     |
| DELETE | `/api/columns/:id`  | Delete column     |

### Tasks

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| GET    | `/api/tasks/:id`        | Get task with full details      |
| POST   | `/api/tasks`            | Create task                     |
| PATCH  | `/api/tasks/:id`        | Update task                     |
| PATCH  | `/api/tasks/:id/move`   | Move task (column + position)   |
| DELETE | `/api/tasks/:id`        | Delete task                     |

### Sprints

| Method | Endpoint                       | Description                        |
| ------ | ------------------------------ | ---------------------------------- |
| GET    | `/api/sprints/board/:boardId`  | List sprints for a board           |
| POST   | `/api/sprints`                 | Create sprint                      |
| PATCH  | `/api/sprints/:id`             | Update sprint                      |
| DELETE | `/api/sprints/:id`             | Delete sprint                      |
| POST   | `/api/sprints/:id/start`       | Start sprint                       |
| POST   | `/api/sprints/:id/complete`    | Complete sprint                    |
| POST   | `/api/sprints/:id/add-task`    | Add task to sprint                 |
| POST   | `/api/sprints/:id/remove-task` | Remove task from sprint            |

### Subtasks, Comments, Labels

| Method | Endpoint              | Description            |
| ------ | --------------------- | ---------------------- |
| POST   | `/api/subtasks`       | Create subtask         |
| PATCH  | `/api/subtasks/:id`   | Update subtask         |
| DELETE | `/api/subtasks/:id`   | Delete subtask         |
| GET    | `/api/comments/:taskId` | List task comments   |
| POST   | `/api/comments`       | Add comment            |
| DELETE | `/api/comments/:id`   | Delete comment         |
| GET    | `/api/labels/:boardId`| List board labels      |
| POST   | `/api/labels`         | Create label           |
| DELETE | `/api/labels/:id`     | Delete label           |

### Other

| Method | Endpoint                | Description                        |
| ------ | ----------------------- | ---------------------------------- |
| GET    | `/api/search?q=...`    | Search tasks, boards, and comments |
| GET    | `/api/notifications`   | Get user notifications             |
| PATCH  | `/api/notifications/:id` | Mark notification as read        |
| GET    | `/api/workspaces`      | List workspaces                    |
| POST   | `/api/workspaces`      | Create workspace                   |

## Socket.io Events

| Event               | Direction      | Description                               |
| ------------------- | -------------- | ----------------------------------------- |
| `join-board`        | Client → Server | Join a board room for real-time updates  |
| `leave-board`       | Client → Server | Leave a board room                       |
| `join-user`         | Client → Server | Subscribe to user-specific notifications |
| `board:updated`     | Server → Client | Full board state after a change          |
| `task:created`      | Server → Client | New task created                         |
| `task:updated`      | Server → Client | Task modified                            |
| `task:deleted`      | Server → Client | Task removed                             |
| `column:created`    | Server → Client | New column added                         |
| `column:deleted`    | Server → Client | Column removed                           |
| `sprint:created`    | Server → Client | New sprint created                       |
| `sprint:updated`    | Server → Client | Sprint modified                          |
| `sprint:completed`  | Server → Client | Sprint completed                         |
| `sprint:deleted`    | Server → Client | Sprint removed                           |
| `notification:new`  | Server → Client | New notification received                |
| `boards:updated`    | Server → Client | Board list changed (share invite/remove) |
| `board:access-revoked` | Server → Client | User removed from board              |

## Database Reset

To wipe all data and start fresh:

```bash
cd server
npx prisma migrate reset --force
```

This drops the database, re-applies all migrations, and re-runs the seed script.
