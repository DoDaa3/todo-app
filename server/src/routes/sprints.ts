import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getIO } from "../lib/socket";

const router = Router();
router.use(authenticate);

// ─── Zod schemas ────────────────────────────────────────────────────

const createSprintSchema = z.object({
  name: z.string().min(1).max(200),
  startDate: z.string(),
  endDate: z.string(),
  boardId: z.string(),
});

const updateSprintSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED"]).optional(),
});

const taskIdSchema = z.object({
  taskId: z.string(),
});

// ─── Helpers ────────────────────────────────────────────────────────

async function verifyBoardOwnership(boardId: string, userId: string) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, userId },
  });
  return board;
}

async function getSprintWithBoard(sprintId: string) {
  return prisma.sprint.findUnique({
    where: { id: sprintId },
    include: { board: true },
  });
}

// ─── Routes ─────────────────────────────────────────────────────────

// List all sprints for a board (with task counts)
router.get("/board/:boardId", async (req: AuthRequest, res: Response) => {
  try {
    const board = await verifyBoardOwnership(req.params.boardId, req.userId!);
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    // Find the last column (highest position) to use as the "done" column
    const lastColumn = await prisma.column.findFirst({
      where: { boardId: req.params.boardId },
      orderBy: { position: "desc" },
      select: { id: true },
    });
    const doneColumnId = lastColumn?.id;

    const sprints = await prisma.sprint.findMany({
      where: { boardId: req.params.boardId },
      orderBy: { createdAt: "desc" },
      include: {
        tasks: {
          select: {
            id: true,
            columnId: true,
          },
        },
      },
    });

    const result = sprints.map((sprint) => {
      const total = sprint.tasks.length;
      const completed = doneColumnId
        ? sprint.tasks.filter((t) => t.columnId === doneColumnId).length
        : 0;

      const { tasks, ...sprintData } = sprint;
      return {
        ...sprintData,
        taskCount: { total, completed },
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new sprint
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createSprintSchema.parse(req.body);

    const board = await verifyBoardOwnership(data.boardId, req.userId!);
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate <= startDate) {
      return res.status(400).json({ error: "End date must be after start date" });
    }

    const sprint = await prisma.sprint.create({
      data: {
        name: data.name.trim(),
        startDate,
        endDate,
        boardId: data.boardId,
      },
    });

    getIO()?.to(`board:${data.boardId}`).emit("sprint:created", sprint);
    res.status(201).json(sprint);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a sprint (name, dates, status)
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateSprintSchema.parse(req.body);
    const sprint = await getSprintWithBoard(req.params.id);
    if (!sprint || sprint.board.userId !== req.userId) {
      return res.status(404).json({ error: "Sprint not found" });
    }

    // Validate dates: resolve effective start/end considering partial updates
    const effectiveStart = data.startDate ? new Date(data.startDate) : sprint.startDate;
    const effectiveEnd = data.endDate ? new Date(data.endDate) : sprint.endDate;
    if (effectiveEnd <= effectiveStart) {
      return res.status(400).json({ error: "End date must be after start date" });
    }

    const updated = await prisma.sprint.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.startDate !== undefined && {
          startDate: new Date(data.startDate),
        }),
        ...(data.endDate !== undefined && {
          endDate: new Date(data.endDate),
        }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    getIO()
      ?.to(`board:${sprint.boardId}`)
      .emit("sprint:updated", updated);
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a sprint (moves tasks back to backlog)
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const sprint = await getSprintWithBoard(req.params.id);
    if (!sprint || sprint.board.userId !== req.userId) {
      return res.status(404).json({ error: "Sprint not found" });
    }

    await prisma.$transaction(async (tx) => {
      // Move all tasks in this sprint back to backlog
      await tx.task.updateMany({
        where: { sprintId: sprint.id },
        data: { sprintId: null, isBacklog: true },
      });

      await tx.sprint.delete({ where: { id: sprint.id } });
    });

    getIO()
      ?.to(`board:${sprint.boardId}`)
      .emit("sprint:deleted", { id: sprint.id, boardId: sprint.boardId });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start a sprint (set status to ACTIVE, ensure no other active sprint on board)
router.post("/:id/start", async (req: AuthRequest, res: Response) => {
  try {
    const sprint = await getSprintWithBoard(req.params.id);
    if (!sprint || sprint.board.userId !== req.userId) {
      return res.status(404).json({ error: "Sprint not found" });
    }

    if (sprint.status !== "PLANNING") {
      return res
        .status(400)
        .json({ error: "Only sprints in PLANNING status can be started" });
    }

    // Check for existing active sprint on this board
    const activeSprint = await prisma.sprint.findFirst({
      where: {
        boardId: sprint.boardId,
        status: "ACTIVE",
      },
    });

    if (activeSprint) {
      return res.status(409).json({
        error: "Another sprint is already active on this board",
      });
    }

    const updated = await prisma.sprint.update({
      where: { id: sprint.id },
      data: { status: "ACTIVE" },
    });

    getIO()
      ?.to(`board:${sprint.boardId}`)
      .emit("sprint:updated", updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Complete a sprint (move unfinished tasks back to backlog, mark COMPLETED)
router.post("/:id/complete", async (req: AuthRequest, res: Response) => {
  try {
    const sprint = await getSprintWithBoard(req.params.id);
    if (!sprint || sprint.board.userId !== req.userId) {
      return res.status(404).json({ error: "Sprint not found" });
    }

    if (sprint.status !== "ACTIVE") {
      return res
        .status(400)
        .json({ error: "Only ACTIVE sprints can be completed" });
    }

    // Use the last column (highest position) as the "done" column
    const lastColumn = await prisma.column.findFirst({
      where: { boardId: sprint.boardId },
      orderBy: { position: "desc" },
      select: { id: true },
    });
    const doneColumnIds = lastColumn ? [lastColumn.id] : [];

    await prisma.$transaction(async (tx) => {
      // Move unfinished tasks (not in a Done column) back to backlog
      await tx.task.updateMany({
        where: {
          sprintId: sprint.id,
          columnId: { notIn: doneColumnIds },
        },
        data: { sprintId: null, isBacklog: true },
      });

      // Mark the sprint as completed
      await tx.sprint.update({
        where: { id: sprint.id },
        data: { status: "COMPLETED" },
      });
    });

    const updated = await prisma.sprint.findUnique({
      where: { id: sprint.id },
    });

    getIO()
      ?.to(`board:${sprint.boardId}`)
      .emit("sprint:completed", updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add a task to a sprint
router.post("/:id/add-task", async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = taskIdSchema.parse(req.body);

    const sprint = await getSprintWithBoard(req.params.id);
    if (!sprint || sprint.board.userId !== req.userId) {
      return res.status(404).json({ error: "Sprint not found" });
    }

    // Verify the task exists and belongs to the same board
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { column: true },
    });
    if (!task || task.column.boardId !== sprint.boardId) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { sprintId: sprint.id, isBacklog: false },
    });

    getIO()
      ?.to(`board:${sprint.boardId}`)
      .emit("task:updated", updated);
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove a task from a sprint
router.post("/:id/remove-task", async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = taskIdSchema.parse(req.body);

    const sprint = await getSprintWithBoard(req.params.id);
    if (!sprint || sprint.board.userId !== req.userId) {
      return res.status(404).json({ error: "Sprint not found" });
    }

    // Verify the task belongs to this sprint
    const task = await prisma.task.findFirst({
      where: { id: taskId, sprintId: sprint.id },
    });
    if (!task) {
      return res.status(404).json({ error: "Task not found in this sprint" });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { sprintId: null, isBacklog: true },
    });

    getIO()
      ?.to(`board:${sprint.boardId}`)
      .emit("task:updated", updated);
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
