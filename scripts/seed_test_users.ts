import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "student@passq.test" },
    update: {},
    create: {
      id: "test-user-primary-001",
      email: "student@passq.test",
      passwordHash: "$2a$10$X7vQjXkYV9Z4X0l8F1k3weL7U9p0kY1Q3Z4X0l8F1k3weL7U9p0kY",
      fullName: "Học Viên PassQ",
      role: "STUDENT",
      targetExamDate: new Date(Date.now() + 60 * 86400000),
      weeklyHours: 10,
      targetScore: 400,
    },
  });

  await prisma.user.upsert({
    where: { email: "isolated_student@passq.test" },
    update: {},
    create: {
      id: "test-user-isolated-002",
      email: "isolated_student@passq.test",
      passwordHash: "$2a$10$X7vQjXkYV9Z4X0l8F1k3weL7U9p0kY1Q3Z4X0l8F1k3weL7U9p0kY",
      fullName: "Học Viên Cô Lập",
      role: "STUDENT",
      targetExamDate: new Date(Date.now() + 90 * 86400000),
      weeklyHours: 12,
      targetScore: 420,
    },
  });

  console.log("Seeded test users successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
