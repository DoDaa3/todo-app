import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { initSocket } from "./lib/socket";
import { initCronJobs } from "./lib/cron";
import authRoutes from "./routes/auth";
import boardRoutes from "./routes/boards";
import columnRoutes from "./routes/columns";
import taskRoutes from "./routes/tasks";
import workspaceRoutes from "./routes/workspaces";
import sprintRoutes from "./routes/sprints";
import commentRoutes from "./routes/comments";
import subtaskRoutes from "./routes/subtasks";
import labelRoutes from "./routes/labels";
import notificationRoutes from "./routes/notifications";
import searchRoutes from "./routes/search";
import shareRoutes from "./routes/shares";

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL.split(",").map((u) => u.trim()),
    credentials: true,
  })
);

// Root route
app.get("/", (_req, res) => {
  res.json({ message: "Kanban API is running" });
});
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/columns", columnRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/sprints", sprintRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/subtasks", subtaskRoutes);
app.use("/api/labels", labelRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/boards", shareRoutes);

// Initialize Socket.io (only works in non-serverless environments)
if (!process.env.VERCEL) {
  initSocket(httpServer, CLIENT_URL);
}

// Initialize cron jobs
if (!process.env.VERCEL) {
  initCronJobs();
}

// Start server (local dev only — Vercel uses the exported app)
if (!process.env.VERCEL) {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
