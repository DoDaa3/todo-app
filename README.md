# Kanban Task Management App

A full-stack collaborative Kanban board application with real-time updates, drag-and-drop task management, and JWT authentication.

## Tech Stack

- **Frontend:** React 18 (Vite), Tailwind CSS, @hello-pangea/dnd (drag-and-drop)
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Real-time:** Socket.io
- **Auth:** JWT-based signup/login with email verification
- **Email:** Resend (transactional email API)

## Features

- Kanban board with default columns: "To Do", "Doing", "Done"
- Drag and drop tasks between columns with smooth animations
- Create, edit, and delete tasks (title, description, priority, due date)
- Real-time updates via Socket.io — all connected clients see changes instantly
- JWT-based user authentication (signup / login)
- Email verification on signup — users must verify email before signing in
- Multiple boards — create and manage separate project boards
- Task filtering by priority level and due date
- Custom confirmation modals and toast notifications (no native browser dialogs)
- Responsive design for mobile and desktop

## Project Structure

```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom hooks (auth context)
│   │   ├── lib/            # API client, socket client
│   │   ├── pages/          # Page components
│   │   └── types/          # TypeScript types
│   └── ...
├── server/                 # Express backend
│   ├── prisma/             # Prisma schema & migrations
│   ├── src/
│   │   ├── lib/            # Prisma client, socket setup, email
│   │   ├── middleware/     # Auth middleware
│   │   └── routes/         # API route handlers
│   └── ...
├── docker-compose.yml      # PostgreSQL container
└── package.json            # Root workspace scripts
```

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL)

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd todo-app
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your values:

| Variable       | Default                                                      | Description                       |
| -------------- | ------------------------------------------------------------ | --------------------------------- |
| `DATABASE_URL` | `postgresql://kanban_user:kanban_pass@localhost:5432/kanban_db` | PostgreSQL connection             |
| `JWT_SECRET`   | `your-super-secret-jwt-key-change-in-production`             | JWT signing secret                |
| `PORT`         | `3001`                                                       | Server port                       |
| `CLIENT_URL`   | `http://localhost:5173`                                      | CORS allowed origin               |
| `RESEND_API_KEY` | —                                                          | Resend API key (from resend.com)  |
| `EMAIL_FROM`   | `Kanban App <onboarding@resend.dev>`                         | "From" address for outgoing emails |

### 4. Run database migrations

```bash
cd server
npx prisma migrate dev --name init
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

## API Endpoints

### Auth
- `POST /api/auth/signup` — Create account (sends verification email)
- `GET /api/auth/verify/:token` — Verify email address
- `POST /api/auth/login` — Sign in (requires verified email)
- `GET /api/auth/me` — Get current user

### Boards
- `GET /api/boards` — List user's boards
- `POST /api/boards` — Create board (with default columns)
- `GET /api/boards/:id` — Get board with columns and tasks
- `PATCH /api/boards/:id` — Update board title
- `DELETE /api/boards/:id` — Delete board

### Columns
- `POST /api/columns` — Add column to board
- `PATCH /api/columns/:id` — Update column title
- `DELETE /api/columns/:id` — Delete column

### Tasks
- `POST /api/tasks` — Create task
- `PATCH /api/tasks/:id` — Update task
- `PATCH /api/tasks/:id/move` — Move task (column + position)
- `DELETE /api/tasks/:id` — Delete task

## Socket.io Events

- `join-board` / `leave-board` — Join/leave a board room
- `board:updated` — Full board state after a move
- `task:created` / `task:updated` / `task:deleted` — Task changes
- `column:created` / `column:deleted` — Column changes
