import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getIO } from "../lib/socket";

const router = Router();
router.use(authenticate);

// Add a column to a board
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { boardId, title } = req.body;
    if (!boardId || !title) {
      return res.status(400).json({ error: "boardId and title are required" });
    }

    const board = await prisma.board.findFirst({
      where: { id: boardId, userId: req.userId },
    });
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    const maxPos = await prisma.column.aggregate({
      where: { boardId },
      _max: { position: true },
    });

    const column = await prisma.column.create({
      data: {
        title: title.trim(),
        boardId,
        position: (maxPos._max.position ?? -1) + 1,
      },
      include: { tasks: true },
    });

    getIO().to(`board:${boardId}`).emit("column:created", column);
    res.status(201).json(column);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update column title
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;
    const column = await prisma.column.findUnique({
      where: { id: req.params.id },
      include: { board: true },
    });
    if (!column || column.board.userId !== req.userId) {
      return res.status(404).json({ error: "Column not found" });
    }

    const updated = await prisma.column.update({
      where: { id: req.params.id },
      data: { title: title.trim() },
      include: { tasks: { orderBy: { position: "asc" } } },
    });

    getIO().to(`board:${column.boardId}`).emit("column:updated", updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a column
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const column = await prisma.column.findUnique({
      where: { id: req.params.id },
      include: { board: true },
    });
    if (!column || column.board.userId !== req.userId) {
      return res.status(404).json({ error: "Column not found" });
    }

    await prisma.column.delete({ where: { id: req.params.id } });
    getIO()
      .to(`board:${column.boardId}`)
      .emit("column:deleted", { id: req.params.id, boardId: column.boardId });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
