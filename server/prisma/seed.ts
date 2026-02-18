import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@kanban.app" },
    update: {},
    create: {
      email: "demo@kanban.app",
      name: "Demo User",
      password: hashedPassword,
      emailVerified: true,
    },
  });

  const board = await prisma.board.create({
    data: {
      title: "My First Project",
      userId: user.id,
      columns: {
        create: [
          {
            title: "To Do",
            position: 0,
            tasks: {
              create: [
                {
                  title: "Set up project repository",
                  description: "Initialize git repo and set up CI/CD pipeline",
                  priority: "HIGH",
                  position: 0,
                },
                {
                  title: "Design database schema",
                  description: "Plan out the tables and relationships",
                  priority: "MEDIUM",
                  position: 1,
                  dueDate: new Date("2026-03-01"),
                },
              ],
            },
          },
          {
            title: "Doing",
            position: 1,
            tasks: {
              create: [
                {
                  title: "Build authentication",
                  description: "Implement JWT-based login and signup",
                  priority: "URGENT",
                  position: 0,
                },
              ],
            },
          },
          {
            title: "Done",
            position: 2,
            tasks: {
              create: [
                {
                  title: "Project kickoff meeting",
                  description: "Align on goals and timeline",
                  priority: "LOW",
                  position: 0,
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Seeded user: ${user.email}`);
  console.log(`Seeded board: ${board.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
