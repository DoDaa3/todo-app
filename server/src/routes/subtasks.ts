import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getIO } from "../lib/socket";

const router = Router();
router.use(authenticate);

const createSubtaskSchema = z.object({
  title: z.string().min(1).max(500),
  taskId: z.string(),
});

const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
});

const reorderSubtasksSchema = z.object({
  subtasks: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
    })
  ),
});

// Helper: verify the user owns the board that contains this task
async function verifyTaskOwnership(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: true } } },
  });
  if (!task || task.column.board.userId !== userId) return null;
  return task;
}

// Helper: verify the user owns the board that contains this subtask's task
async function verifySubtaskOwnership(subtaskId: string, userId: string) {
  const subtask = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: { include: { column: { include: { board: true } } } } },
  });
  if (!subtask || subtask.task.column.board.userId !== userId) return null;
  return subtask;
}

// List subtasks for a task (ordered by position)
router.get("/task/:taskId", async (req: AuthRequest, res: Response) => {
  try {
    const task = await verifyTaskOwnership(req.params.taskId, req.userId!);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const subtasks = await prisma.subtask.findMany({
      where: { taskId: req.params.taskId },
      orderBy: { position: "asc" },
    });

    res.json(subtasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a subtask
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createSubtaskSchema.parse(req.body);
    const task = await verifyTaskOwnership(data.taskId, req.userId!);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const maxPos = await prisma.subtask.aggregate({
      where: { taskId: data.taskId },
      _max: { position: true },
    });

    const subtask = await prisma.subtask.create({
      data: {
        title: data.title.trim(),
        taskId: data.taskId,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });

    const boardId = task.column.boardId;
    getIO()?.to(`board:${boardId}`).emit("subtask:created", subtask);
    res.status(201).json(subtask);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a subtask (title, completed)
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateSubtaskSchema.parse(req.body);
    const subtask = await verifySubtaskOwnership(req.params.id, req.userId!);
    if (!subtask) {
      return res.status(404).json({ error: "Subtask not found" });
    }

    const updated = await prisma.subtask.update({
      where: { id: req.params.id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.completed !== undefined && { completed: data.completed }),
      },
    });

    const boardId = subtask.task.column.boardId;
    getIO()?.to(`board:${boardId}`).emit("subtask:updated", updated);
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reorder subtasks
router.patch("/reorder", async (req: AuthRequest, res: Response) => {
  try {
    const data = reorderSubtasksSchema.parse(req.body);

    if (data.subtasks.length === 0) {
      return res.status(400).json({ error: "No subtasks provided" });
    }

    // Verify ownership via the first subtask's task
    const firstSubtask = await prisma.subtask.findUnique({
      where: { id: data.subtasks[0].id },
      include: { task: { include: { column: { include: { board: true } } } } },
    });
    if (!firstSubtask || firstSubtask.task.column.board.userId !== req.userId) {
      return res.status(404).json({ error: "Subtask not found" });
    }

    const taskId = firstSubtask.taskId;
    const boardId = firstSubtask.task.column.boardId;

    await prisma.$transaction(
      data.subtasks.map((s) =>
        prisma.subtask.update({
          where: { id: s.id },
          data: { position: s.position },
        })
      )
    );

    const updatedSubtasks = await prisma.subtask.findMany({
      where: { taskId },
      orderBy: { position: "asc" },
    });

    getIO()
      ?.to(`board:${boardId}`)
      .emit("subtask:reordered", { taskId, subtasks: updatedSubtasks });
    res.json(updatedSubtasks);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a subtask
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const subtask = await verifySubtaskOwnership(req.params.id, req.userId!);
    if (!subtask) {
      return res.status(404).json({ error: "Subtask not found" });
    }

    const boardId = subtask.task.column.boardId;
    const taskId = subtask.taskId;

    await prisma.$transaction(async (tx) => {
      await tx.subtask.delete({ where: { id: req.params.id } });
      // Close the position gap left by the deleted subtask
      await tx.subtask.updateMany({
        where: {
          taskId,
          position: { gt: subtask.position },
        },
        data: { position: { decrement: 1 } },
      });
    });

    getIO()
      ?.to(`board:${boardId}`)
      .emit("subtask:deleted", {
        id: req.params.id,
        taskId,
        boardId,
      });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
