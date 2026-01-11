/**
 * Migration Script: Add Default Passwords to Existing Companies
 *
 * This script adds the default password "Animalwellnesscompany" to all existing
 * companies that don't have a password set.
 *
 * Usage: node add-company-passwords.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Animalwellnesscompany';

async function addPasswordsToCompanies() {
  try {
    console.log('🚀 Starting migration: Adding default passwords to companies...\n');

    // Find all companies without a password
    const companiesWithoutPassword = await prisma.company.findMany({
      where: {
        OR: [
          { password: null },
          { password: '' }
        ]
      },
      select: {
        id: true,
        companyName: true,
        email: true,
      }
    });

    if (companiesWithoutPassword.length === 0) {
      console.log('✅ All companies already have passwords set!');
      return;
    }

    console.log(`📊 Found ${companiesWithoutPassword.length} companies without passwords:\n`);

    // Hash the default password once
    console.log('🔐 Hashing default password...');
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    console.log('✅ Password hashed successfully\n');

    // Update each company
    let successCount = 0;
    let errorCount = 0;

    for (const company of companiesWithoutPassword) {
      try {
        await prisma.company.update({
          where: { id: company.id },
          data: { password: hashedPassword }
        });

        console.log(`✅ Updated: ${company.companyName || 'Unnamed Company'} (ID: ${company.id})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to update company ID ${company.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${successCount} companies`);
    console.log(`❌ Failed: ${errorCount} companies`);
    console.log(`📝 Default password set: "${DEFAULT_PASSWORD}"`);
    console.log('='.repeat(60));
    console.log('\n✨ Migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addPasswordsToCompanies()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
