const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

async function main() {
  const password = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log('Generated fresh hash:', hash);
  const selfCheck = await bcrypt.compare(password, hash);
  console.log('Self check:', selfCheck);

  const targets = ['./dev.db', './prisma/dev.db'];
  for (const t of targets) {
    const fullPath = path.resolve(t);
    const p = new PrismaClient({ datasources: { db: { url: `file:${fullPath}` } } });
    const user = await p.user.upsert({
      where: { email: 'student@passq.test' },
      update: { passwordHash: hash },
      create: {
        id: 'test-user-primary-001',
        email: 'student@passq.test',
        passwordHash: hash,
        fullName: 'Học Viên PassQ',
        role: 'STUDENT',
        targetExamDate: new Date(Date.now() + 60 * 86400000),
        weeklyHours: 10,
        targetScore: 400,
      },
    });
    console.log(`Updated ${t}: user id=${user.id}, email=${user.email}`);

    // Verify comparison directly
    const u = await p.user.findUnique({ where: { email: 'student@passq.test' } });
    const match = await bcrypt.compare(password, u.passwordHash);
    console.log(`Verification on ${t}: match = ${match}`);
    await p.$disconnect();
  }
}

main().catch(console.error);
