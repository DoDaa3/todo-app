import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { sendBoardInviteEmail } from "../lib/email";

const router = Router();
router.use(authenticate);

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["EDITOR", "VIEWER"]).default("VIEWER"),
});

const updateRoleSchema = z.object({
  role: z.enum(["EDITOR", "VIEWER"]),
});

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

    // Only the board owner can invite
    const board = await prisma.board.findFirst({
      where: { id: req.params.boardId, userId: req.userId },
    });
    if (!board) return res.status(404).json({ error: "Board not found or not authorized" });

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

    // Create notification for the invited user
    await prisma.notification.create({
      data: {
        type: "BOARD_SHARED",
        content: `${inviter?.name} shared the board "${board.title}" with you as ${data.role.toLowerCase()}`,
        userId: invitedUser.id,
        relatedBoardId: board.id,
      },
    });

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

    // Only the board owner can update roles
    const board = await prisma.board.findFirst({
      where: { id: req.params.boardId, userId: req.userId },
    });
    if (!board) return res.status(404).json({ error: "Board not found or not authorized" });

    const share = await prisma.boardShare.findFirst({
      where: { id: req.params.shareId, boardId: board.id },
    });
    if (!share) return res.status(404).json({ error: "Share not found" });

    const updated = await prisma.boardShare.update({
      where: { id: share.id },
      data: { role: data.role },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
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

// Remove a collaborator from a board
router.delete("/:boardId/shares/:shareId", async (req: AuthRequest, res: Response) => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: req.params.boardId },
    });
    if (!board) return res.status(404).json({ error: "Board not found" });

    const share = await prisma.boardShare.findFirst({
      where: { id: req.params.shareId, boardId: board.id },
    });
    if (!share) return res.status(404).json({ error: "Share not found" });

    // Owner can remove anyone, or user can remove themselves
    if (board.userId !== req.userId && share.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.boardShare.delete({ where: { id: share.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
