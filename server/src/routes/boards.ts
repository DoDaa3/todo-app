import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

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
    const { title } = req.body;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "Title is required" });
    }

    const board = await prisma.board.create({
      data: {
        title: title.trim(),
        userId: req.userId!,
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

// Get a single board with all columns and tasks
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const board = await prisma.board.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            tasks: { orderBy: { position: "asc" } },
          },
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
