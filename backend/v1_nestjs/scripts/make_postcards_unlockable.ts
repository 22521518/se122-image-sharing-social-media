
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating locked postcards to have past unlock date...');
  const result = await prisma.postcard.updateMany({
    where: {
      status: 'LOCKED',
      unlockDate: { not: null },
    },
    data: {
      unlockDate: new Date('2020-01-01'), // Set to past
    },
  });
  console.log(`Updated ${result.count} postcards.`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
