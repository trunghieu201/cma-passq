import { prisma } from "../src/lib/db";

async function main() {
  console.log("Checking database connection...");
  const userCount = await prisma.user.count();
  const sectionCount = await prisma.section.count();
  const questionCount = await prisma.question.count();
  const choiceCount = await prisma.choice.count();
  const mockCount = await prisma.mockExam.count();
  const cbqCount = await prisma.cbqCase.count();
  const formulaCount = await prisma.formula.count();
  console.log(`Database operational!`);
  console.log(`  Users: ${userCount}`);
  console.log(`  Sections: ${sectionCount}`);
  console.log(`  Questions: ${questionCount}`);
  console.log(`  Choices: ${choiceCount}`);
  console.log(`  Mock Exams: ${mockCount}`);
  console.log(`  CBQ Cases: ${cbqCount}`);
  console.log(`  Formulas: ${formulaCount}`);
}

main()
  .catch((e) => {
    console.error("Database connection failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
