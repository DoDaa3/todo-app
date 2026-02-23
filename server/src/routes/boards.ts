import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

const taskIncludes = {
  subtasks: { orderBy: { position: "asc" as const } },
  labels: { include: { label: true } },
  assignees: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
  dependencies: { include: { dependsOn: { select: { id: true, title: true } } } },
  dependents: { include: { task: { select: { id: true, title: true } } } },
};

// List all boards for the authenticated user
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const boards = await prisma.board.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { columns: true } },
      },
    });
    res.json(boards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new board with default columns
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { title, workspaceId } = req.body;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "Title is required" });
    }

    const board = await prisma.board.create({
      data: {
        title: title.trim(),
        userId: req.userId!,
        workspaceId: workspaceId || null,
        columns: {
          create: [
            { title: "To Do", position: 0 },
            { title: "Doing", position: 1 },
            { title: "Done", position: 2 },
          ],
        },
      },
      include: {
        columns: { orderBy: { position: "asc" }, include: { tasks: true } },
      },
    });

    res.status(201).json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a single board with all columns, tasks, labels, and sprints
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const board = await prisma.board.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            tasks: {
              orderBy: { position: "asc" },
              include: taskIncludes,
            },
          },
        },
        labels: true,
        sprints: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { tasks: true } } },
        },
      },
    });

    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get board stats
router.get("/:id/stats", async (req: AuthRequest, res: Response) => {
  try {
    const board = await prisma.board.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [totalTasks, completedThisWeek, overdueTasks, tasksByColumn, tasksByMember] =
      await Promise.all([
        prisma.task.count({
          where: { column: { boardId: req.params.id } },
        }),
        prisma.task.count({
          where: {
            column: { boardId: req.params.id, title: "Done" },
            updatedAt: { gte: weekAgo },
          },
        }),
        prisma.task.count({
          where: {
            column: { boardId: req.params.id, title: { not: "Done" } },
            dueDate: { lt: now },
          },
        }),
        prisma.column.findMany({
          where: { boardId: req.params.id },
          orderBy: { position: "asc" },
          select: { title: true, _count: { select: { tasks: true } } },
        }),
        prisma.taskAssignee.groupBy({
          by: ["userId"],
          where: { task: { column: { boardId: req.params.id } } },
          _count: true,
        }),
      ]);

    // Get user names for tasksByMember
    const userIds = tasksByMember.map((m) => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

    res.json({
      totalTasks,
      completedThisWeek,
      overdueTasks,
      tasksByColumn: tasksByColumn.map((c) => ({
        column: c.title,
        count: c._count.tasks,
      })),
      tasksByMember: tasksByMember.map((m) => ({
        userId: m.userId,
        name: userMap[m.userId] || "Unknown",
        count: m._count,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update board title
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;
    const board = await prisma.board.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    const updated = await prisma.board.update({
      where: { id: req.params.id },
      data: { title: title.trim() },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a board
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const board = await prisma.board.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    await prisma.board.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
