const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const targetModel = 'google::gemini-3.1-flash-image-preview';
  const newModel = 'apiyi::gemini-3.1-flash-image-preview';

  await prisma.novelPromotionProject.updateMany({
    where: { characterModel: targetModel },
    data: { characterModel: newModel }
  });
  await prisma.novelPromotionProject.updateMany({
    where: { locationModel: targetModel },
    data: { locationModel: newModel }
  });
  await prisma.novelPromotionProject.updateMany({
    where: { storyboardModel: targetModel },
    data: { storyboardModel: newModel }
  });
  await prisma.novelPromotionProject.updateMany({
    where: { editModel: targetModel },
    data: { editModel: newModel }
  });

  console.log('Database fixed!');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
