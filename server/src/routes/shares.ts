import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { sendBoardInviteEmail } from "../lib/email";
import { getIO } from "../lib/socket";

const router = Router();
router.use(authenticate);

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("VIEWER"),
});

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

// Helper: create notification and push via socket
async function createAndEmitNotification(data: {
  type: "BOARD_SHARED" | "ROLE_CHANGED" | "BOARD_REMOVED";
  content: string;
  userId: string;
  relatedBoardId: string;
}) {
  const notification = await prisma.notification.create({ data });
  const io = getIO();
  if (io) {
    io.to(`user:${data.userId}`).emit("notification:new", notification);
  }
  return notification;
}

// List all collaborators on a board
router.get("/:boardId/shares", async (req: AuthRequest, res: Response) => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: req.params.boardId },
    });
    if (!board) return res.status(404).json({ error: "Board not found" });

    // Only the owner or existing collaborators can see shares
    const hasAccess =
      board.userId === req.userId ||
      (await prisma.boardShare.findUnique({
        where: {
          boardId_userId: { boardId: board.id, userId: req.userId! },
        },
      }));
    if (!hasAccess) return res.status(403).json({ error: "Access denied" });

    const shares = await prisma.boardShare.findMany({
      where: { boardId: req.params.boardId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Also return the owner info
    const owner = await prisma.user.findUnique({
      where: { id: board.userId },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    res.json({ owner, shares });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Invite a user to a board by email
router.post("/:boardId/shares", async (req: AuthRequest, res: Response) => {
  try {
    const data = inviteSchema.parse(req.body);

    // Owner or ADMIN can invite
    const board = await prisma.board.findUnique({
      where: { id: req.params.boardId },
    });
    if (!board) return res.status(404).json({ error: "Board not found" });

    const isOwner = board.userId === req.userId;
    const callerShare = !isOwner
      ? await prisma.boardShare.findUnique({
          where: { boardId_userId: { boardId: board.id, userId: req.userId! } },
        })
      : null;
    if (!isOwner && callerShare?.role !== "ADMIN") {
      return res.status(403).json({ error: "Only the owner or admins can invite users" });
    }

    // Only owner can invite as ADMIN
    if (!isOwner && data.role === "ADMIN") {
      return res.status(403).json({ error: "Only the board owner can grant admin access" });
    }

    // Can't invite yourself
    const inviter = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (data.email === inviter?.email) {
      return res.status(400).json({ error: "You cannot invite yourself" });
    }

    // Find the user by email
    const invitedUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!invitedUser) {
      return res.status(404).json({
        error: "No account found with that email. They need to sign up first.",
      });
    }

    // Check if already shared
    const existing = await prisma.boardShare.findUnique({
      where: {
        boardId_userId: { boardId: board.id, userId: invitedUser.id },
      },
    });
    if (existing) {
      return res.status(409).json({ error: "This user already has access to this board" });
    }

    // Create the share
    const share = await prisma.boardShare.create({
      data: {
        boardId: board.id,
        userId: invitedUser.id,
        role: data.role,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Create notification + real-time push
    await createAndEmitNotification({
      type: "BOARD_SHARED",
      content: `${inviter?.name} shared the board "${board.title}" with you as ${data.role.toLowerCase()}`,
      userId: invitedUser.id,
      relatedBoardId: board.id,
    });

    // Emit boards-updated so the invited user's board list refreshes in real-time
    const io = getIO();
    if (io) {
      io.to(`user:${invitedUser.id}`).emit("boards:updated");
    }

    // Send email notification (fire-and-forget)
    sendBoardInviteEmail(
      invitedUser.email,
      inviter?.name || "Someone",
      board.title,
      data.role
    ).catch(() => {});

    res.status(201).json(share);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a collaborator's role
router.patch("/:boardId/shares/:shareId", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateRoleSchema.parse(req.body);

    // Owner or ADMIN can update roles
    const board = await prisma.board.findUnique({
      where: { id: req.params.boardId },
    });
    if (!board) return res.status(404).json({ error: "Board not found" });

    const isOwner = board.userId === req.userId;
    const callerShare = !isOwner
      ? await prisma.boardShare.findUnique({
          where: { boardId_userId: { boardId: board.id, userId: req.userId! } },
        })
      : null;
    if (!isOwner && callerShare?.role !== "ADMIN") {
      return res.status(403).json({ error: "Only the owner or admins can update roles" });
    }

    const share = await prisma.boardShare.findFirst({
      where: { id: req.params.shareId, boardId: board.id },
    });
    if (!share) return res.status(404).json({ error: "Share not found" });

    // Admins can only change roles of EDITOR/VIEWER, not other ADMINs
    if (!isOwner && share.role === "ADMIN") {
      return res.status(403).json({ error: "Only the board owner can change an admin's role" });
    }

    // Only owner can promote to ADMIN
    if (!isOwner && data.role === "ADMIN") {
      return res.status(403).json({ error: "Only the board owner can grant admin access" });
    }

    const oldRole = share.role;
    const updated = await prisma.boardShare.update({
      where: { id: share.id },
      data: { role: data.role },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Notify the user whose role changed
    if (oldRole !== data.role) {
      const changer = await prisma.user.findUnique({ where: { id: req.userId! } });
      await createAndEmitNotification({
        type: "ROLE_CHANGED",
        content: `${changer?.name} changed your role on "${board.title}" from ${oldRole.toLowerCase()} to ${data.role.toLowerCase()}`,
        userId: share.userId,
        relatedBoardId: board.id,
      });

      // Also refresh their boards list so the role badge updates
      const io = getIO();
      if (io) {
        io.to(`user:${share.userId}`).emit("boards:updated");
      }
    }

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove a collaborator from a board
router.delete("/:boardId/shares/:shareId", async (req: AuthRequest, res: Response) => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: req.params.boardId },
    });
    if (!board) return res.status(404).json({ error: "Board not found" });

    const share = await prisma.boardShare.findFirst({
      where: { id: req.params.shareId, boardId: board.id },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
    if (!share) return res.status(404).json({ error: "Share not found" });

    // Owner can remove anyone; Admin can remove EDITOR/VIEWER but not other ADMINs; user can remove themselves
    const isOwner = board.userId === req.userId;
    const isSelf = share.userId === req.userId;
    if (!isOwner && !isSelf) {
      const callerShare = await prisma.boardShare.findUnique({
        where: { boardId_userId: { boardId: board.id, userId: req.userId! } },
      });
      if (callerShare?.role !== "ADMIN") {
        return res.status(403).json({ error: "Not authorized" });
      }
      // Admin trying to remove another Admin — blocked
      if (share.role === "ADMIN") {
        return res.status(403).json({ error: "Only the board owner can remove an admin" });
      }
    }

    await prisma.boardShare.delete({ where: { id: share.id } });

    // Notify the removed user (unless they removed themselves)
    if (!isSelf) {
      const remover = await prisma.user.findUnique({ where: { id: req.userId! } });
      await createAndEmitNotification({
        type: "BOARD_REMOVED",
        content: `${remover?.name} removed you from the board "${board.title}"`,
        userId: share.userId,
        relatedBoardId: board.id,
      });
    }

    // Refresh the removed user's board list
    const io = getIO();
    if (io) {
      io.to(`user:${share.userId}`).emit("boards:updated");
      // If the user is currently viewing this board, kick them out
      io.to(`user:${share.userId}`).emit("board:access-revoked", { boardId: board.id });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
