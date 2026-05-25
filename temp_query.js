const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const userPrefs = await prisma.userPreference.findMany();
  console.log('--- USER PREFS ---');
  console.log(JSON.stringify(userPrefs, null, 2));

  const projects = await prisma.novelPromotionProject.findMany();
  console.log('--- PROJECTS ---');
  console.log(JSON.stringify(projects, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
