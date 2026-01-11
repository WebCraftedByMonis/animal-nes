const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCompanies() {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        companyName: true,
        email: true,
        password: true,
      }
    });

    console.log('\n📊 Database Status:');
    console.log('='.repeat(60));
    console.log(`Total companies in database: ${companies.length}\n`);

    if (companies.length > 0) {
      console.log('Companies:');
      companies.forEach(company => {
        console.log(`  - ${company.companyName || 'Unnamed'} (${company.email || 'No email'})`);
        console.log(`    Has password: ${company.password ? 'Yes ✓' : 'No ✗'}`);
      });
    } else {
      console.log('No companies found in database.');
      console.log('\nℹ️  The database was reset with --force-reset flag.');
      console.log('   You can add new companies through the form at /addCompany');
    }
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompanies();
