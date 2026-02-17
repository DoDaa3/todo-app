import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getIO } from "../lib/socket";

const router = Router();
router.use(authenticate);

const createTaskSchema = z.object({
  columnId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().nullable().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().nullable().optional(),
});

const moveTaskSchema = z.object({
  columnId: z.string(),
  position: z.number().int().min(0),
});

// Helper: verify the user owns the board that contains this column
async function verifyColumnOwnership(columnId: string, userId: string) {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: { board: true },
  });
  if (!column || column.board.userId !== userId) return null;
  return column;
}

// Create a task
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const column = await verifyColumnOwnership(data.columnId, req.userId!);
    if (!column) {
      return res.status(404).json({ error: "Column not found" });
    }

    const maxPos = await prisma.task.aggregate({
      where: { columnId: data.columnId },
      _max: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() ?? "",
        priority: data.priority ?? "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        columnId: data.columnId,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });

    getIO().to(`board:${column.boardId}`).emit("task:created", task);
    res.status(201).json(task);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a task (title, description, priority, dueDate)
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateTaskSchema.parse(req.body);
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { column: { include: { board: true } } },
    });
    if (!task || task.column.board.userId !== req.userId) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && {
          description: data.description.trim(),
        }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
      },
    });

    getIO()
      .to(`board:${task.column.boardId}`)
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

// Move a task (change column and/or position)
router.patch("/:id/move", async (req: AuthRequest, res: Response) => {
  try {
    const data = moveTaskSchema.parse(req.body);
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { column: { include: { board: true } } },
    });
    if (!task || task.column.board.userId !== req.userId) {
      return res.status(404).json({ error: "Task not found" });
    }

    const targetColumn = await verifyColumnOwnership(
      data.columnId,
      req.userId!
    );
    if (!targetColumn) {
      return res.status(404).json({ error: "Target column not found" });
    }

    const boardId = task.column.boardId;

    await prisma.$transaction(async (tx) => {
      // If moving within the same column
      if (task.columnId === data.columnId) {
        const oldPos = task.position;
        const newPos = data.position;

        if (oldPos < newPos) {
          await tx.task.updateMany({
            where: {
              columnId: data.columnId,
              position: { gt: oldPos, lte: newPos },
              id: { not: task.id },
            },
            data: { position: { decrement: 1 } },
          });
        } else if (oldPos > newPos) {
          await tx.task.updateMany({
            where: {
              columnId: data.columnId,
              position: { gte: newPos, lt: oldPos },
              id: { not: task.id },
            },
            data: { position: { increment: 1 } },
          });
        }
      } else {
        // Moving to a different column: close the gap in the source
        await tx.task.updateMany({
          where: {
            columnId: task.columnId,
            position: { gt: task.position },
          },
          data: { position: { decrement: 1 } },
        });

        // Make room in the destination
        await tx.task.updateMany({
          where: {
            columnId: data.columnId,
            position: { gte: data.position },
          },
          data: { position: { increment: 1 } },
        });
      }

      await tx.task.update({
        where: { id: task.id },
        data: { columnId: data.columnId, position: data.position },
      });
    });

    // Fetch the full updated board state for real-time sync
    const updatedBoard = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: { tasks: { orderBy: { position: "asc" } } },
        },
      },
    });

    getIO().to(`board:${boardId}`).emit("board:updated", updatedBoard);
    res.json(updatedBoard);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a task
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { column: { include: { board: true } } },
    });
    if (!task || task.column.board.userId !== req.userId) {
      return res.status(404).json({ error: "Task not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: req.params.id } });
      await tx.task.updateMany({
        where: {
          columnId: task.columnId,
          position: { gt: task.position },
        },
        data: { position: { decrement: 1 } },
      });
    });

    getIO()
      .to(`board:${task.column.boardId}`)
      .emit("task:deleted", {
        id: req.params.id,
        columnId: task.columnId,
        boardId: task.column.boardId,
      });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
