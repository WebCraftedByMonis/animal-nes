// fix-image-domain.js
// Rewrites stored upload URLs from one host to another in every table that
// keeps a file URL. Needed because uploads are stored as ABSOLUTE URLs
// (https://<host>/api/admin/media/serve/<file>), so when the app moved from
// animalwellness.shop to app.animalwellness.shop (Sept 20 2026) every image
// saved before the move kept pointing at the root domain — which now serves a
// WordPress site, so next/image got an HTML 404 back ("upstream response is
// invalid") and the images broke.
//
// Usage (on the VPS, from the project root):
//   node fix-image-domain.js            # dry run: counts per column, changes nothing
//   node fix-image-domain.js --apply    # rewrite, in one transaction
//
// Defaults move root/www -> app. When the app moves BACK to the root domain:
//   node fix-image-domain.js --from=app.animalwellness.shop --to=animalwellness.shop --apply
// Only URLs under /api/admin/media/serve/ are touched. Safe to re-run.

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const arg = (name, fallback) =>
  (process.argv.find(a => a.startsWith(`--${name}=`)) || '').split('=')[1] || fallback
const APPLY = process.argv.includes('--apply')
const FROM_HOSTS = arg('from', 'animalwellness.shop,www.animalwellness.shop').split(',')
const TO_HOST = arg('to', 'app.animalwellness.shop')
const PATH = '/api/admin/media/serve/'

const COLUMNS = [
  ['ProductImage', 'url'], ['ProductPdf', 'url'], ['CompanyImage', 'url'], ['PartnerImage', 'url'],
  ['PremiumPartnershipRequest', 'paymentScreenshot'], ['User', 'image'], ['Checkout', 'paymentScreenshotUrl'],
  ['newsImage', 'url'], ['newsPdf', 'url'], ['SellAnimalImage', 'url'], ['SellAnimalVideo', 'url'],
  ['ApplicantImage', 'url'], ['ApplicantCV', 'url'], ['JobFormImage', 'url'], ['BannerImage', 'url'],
  ['TraditionalJobPostImage', 'url'], ['PaymentInfo', 'screenshotUrl'], ['AdditionalConsultationFee', 'screenshotUrl'],
  ['Expense', 'receiptUrl'], ['MasterTrainerRegistration', 'screenshotUrl'], ['DynamicForm', 'thumbnailUrl'],
  ['FormSubmission', 'paymentScreenshotUrl'], ['FormSubmissionValue', 'fileUrl'], ['PartnerOrder', 'paymentScreenshot'],
  ['ProductSponsorship', 'paymentScreenshotUrl'],
  // Descriptions/HTML can embed uploaded images inline too.
  ['Product', 'description'],
]

const OLD_PREFIXES = FROM_HOSTS.flatMap(h => [`https://${h}${PATH}`, `http://${h}${PATH}`])
const NEW_PREFIX = `https://${TO_HOST}${PATH}`
// LIKE '%://host/...' so 'animalwellness.shop' never matches 'app.animalwellness.shop'.
const where = c => '(' + FROM_HOSTS.map(h => `\`${c}\` LIKE '%://${h}${PATH}%'`).join(' OR ') + ')'
const replaced = c => OLD_PREFIXES.reduce((acc, o) => `REPLACE(${acc}, '${o}', '${NEW_PREFIX}')`, `\`${c}\``)

async function main() {
  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'}: ${FROM_HOSTS.join(', ')} -> ${TO_HOST}\n`)
  let total = 0
  for (const [t, c] of COLUMNS) {
    const [{ n }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM \`${t}\` WHERE ${where(c)}`)
    if (Number(n)) console.log(`  ${t}.${c}: ${n}`)
    total += Number(n)
  }
  console.log(`\nTotal URLs on the old host: ${total}`)
  if (!APPLY) {
    console.log(total ? '\nNothing changed. Re-run with --apply to fix them.' : '\nNothing to fix.')
    return
  }
  if (!total) return

  let changed = 0
  await prisma.$transaction(async tx => {
    for (const [t, c] of COLUMNS) {
      changed += await tx.$executeRawUnsafe(`UPDATE \`${t}\` SET \`${c}\` = ${replaced(c)} WHERE ${where(c)}`)
    }
  }, { timeout: 120000 })
  console.log(`\nDone: ${changed} rows updated.`)
}

main()
  .catch(e => { console.error('FAILED (nothing was changed):', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
