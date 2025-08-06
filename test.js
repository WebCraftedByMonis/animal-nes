// test.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

Promise.all([
  prisma.deliveryCharge.count(),
  prisma.checkout.count(),
  prisma.city.count()
]).then(([charges, checkouts, cities]) => {
  console.log('✅ DeliveryCharge table:', charges, 'records');
  console.log('✅ Checkout table:', checkouts, 'records');
  console.log('✅ City table:', cities, 'records');
  console.log('🎉 Everything is working!');
  process.exit(0);
}).catch(err => {
  console.log('❌ Error:', err.message);
  process.exit(1);
});