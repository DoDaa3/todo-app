import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
});

// Global search across tasks, boards, and comments
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Search query 'q' is required (1-200 characters)" });
    }

    const query = parsed.data.q.trim();
    const userId = req.userId!;

    // Search tasks the user has access to (on boards they own)
    const tasks = await prisma.task.findMany({
      where: {
        column: {
          board: { userId },
        },
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: {
        column: {
          include: {
            board: { select: { id: true, title: true } },
          },
        },
      },
    });

    // Search boards the user owns
    const boards = await prisma.board.findMany({
      where: {
        userId,
        title: { contains: query, mode: "insensitive" },
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { columns: true } },
      },
    });

    // Search comments on tasks the user has access to
    const comments = await prisma.comment.findMany({
      where: {
        content: { contains: query, mode: "insensitive" },
        task: {
          column: {
            board: { userId },
          },
        },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        task: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } },
      },
    });

    // Format the results with relevant context
    const results = {
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        boardId: task.column.board.id,
        boardTitle: task.column.board.title,
        columnId: task.column.id,
        updatedAt: task.updatedAt,
      })),
      boards: boards.map((board) => ({
        id: board.id,
        title: board.title,
        columnCount: board._count.columns,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      })),
      comments: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        taskId: comment.task.id,
        taskTitle: comment.task.title,
        authorId: comment.user.id,
        authorName: comment.user.name,
        createdAt: comment.createdAt,
      })),
    };

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
