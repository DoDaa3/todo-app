import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// Helper: check if user has access to a board (owner or shared)
async function getBoardAccess(boardId: string, userId: string): Promise<"OWNER" | "ADMIN" | "EDITOR" | "VIEWER" | null> {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) return null;
  if (board.userId === userId) return "OWNER";
  const share = await prisma.boardShare.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  if (share) return share.role;
  return null;
}

function canWrite(role: string | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "EDITOR";
}

const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().min(1).max(30),
  boardId: z.string(),
});

const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().min(1).max(30).optional(),
});

const assignLabelSchema = z.object({
  taskId: z.string(),
  labelId: z.string(),
});

const unassignLabelSchema = z.object({
  taskId: z.string(),
  labelId: z.string(),
});

// List labels for a board
router.get("/board/:boardId", async (req: AuthRequest, res: Response) => {
  try {
    const access = await getBoardAccess(req.params.boardId, req.userId!);
    if (!access) {
      return res.status(404).json({ error: "Board not found" });
    }

    const labels = await prisma.label.findMany({
      where: { boardId: req.params.boardId },
      include: {
        _count: { select: { tasks: true } },
      },
    });

    res.json(labels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a label
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createLabelSchema.parse(req.body);

    const access = await getBoardAccess(data.boardId, req.userId!);
    if (!canWrite(access)) {
      return res.status(403).json({ error: "You don't have write access to this board" });
    }

    const label = await prisma.label.create({
      data: {
        name: data.name.trim(),
        color: data.color.trim(),
        boardId: data.boardId,
      },
    });

    res.status(201).json(label);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a label
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateLabelSchema.parse(req.body);

    const label = await prisma.label.findUnique({
      where: { id: req.params.id },
      include: { board: true },
    });
    if (!label) {
      return res.status(404).json({ error: "Label not found" });
    }
    const access = await getBoardAccess(label.boardId, req.userId!);
    if (!canWrite(access)) {
      return res.status(403).json({ error: "You don't have write access to this board" });
    }

    const updated = await prisma.label.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.color !== undefined && { color: data.color.trim() }),
      },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a label (cascades to TaskLabel via Prisma schema)
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const label = await prisma.label.findUnique({
      where: { id: req.params.id },
      include: { board: true },
    });
    if (!label) {
      return res.status(404).json({ error: "Label not found" });
    }
    const access = await getBoardAccess(label.boardId, req.userId!);
    if (!canWrite(access)) {
      return res.status(403).json({ error: "You don't have write access to this board" });
    }

    await prisma.label.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Assign a label to a task
router.post("/assign", async (req: AuthRequest, res: Response) => {
  try {
    const data = assignLabelSchema.parse(req.body);

    // Verify the label exists and user has write access to the board
    const label = await prisma.label.findUnique({
      where: { id: data.labelId },
      include: { board: true },
    });
    if (!label) {
      return res.status(404).json({ error: "Label not found" });
    }
    const access = await getBoardAccess(label.boardId, req.userId!);
    if (!canWrite(access)) {
      return res.status(403).json({ error: "You don't have write access to this board" });
    }

    // Verify the task exists and belongs to the same board
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
      include: { column: true },
    });
    if (!task || task.column.boardId !== label.boardId) {
      return res.status(404).json({ error: "Task not found" });
    }

    const taskLabel = await prisma.taskLabel.create({
      data: {
        taskId: data.taskId,
        labelId: data.labelId,
      },
    });

    res.status(201).json(taskLabel);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    // Handle unique constraint violation (label already assigned)
    if ((err as any)?.code === "P2002") {
      return res.status(409).json({ error: "Label already assigned to this task" });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove a label from a task
router.delete("/unassign", async (req: AuthRequest, res: Response) => {
  try {
    const data = unassignLabelSchema.parse(req.body);

    // Verify the label exists and user has write access to the board
    const label = await prisma.label.findUnique({
      where: { id: data.labelId },
      include: { board: true },
    });
    if (!label) {
      return res.status(404).json({ error: "Label not found" });
    }
    const access = await getBoardAccess(label.boardId, req.userId!);
    if (!canWrite(access)) {
      return res.status(403).json({ error: "You don't have write access to this board" });
    }

    const taskLabel = await prisma.taskLabel.findUnique({
      where: {
        taskId_labelId: {
          taskId: data.taskId,
          labelId: data.labelId,
        },
      },
    });
    if (!taskLabel) {
      return res.status(404).json({ error: "Label is not assigned to this task" });
    }

    await prisma.taskLabel.delete({
      where: { id: taskLabel.id },
    });

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
