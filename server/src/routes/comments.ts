import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getIO } from "../lib/socket";

const router = Router();
router.use(authenticate);

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  taskId: z.string(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
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

// Helper: extract @mentions from comment content and resolve to user IDs
async function extractMentionedUsers(content: string, excludeUserId: string) {
  const mentionPattern = /@(\w+)/g;
  const usernames: string[] = [];
  let match;
  while ((match = mentionPattern.exec(content)) !== null) {
    usernames.push(match[1]);
  }

  if (usernames.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      name: { in: usernames },
      id: { not: excludeUserId },
    },
  });

  return users;
}

// List comments for a task
router.get("/task/:taskId", async (req: AuthRequest, res: Response) => {
  try {
    const task = await verifyTaskOwnership(req.params.taskId, req.userId!);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId: req.params.taskId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a comment
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createCommentSchema.parse(req.body);
    const task = await verifyTaskOwnership(data.taskId, req.userId!);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const boardId = task.column.boardId;

    const comment = await prisma.comment.create({
      data: {
        content: data.content.trim(),
        taskId: data.taskId,
        userId: req.userId!,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Create activity log entry
    await prisma.activityLog.create({
      data: {
        action: "COMMENT_ADDED",
        details: `Commented on task "${task.title}"`,
        taskId: data.taskId,
        boardId,
        userId: req.userId!,
      },
    });

    // Parse @mentions and create notifications for mentioned users
    const mentionedUsers = await extractMentionedUsers(
      data.content,
      req.userId!
    );

    if (mentionedUsers.length > 0) {
      await prisma.notification.createMany({
        data: mentionedUsers.map((user) => ({
          type: "MENTIONED" as const,
          content: `${comment.user.name} mentioned you in a comment on "${task.title}"`,
          userId: user.id,
          relatedTaskId: data.taskId,
          relatedBoardId: boardId,
        })),
      });

      // Emit notification events for each mentioned user
      const io = getIO();
      for (const user of mentionedUsers) {
        io?.to(`user:${user.id}`).emit("notification:new", {
          type: "MENTIONED",
          taskId: data.taskId,
          boardId,
        });
      }
    }

    getIO()?.to(`board:${boardId}`).emit("comment:created", comment);
    res.status(201).json(comment);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a comment (only by author)
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateCommentSchema.parse(req.body);
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { column: { include: { board: true } } } } },
    });
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (comment.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to edit this comment" });
    }

    const updated = await prisma.comment.update({
      where: { id: req.params.id },
      data: { content: data.content.trim() },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    const boardId = comment.task.column.boardId;
    getIO()?.to(`board:${boardId}`).emit("comment:updated", updated);
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a comment (only by author)
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { column: { include: { board: true } } } } },
    });
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (comment.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to delete this comment" });
    }

    await prisma.comment.delete({ where: { id: req.params.id } });

    const boardId = comment.task.column.boardId;
    getIO()
      ?.to(`board:${boardId}`)
      .emit("comment:deleted", {
        id: req.params.id,
        taskId: comment.taskId,
        boardId,
      });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
