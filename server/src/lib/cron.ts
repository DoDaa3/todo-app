import cron from "node-cron";
import prisma from "./prisma";
import { sendDueDateReminderEmail } from "./email";

export function initCronJobs() {
  // Every day at 8:00 AM — check for tasks due within 24 hours
  cron.schedule("0 8 * * *", async () => {
    console.log("[CRON] Checking for upcoming due dates...");
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { gte: now, lte: tomorrow },
          column: { title: { not: "Done" } },
        },
        include: {
          assignees: { include: { user: true } },
          column: { include: { board: true } },
        },
      });

      for (const task of tasks) {
        for (const assignee of task.assignees) {
          // Create notification
          await prisma.notification.create({
            data: {
              type: "DUE_DATE_APPROACHING",
              content: `"${task.title}" is due ${task.dueDate!.toLocaleDateString()}`,
              userId: assignee.userId,
              relatedTaskId: task.id,
              relatedBoardId: task.column.boardId,
            },
          });

          // Send email
          try {
            await sendDueDateReminderEmail(
              assignee.user.email,
              assignee.user.name,
              task.title,
              task.dueDate!
            );
          } catch (emailErr) {
            console.error(`Failed to send due date email to ${assignee.user.email}:`, emailErr);
          }
        }
      }

      console.log(`[CRON] Processed ${tasks.length} tasks with upcoming due dates`);
    } catch (err) {
      console.error("[CRON] Error checking due dates:", err);
    }
  });

  // Every hour — check for sprints starting today
  cron.schedule("0 * * * *", async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const sprints = await prisma.sprint.findMany({
        where: {
          status: "PLANNING",
          startDate: { gte: today, lt: tomorrow },
        },
        include: {
          board: {
            include: {
              user: true,
            },
          },
        },
      });

      for (const sprint of sprints) {
        await prisma.notification.create({
          data: {
            type: "SPRINT_STARTING",
            content: `Sprint "${sprint.name}" is starting today`,
            userId: sprint.board.userId,
            relatedBoardId: sprint.boardId,
          },
        });
      }
    } catch (err) {
      console.error("[CRON] Error checking sprint starts:", err);
    }
  });

  console.log("[CRON] Scheduled jobs initialized");
}
