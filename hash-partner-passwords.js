// scripts/hash-partner-passwords.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = 'Animalwellness2024!'; // Default password for all partners

  try {
    console.log('🔄 Starting password hashing process...\n');

    // Fetch all partners
    const partners = await prisma.partner.findMany({
      select: {
        id: true,
        partnerEmail: true,
        partnerName: true,
        password: true,
      },
    });

    if (partners.length === 0) {
      console.log('⚠️  No partners found in the database.');
      return;
    }

    console.log(`📊 Found ${partners.length} partner(s) in the database.\n`);

    // Hash the default password once
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    console.log('✅ Password hashed successfully!\n');

    let updatedCount = 0;
    let failedCount = 0;

    // Update each partner's password (convert ALL passwords to the default)
    for (const partner of partners) {
      try {
        await prisma.partner.update({
          where: { id: partner.id },
          data: { password: hashedPassword },
        });

        console.log(`✅ Updated ${partner.partnerName} (${partner.partnerEmail})`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update ${partner.partnerName} (${partner.partnerEmail}):`, error.message);
        failedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Total Partners: ${partners.length}`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log('='.repeat(60));
    console.log('\n🎉 Password hashing process completed!');
    console.log('\n📌 Partner Login Credentials:');
    console.log('   📧 Email: [Partner Email]');
    console.log('   🔑 Password: Animalwellness2024!');
    console.log('   🔗 Login URL: /partner/login');

  } catch (error) {
    console.error('\n❌ Error during password hashing:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
