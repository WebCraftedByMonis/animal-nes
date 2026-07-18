const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.productImage.count();
  const cloudinary = await prisma.productImage.count({ where: { url: { contains: 'cloudinary' } } });
  const vps = await prisma.productImage.count({ where: { url: { contains: 'animalwellness.shop' } } });
  const external = total - cloudinary - vps;

  console.log('Total images:', total);
  console.log('Cloudinary:', cloudinary);
  console.log('Already on VPS:', vps);
  console.log('External (need migration):', external);

  const samples = await prisma.productImage.findMany({
    where: {
      NOT: [
        { url: { contains: 'cloudinary' } },
        { url: { contains: 'animalwellness.shop' } },
      ]
    },
    select: { url: true },
    take: 10,
  });

  console.log('\nSample external URLs:');
  samples.forEach(s => console.log(s.url));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
