import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getIO } from "../lib/socket";

const router = Router();
router.use(authenticate);

// Standard includes for task queries
const taskIncludes = {
  subtasks: { orderBy: { position: "asc" as const } },
  labels: { include: { label: true } },
  assignees: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
  dependencies: { include: { dependsOn: { select: { id: true, title: true } } } },
  dependents: { include: { task: { select: { id: true, title: true } } } },
};

const createTaskSchema = z.object({
  columnId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  storyPoints: z.number().int().min(0).nullable().optional(),
  isBacklog: z.boolean().optional(),
  sprintId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  storyPoints: z.number().int().min(0).nullable().optional(),
  isBacklog: z.boolean().optional(),
  sprintId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
});

const moveTaskSchema = z.object({
  columnId: z.string(),
  position: z.number().int().min(0),
});

// Check if user has write access to a board (owner, ADMIN, or EDITOR)
async function verifyBoardWriteAccess(boardId: string, userId: string): Promise<boolean> {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) return false;
  if (board.userId === userId) return true;
  const share = await prisma.boardShare.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  return share?.role === "EDITOR" || share?.role === "ADMIN";
}

async function verifyColumnOwnership(columnId: string, userId: string) {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: { board: true },
  });
  if (!column) return null;
  // Owner has direct access
  if (column.board.userId === userId) return column;
  // Check shared EDITOR or ADMIN access
  const share = await prisma.boardShare.findUnique({
    where: { boardId_userId: { boardId: column.boardId, userId } },
  });
  if (share?.role === "EDITOR" || share?.role === "ADMIN") return column;
  return null;
}

// Get a single task with all details
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === "my") return res.status(400).json({ error: "Use /my/assigned" });
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        ...taskIncludes,
        comments: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          orderBy: { createdAt: "asc" },
        },
        activities: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        column: { include: { board: true } },
      },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    // Check read access (owner or any share role)
    const isOwner = task.column.board.userId === req.userId;
    const hasShare = !isOwner && await prisma.boardShare.findUnique({
      where: { boardId_userId: { boardId: task.column.boardId, userId: req.userId! } },
    });
    if (!isOwner && !hasShare) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List tasks for the current user (My Tasks view)
router.get("/my/assigned", async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        assignees: { some: { userId: req.userId } },
      },
      include: {
        ...taskIncludes,
        column: { include: { board: { select: { id: true, title: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

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
        startDate: data.startDate ? new Date(data.startDate) : null,
        storyPoints: data.storyPoints ?? null,
        isBacklog: data.isBacklog ?? false,
        columnId: data.columnId,
        sprintId: data.sprintId ?? null,
        position: (maxPos._max.position ?? -1) + 1,
        ...(data.assigneeIds?.length && {
          assignees: {
            create: data.assigneeIds.map((userId) => ({ userId })),
          },
        }),
        ...(data.labelIds?.length && {
          labels: {
            create: data.labelIds.map((labelId) => ({ labelId })),
          },
        }),
      },
      include: taskIncludes,
    });

    await prisma.activityLog.create({
      data: {
        action: "created",
        details: `Created task "${task.title}"`,
        taskId: task.id,
        boardId: column.boardId,
        userId: req.userId!,
      },
    });

    if (data.assigneeIds?.length) {
      const otherAssignees = data.assigneeIds.filter((id) => id !== req.userId);
      if (otherAssignees.length) {
        await prisma.notification.createMany({
          data: otherAssignees.map((userId) => ({
            type: "TASK_ASSIGNED" as const,
            content: `You were assigned to "${task.title}"`,
            userId,
            relatedTaskId: task.id,
            relatedBoardId: column.boardId,
          })),
        });
      }
    }

    getIO()?.to(`board:${column.boardId}`).emit("task:created", task);
    res.status(201).json(task);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a task
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateTaskSchema.parse(req.body);
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { column: { include: { board: true } }, assignees: true },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!(await verifyBoardWriteAccess(task.column.boardId, req.userId!))) {
      return res.status(403).json({ error: "You have view-only access to this board" });
    }

    if (data.assigneeIds !== undefined) {
      await prisma.taskAssignee.deleteMany({ where: { taskId: task.id } });
      if (data.assigneeIds.length) {
        await prisma.taskAssignee.createMany({
          data: data.assigneeIds.map((userId) => ({ taskId: task.id, userId })),
        });
        const existingIds = task.assignees.map((a) => a.userId);
        const newAssignees = data.assigneeIds.filter(
          (id) => !existingIds.includes(id) && id !== req.userId
        );
        if (newAssignees.length) {
          await prisma.notification.createMany({
            data: newAssignees.map((userId) => ({
              type: "TASK_ASSIGNED" as const,
              content: `You were assigned to "${task.title}"`,
              userId,
              relatedTaskId: task.id,
              relatedBoardId: task.column.boardId,
            })),
          });
        }
      }
    }

    if (data.labelIds !== undefined) {
      await prisma.taskLabel.deleteMany({ where: { taskId: task.id } });
      if (data.labelIds.length) {
        await prisma.taskLabel.createMany({
          data: data.labelIds.map((labelId) => ({ taskId: task.id, labelId })),
        });
      }
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description.trim() }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.storyPoints !== undefined && { storyPoints: data.storyPoints }),
        ...(data.isBacklog !== undefined && { isBacklog: data.isBacklog }),
        ...(data.sprintId !== undefined && { sprintId: data.sprintId }),
      },
      include: taskIncludes,
    });

    const changes: string[] = [];
    if (data.title && data.title !== task.title) changes.push("title");
    if (data.priority && data.priority !== task.priority) changes.push("priority");
    if (data.dueDate !== undefined) changes.push("due date");
    if (data.assigneeIds !== undefined) changes.push("assignees");
    if (changes.length) {
      await prisma.activityLog.create({
        data: {
          action: "updated",
          details: `Updated ${changes.join(", ")}`,
          taskId: task.id,
          boardId: task.column.boardId,
          userId: req.userId!,
        },
      });
    }

    getIO()?.to(`board:${task.column.boardId}`).emit("task:updated", updated);
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add dependency
router.post("/:id/dependencies", async (req: AuthRequest, res: Response) => {
  try {
    const { dependsOnId } = req.body;
    if (!dependsOnId) return res.status(400).json({ error: "dependsOnId required" });

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { column: { include: { board: true } } },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!(await verifyBoardWriteAccess(task.column.boardId, req.userId!))) {
      return res.status(403).json({ error: "You have view-only access to this board" });
    }

    const dep = await prisma.taskDependency.create({
      data: { taskId: req.params.id, dependsOnId },
      include: { dependsOn: { select: { id: true, title: true } } },
    });

    res.status(201).json(dep);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove dependency
router.delete("/:id/dependencies/:depId", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.taskDependency.delete({ where: { id: req.params.depId } });
    res.json({ success: true });
  } catch (err) {
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
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!(await verifyBoardWriteAccess(task.column.boardId, req.userId!))) {
      return res.status(403).json({ error: "You have view-only access to this board" });
    }

    const targetColumn = await verifyColumnOwnership(data.columnId, req.userId!);
    if (!targetColumn) {
      return res.status(404).json({ error: "Target column not found" });
    }

    const boardId = task.column.boardId;
    const oldColumnTitle = task.column.title;

    await prisma.$transaction(async (tx) => {
      if (task.columnId === data.columnId) {
        const oldPos = task.position;
        const newPos = data.position;
        if (oldPos < newPos) {
          await tx.task.updateMany({
            where: { columnId: data.columnId, position: { gt: oldPos, lte: newPos }, id: { not: task.id } },
            data: { position: { decrement: 1 } },
          });
        } else if (oldPos > newPos) {
          await tx.task.updateMany({
            where: { columnId: data.columnId, position: { gte: newPos, lt: oldPos }, id: { not: task.id } },
            data: { position: { increment: 1 } },
          });
        }
      } else {
        await tx.task.updateMany({
          where: { columnId: task.columnId, position: { gt: task.position } },
          data: { position: { decrement: 1 } },
        });
        await tx.task.updateMany({
          where: { columnId: data.columnId, position: { gte: data.position } },
          data: { position: { increment: 1 } },
        });
      }
      await tx.task.update({
        where: { id: task.id },
        data: { columnId: data.columnId, position: data.position },
      });
    });

    if (task.columnId !== data.columnId) {
      await prisma.activityLog.create({
        data: {
          action: "moved",
          details: `Moved from "${oldColumnTitle}" to "${targetColumn.title}"`,
          taskId: task.id,
          boardId,
          userId: req.userId!,
        },
      });
    }

    const updatedBoard = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: { tasks: { orderBy: { position: "asc" }, include: taskIncludes } },
        },
      },
    });

    getIO()?.to(`board:${boardId}`).emit("board:updated", updatedBoard);
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
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!(await verifyBoardWriteAccess(task.column.boardId, req.userId!))) {
      return res.status(403).json({ error: "You have view-only access to this board" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: req.params.id } });
      await tx.task.updateMany({
        where: { columnId: task.columnId, position: { gt: task.position } },
        data: { position: { decrement: 1 } },
      });
    });

    getIO()?.to(`board:${task.column.boardId}`).emit("task:deleted", {
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
