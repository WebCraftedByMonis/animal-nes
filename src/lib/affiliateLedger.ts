import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

type TxClient = Prisma.TransactionClient | typeof prisma

/**
 * Affiliate commission ledger + rate resolution.
 *
 * Commission rates are never hardcoded in source — they come from the
 * dashboard-editable AffiliateSettings singleton, with optional overrides
 * per product (AffiliateProduct) and per affiliate (AffiliatePartner).
 *
 * An affiliate's payable balance is always the SUM of AffiliateCommission
 * rows — never a mutable stored number (mirrors VendorLedgerEntry / vendorLedger.ts).
 */

export type CommissionRule = {
  type: 'PERCENTAGE' | 'FIXED'
  value: number
}

// Ensures the singleton settings row always exists and returns it. This is
// the dashboard's source of truth for default commission behavior.
export async function getAffiliateSettings(client: TxClient = prisma) {
  return client.affiliateSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })
}

// Resolve which commission rule applies to a given product for a given
// affiliate. Returns null if the product has been explicitly disabled for
// the affiliate program.
export async function resolveCommissionRule(
  productId: number,
  affiliatePartnerId: number,
  client: TxClient = prisma
): Promise<CommissionRule | null> {
  const [affiliateProduct, affiliatePartner, settings] = await Promise.all([
    client.affiliateProduct.findUnique({ where: { productId } }),
    client.affiliatePartner.findUnique({
      where: { id: affiliatePartnerId },
      select: { commissionType: true, commissionValue: true },
    }),
    getAffiliateSettings(client),
  ])

  if (affiliateProduct && !affiliateProduct.enabled) return null

  if (affiliateProduct?.commissionType && affiliateProduct.commissionValue != null) {
    return { type: affiliateProduct.commissionType, value: affiliateProduct.commissionValue }
  }

  if (affiliatePartner?.commissionType && affiliatePartner.commissionValue != null) {
    return { type: affiliatePartner.commissionType, value: affiliatePartner.commissionValue }
  }

  return { type: settings.defaultCommissionType, value: settings.defaultCommissionValue }
}

function applyRule(rule: CommissionRule, lineAmount: number): number {
  if (rule.type === 'PERCENTAGE') return (lineAmount * rule.value) / 100
  return rule.value // FIXED — flat amount per eligible line item
}

// Sums commission across an order's cart line items for the affiliate that
// gets attribution for this checkout. Items whose product has affiliate
// tracking disabled are skipped.
export async function calculateOrderCommission(
  items: Array<{ product?: { id: number } | null; quantity: number; finalPrice: number }>,
  affiliatePartnerId: number,
  client: TxClient = prisma
): Promise<number> {
  let total = 0
  for (const item of items) {
    if (!item.product) continue
    const rule = await resolveCommissionRule(item.product.id, affiliatePartnerId, client)
    if (!rule) continue
    total += applyRule(rule, item.quantity * item.finalPrice)
  }
  return Math.round(total * 100) / 100
}

// An affiliate's current payable balance — always derived, never stored.
export async function getAffiliateBalance(affiliatePartnerId: number, client: TxClient = prisma) {
  const result = await client.affiliateCommission.aggregate({
    where: { affiliatePartnerId },
    _sum: { amount: true },
  })
  return result._sum.amount || 0
}

// Record an admin payout to an affiliate. Reduces the derived balance with a
// negative ledger row — EARNED rows are untouched, so history stays reconcilable.
export async function recordAffiliatePayout({
  affiliatePartnerId,
  amount,
  notes,
}: {
  affiliatePartnerId: number
  amount: number
  notes?: string
}) {
  return prisma.affiliateCommission.create({
    data: {
      affiliatePartnerId,
      type: 'PAYOUT',
      amount: -Math.abs(amount),
      notes: notes || null,
    },
  })
}

// Manual correction, e.g. reversing a refunded/cancelled order's commission.
export async function recordAffiliateAdjustment({
  affiliatePartnerId,
  amount,
  notes,
}: {
  affiliatePartnerId: number
  amount: number
  notes?: string
}) {
  return prisma.affiliateCommission.create({
    data: {
      affiliatePartnerId,
      type: 'ADJUSTMENT',
      amount,
      notes: notes || null,
    },
  })
}
