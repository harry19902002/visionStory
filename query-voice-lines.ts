import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const lines = await prisma.novelPromotionVoiceLine.findMany({
    orderBy: [
      { updatedAt: 'desc' },
      { lineIndex: 'asc' }
    ],
    take: 10
  })

  console.log(JSON.stringify(lines, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
