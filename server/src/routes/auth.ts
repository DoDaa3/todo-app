import { Router, Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { sendVerificationEmail, sendEmailChangeVerification } from "../lib/email";

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function generateToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "7d" });
}

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const data = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        emailVerified: false,
        verificationToken,
      },
    });

    // Create a default board with 4 columns for new users
    await prisma.board.create({
      data: {
        title: "My First Board",
        userId: user.id,
        columns: {
          create: [
            { title: "To Do", position: 0 },
            { title: "In Progress", position: 1 },
            { title: "In Review", position: 2 },
            { title: "Done", position: 3 },
          ],
        },
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (emailErr) {
      console.error("Failed to send verification email:", emailErr);
    }

    res.status(201).json({
      message:
        "Account created! Please check your email to verify your account before signing in.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Email verification endpoint
router.get("/verify/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification link" });
    }

    if (user.emailVerified) {
      return res.json({ message: "Email already verified. You can sign in." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    res.json({ message: "Email verified! You can now sign in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Email change verification endpoint
router.get("/verify-email-change/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findUnique({
      where: { emailChangeToken: token },
    });

    if (!user || !user.pendingEmail) {
      return res.status(400).json({ error: "Invalid or expired email change link" });
    }

    // Check if the pending email is still available
    const existingEmail = await prisma.user.findUnique({ where: { email: user.pendingEmail } });
    if (existingEmail) {
      return res.status(409).json({ error: "This email is now taken by another account" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        emailChangeToken: null,
      },
    });

    res.json({ message: "Email changed successfully! You can continue using your account." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error:
          "Please verify your email before signing in. Check your inbox for the verification link.",
      });
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, avatarUrl: true, darkMode: true, pendingEmail: true },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update dark mode preference
router.patch("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { darkMode } = req.body;
    if (typeof darkMode !== "boolean") {
      return res.status(400).json({ error: "Invalid darkMode value" });
    }
    await prisma.user.update({
      where: { id: req.userId },
      data: { darkMode },
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update profile (name, email, avatar)
router.patch("/profile", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, avatarUrl } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    // Check if email is changing and already in use
    const currentUser = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const emailChanged = email.trim() !== currentUser.email;

    if (emailChanged) {
      const existingEmail = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (existingEmail) {
        return res.status(409).json({ error: "Email already in use" });
      }
    }

    if (name.trim() !== currentUser.name) {
      const existingName = await prisma.user.findFirst({ where: { name: name.trim(), id: { not: req.userId } } });
      if (existingName) {
        return res.status(409).json({ error: "Name already taken" });
      }
    }

    // If email is changing, send verification to the new email instead of updating directly
    let pendingEmail: string | null = null;
    if (emailChanged) {
      const emailChangeToken = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: req.userId },
        data: {
          name: name.trim(),
          avatarUrl: avatarUrl || null,
          pendingEmail: email.trim(),
          emailChangeToken,
        },
      });
      try {
        await sendEmailChangeVerification(email.trim(), name.trim(), emailChangeToken);
      } catch (emailErr) {
        console.error("Failed to send email change verification:", emailErr);
      }
      pendingEmail = email.trim();
    } else {
      await prisma.user.update({
        where: { id: req.userId },
        data: {
          name: name.trim(),
          avatarUrl: avatarUrl || null,
        },
      });
    }

    const updated = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    res.json({ user: updated, pendingEmail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Change password
router.patch("/password", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both current and new password are required" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete account
router.delete("/account", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Delete user and all related data (cascading deletes handled by Prisma schema)
    await prisma.user.delete({ where: { id: req.userId } });

    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
