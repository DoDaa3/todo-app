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

    // Get IDs of boards the user has access to (owned + shared)
    const sharedBoardIds = (
      await prisma.boardShare.findMany({
        where: { userId },
        select: { boardId: true },
      })
    ).map((s) => s.boardId);

    const boardAccessFilter = {
      OR: [{ userId }, { id: { in: sharedBoardIds } }],
    };

    // Search tasks the user has access to (owned + shared boards)
    const tasks = await prisma.task.findMany({
      where: {
        column: {
          board: boardAccessFilter,
        },
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
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

    // Search boards the user has access to (owned + shared)
    const boards = await prisma.board.findMany({
      where: {
        ...boardAccessFilter,
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
            board: boardAccessFilter,
          },
        },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            column: {
              select: {
                board: { select: { id: true, title: true } },
              },
            },
          },
        },
        user: { select: { id: true, name: true } },
      },
    });

    res.json({ tasks, boards, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
