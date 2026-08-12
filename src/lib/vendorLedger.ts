import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

type TxClient = Prisma.TransactionClient | typeof prisma

/**
 * Multi-vendor order splitting + vendor payout ledger.
 *
 * A checkout can contain products from several companies. Each (checkout,
 * company) pair gets one VendorOrder so a company can track/update
 * fulfillment for just their own items. Every sale is recorded as a
 * VendorLedgerEntry — a company's payout balance is always the SUM of its
 * ledger rows, never a mutable stored number.
 */

// Find or create the VendorOrder for a (checkout, company) pair.
export async function getOrCreateVendorOrder(
  checkoutId: number,
  companyId: number,
  client: TxClient = prisma
) {
  return client.vendorOrder.upsert({
    where: { checkoutId_companyId: { checkoutId, companyId } },
    update: {},
    create: { checkoutId, companyId },
  })
}

// Create/update the SALE ledger row for a checkout item. Call this whenever
// an item's purchasedPrice (or quantity) is set or changed — at checkout
// time and whenever a company/admin edits the purchased price afterwards.
export async function upsertVendorSaleEntry({
  companyId,
  checkoutItemId,
  vendorOrderId,
  purchasedPrice,
  quantity,
}: {
  companyId: number
  checkoutItemId: number
  vendorOrderId?: number | null
  purchasedPrice: number | null | undefined
  quantity: number
}) {
  try {
    // No known cost yet — nothing owed to the vendor for this item, so no
    // ledger row should exist.
    if (purchasedPrice === null || purchasedPrice === undefined) {
      await prisma.vendorLedgerEntry.deleteMany({
        where: { checkoutItemId, type: 'SALE' },
      })
      return null
    }

    const amount = purchasedPrice * quantity

    return await prisma.vendorLedgerEntry.upsert({
      where: { checkoutItemId },
      update: { amount, companyId, vendorOrderId: vendorOrderId ?? undefined },
      create: {
        companyId,
        checkoutItemId,
        vendorOrderId: vendorOrderId ?? undefined,
        type: 'SALE',
        amount,
      },
    })
  } catch (error) {
    console.error('[VendorLedger] Failed to upsert sale entry:', error)
    return null
  }
}

// A company's current payout balance — always derived, never stored.
export async function getCompanyBalance(companyId: number) {
  const result = await prisma.vendorLedgerEntry.aggregate({
    where: { companyId },
    _sum: { amount: true },
  })
  return result._sum.amount || 0
}

// Record an admin payout to a company. Reduces the derived balance by
// creating a negative ledger row — the underlying SALE rows are untouched,
// so the full history stays reconcilable.
export async function recordVendorPayout({
  companyId,
  amount,
  notes,
}: {
  companyId: number
  amount: number
  notes?: string
}) {
  return prisma.vendorLedgerEntry.create({
    data: {
      companyId,
      type: 'PAYOUT',
      amount: -Math.abs(amount),
      notes: notes || null,
    },
  })
}
