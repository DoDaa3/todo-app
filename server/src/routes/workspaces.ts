import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getIO } from "../lib/socket";

const router = Router();
router.use(authenticate);

// ─── Validation Schemas ──────────────────────────────────────────────

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).optional(),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

// ─── Helpers ─────────────────────────────────────────────────────────

async function getMemberRole(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return member?.role ?? null;
}

// ─── Routes ──────────────────────────────────────────────────────────

// List all workspaces the user is a member of
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: { some: { userId: req.userId } },
      },
      include: {
        _count: { select: { members: true, boards: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(workspaces);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new workspace
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createWorkspaceSchema.parse(req.body);

    const workspace = await prisma.workspace.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() ?? "",
        ownerId: req.userId!,
        members: {
          create: {
            userId: req.userId!,
            role: "ADMIN",
          },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { members: true, boards: true } },
      },
    });

    getIO()?.emit("workspace:created", workspace);
    res.status(201).json(workspace);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get workspace details with members and boards
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const role = await getMemberRole(req.params.id, req.userId!);
    if (!role) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        boards: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json(workspace);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update workspace (name, description) - ADMIN only
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateWorkspaceSchema.parse(req.body);

    const role = await getMemberRole(req.params.id, req.userId!);
    if (!role) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can update the workspace" });
    }

    const updated = await prisma.workspace.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description.trim() }),
      },
    });

    getIO()?.to(`workspace:${req.params.id}`).emit("workspace:updated", updated);
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete workspace - owner only
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
    });
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    if (workspace.ownerId !== req.userId) {
      return res.status(403).json({ error: "Only the owner can delete the workspace" });
    }

    await prisma.workspace.delete({ where: { id: req.params.id } });

    getIO()?.to(`workspace:${req.params.id}`).emit("workspace:deleted", {
      id: req.params.id,
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Invite a member by email - ADMIN only
router.post("/:id/members", async (req: AuthRequest, res: Response) => {
  try {
    const data = inviteMemberSchema.parse(req.body);

    const role = await getMemberRole(req.params.id, req.userId!);
    if (!role) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can invite members" });
    }

    // Look up the user by email
    const invitedUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!invitedUser) {
      return res.status(404).json({ error: "User not found with that email" });
    }

    // Check if user is already a member
    const existing = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: req.params.id,
          userId: invitedUser.id,
        },
      },
    });
    if (existing) {
      return res.status(409).json({ error: "User is already a member of this workspace" });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
    });

    // Create the membership and notification in a transaction
    const [member, notification] = await prisma.$transaction(async (tx) => {
      const newMember = await tx.workspaceMember.create({
        data: {
          workspaceId: req.params.id,
          userId: invitedUser.id,
          role: data.role ?? "MEMBER",
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      const newNotification = await tx.notification.create({
        data: {
          type: "TASK_ASSIGNED",
          content: `You have been invited to workspace "${workspace!.name}"`,
          userId: invitedUser.id,
        },
      });

      return [newMember, newNotification] as const;
    });

    getIO()?.to(`workspace:${req.params.id}`).emit("workspace:member-added", member);
    getIO()?.to(`user:${invitedUser.id}`).emit("notification:created", notification);
    res.status(201).json(member);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update member role - ADMIN only
router.patch("/:id/members/:memberId", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateMemberRoleSchema.parse(req.body);

    const role = await getMemberRole(req.params.id, req.userId!);
    if (!role) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can update member roles" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { id: req.params.memberId, workspaceId: req.params.id },
    });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Prevent changing the owner's role
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
    });
    if (member.userId === workspace!.ownerId) {
      return res.status(403).json({ error: "Cannot change the owner's role" });
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: req.params.memberId },
      data: { role: data.role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    getIO()?.to(`workspace:${req.params.id}`).emit("workspace:member-updated", updated);
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove a member - ADMIN only (cannot remove the owner)
router.delete("/:id/members/:memberId", async (req: AuthRequest, res: Response) => {
  try {
    const role = await getMemberRole(req.params.id, req.userId!);
    if (!role) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can remove members" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { id: req.params.memberId, workspaceId: req.params.id },
    });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Prevent removing the workspace owner
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
    });
    if (member.userId === workspace!.ownerId) {
      return res.status(403).json({ error: "Cannot remove the workspace owner" });
    }

    await prisma.workspaceMember.delete({ where: { id: req.params.memberId } });

    getIO()?.to(`workspace:${req.params.id}`).emit("workspace:member-removed", {
      id: req.params.memberId,
      workspaceId: req.params.id,
      userId: member.userId,
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
