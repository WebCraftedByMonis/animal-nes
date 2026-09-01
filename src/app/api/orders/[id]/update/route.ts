import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateTransactionProfit, createProductSaleTransaction } from '@/lib/autoTransaction';
import { getOrCreateVendorOrder, upsertVendorSaleEntry } from '@/lib/vendorLedger';

/**
 * Resolve which customer an edited order should belong to.
 *   - userId given            → that account (verified)
 *   - name given, no userId    → if the order's current customer is a guest
 *                                (no email / no password) just rename them;
 *                                otherwise reuse/create a lightweight guest
 *                                with that name, same as the manual-order flow.
 * Returns the userId to connect, or null to leave the customer untouched.
 */
async function resolveEditedCustomer(
  currentUserId: string,
  userId: string | undefined,
  customerName: string | undefined,
  phone: string | undefined,
): Promise<string | null> {
  if (userId && userId !== currentUserId) {
    const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) throw new Error(`Customer ${userId} not found`);
    return userId;
  }

  const typedName = typeof customerName === 'string' ? customerName.trim() : '';
  if (userId || !typedName) return null;

  const current = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, name: true, email: true, password: true },
  });

  // Current customer is already a guest row — just correct the name/phone in place.
  if (current && !current.email && !current.password) {
    if (current.name === typedName && !phone) return null;
    await prisma.user.update({
      where: { id: current.id },
      data: { name: typedName, ...(phone ? { PhoneNumber: phone } : {}) },
    });
    return null;
  }

  // Real account being replaced with a name-only guest — reuse or create one.
  const existingGuest = await prisma.user.findFirst({
    where: { name: typedName, email: null, password: null },
    select: { id: true },
  });
  if (existingGuest) {
    if (phone) {
      await prisma.user.update({ where: { id: existingGuest.id }, data: { PhoneNumber: phone } }).catch(() => {});
    }
    return existingGuest.id;
  }
  const guest = await prisma.user.create({
    data: { name: typedName, PhoneNumber: phone || null },
    select: { id: true },
  });
  return guest.id;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);
  if (Number.isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
  }

  const body = await req.json();
  const {
    paymentMethod,
    items = [],
    removedItemIds = [],
    shipmentcharges,
    city,
    province,
    address,
    shippingAddress,
    status,
    userId,
    customerName,
  } = body;

  try {
    const order = await prisma.checkout.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // ── Customer ───────────────────────────────────────────────────
    let reassignUserId: string | null = null;
    try {
      reassignUserId = await resolveEditedCustomer(
        order.userId,
        userId,
        customerName,
        typeof shippingAddress === 'string' ? shippingAddress.trim() : undefined,
      );
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid customer' }, { status: 400 });
    }

    const targetStatus: string = status || order.status;
    const txStatus: 'PENDING' | 'COMPLETED' = targetStatus === 'delivered' ? 'COMPLETED' : 'PENDING';

    // ── Removed items ──────────────────────────────────────────────
    const removedIds: number[] = (removedItemIds as unknown[])
      .map((v) => Number(v))
      .filter((n) => !Number.isNaN(n));
    if (removedIds.length > 0) {
      // VendorLedgerEntry.checkoutItemId is SetNull on delete, so a dangling
      // SALE row would keep inflating the vendor balance — clear it first.
      await prisma.vendorLedgerEntry.deleteMany({ where: { checkoutItemId: { in: removedIds } } });
      // Transaction has no FK to CheckoutItem — remove its finance rows by hand.
      await prisma.transaction.deleteMany({ where: { checkoutItemId: { in: removedIds } } });
      await prisma.checkoutItem.deleteMany({ where: { id: { in: removedIds }, checkoutId: orderId } });
    }

    // ── Existing + new items ───────────────────────────────────────
    for (const item of items) {
      const isNew = item.id === null || item.id === undefined;

      if (isNew) {
        if (!item.productId) continue;
        const created = await prisma.checkoutItem.create({
          data: {
            checkout: { connect: { id: orderId } },
            product: { connect: { id: Number(item.productId) } },
            ...(item.variantId ? { variant: { connect: { id: Number(item.variantId) } } } : {}),
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0,
            purchasedPrice: item.purchasedPrice != null ? Number(item.purchasedPrice) : null,
          },
          include: { product: { select: { companyId: true, productName: true } } },
        });

        const revenue = created.price * created.quantity;
        await createProductSaleTransaction(
          orderId,
          created.id,
          revenue,
          created.purchasedPrice ?? null,
          created.product?.productName || 'Product',
          paymentMethod,
          txStatus,
        );

        const companyId = created.product?.companyId;
        if (companyId) {
          const vendorOrder = await getOrCreateVendorOrder(orderId, companyId);
          await prisma.checkoutItem.update({
            where: { id: created.id },
            data: { vendorOrderId: vendorOrder.id },
          });
          await upsertVendorSaleEntry({
            companyId,
            checkoutItemId: created.id,
            vendorOrderId: vendorOrder.id,
            purchasedPrice: created.purchasedPrice,
            quantity: created.quantity,
          });
        }
        continue;
      }

      const updated = await prisma.checkoutItem.update({
        where: { id: Number(item.id) },
        data: {
          quantity: Number(item.quantity),
          price: Number(item.price),
          purchasedPrice: item.purchasedPrice !== undefined ? item.purchasedPrice : undefined,
          // Animal items keep variantId null; only touch it when a value is sent.
          ...(item.variantId !== undefined ? { variantId: item.variantId ? Number(item.variantId) : null } : {}),
        },
        include: { product: { select: { companyId: true } } },
      });

      const totalPrice = updated.price * updated.quantity;
      const totalCost =
        updated.purchasedPrice !== null && updated.purchasedPrice !== undefined
          ? updated.purchasedPrice * updated.quantity
          : null;
      await updateTransactionProfit(updated.id, totalPrice, totalCost);

      const companyId = updated.product?.companyId;
      if (companyId) {
        const vendorOrder = await getOrCreateVendorOrder(updated.checkoutId, companyId);
        if (!updated.vendorOrderId) {
          await prisma.checkoutItem.update({
            where: { id: updated.id },
            data: { vendorOrderId: vendorOrder.id },
          });
        }
        await upsertVendorSaleEntry({
          companyId,
          checkoutItemId: updated.id,
          vendorOrderId: vendorOrder.id,
          purchasedPrice: updated.purchasedPrice,
          quantity: updated.quantity,
        });
      }
    }

    // ── Status transition → keep finance transactions in sync ──────
    if (targetStatus === 'delivered' && order.status !== 'delivered') {
      await prisma.transaction.updateMany({
        where: { checkoutId: orderId, status: 'PENDING' },
        data: { status: 'COMPLETED' },
      });
    } else if (targetStatus !== 'delivered' && order.status === 'delivered') {
      await prisma.transaction.updateMany({
        where: { checkoutId: orderId, status: 'COMPLETED', isAutoGenerated: true },
        data: { status: 'PENDING' },
      });
    }

    // ── Recompute total from the final item set ────────────────────
    const finalItems = await prisma.checkoutItem.findMany({
      where: { checkoutId: orderId },
      select: { price: true, quantity: true },
    });
    const itemsTotal = finalItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipmentChargesValue =
      shipmentcharges !== undefined ? parseFloat(shipmentcharges) || 0 : undefined;
    const newTotal =
      itemsTotal + (shipmentChargesValue ?? 0);

    await prisma.checkout.update({
      where: { id: orderId },
      data: {
        ...(paymentMethod !== undefined ? { paymentMethod } : {}),
        ...(shipmentChargesValue !== undefined ? { shipmentcharges: shipmentChargesValue.toString() } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(province !== undefined ? { province: province || '' } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(shippingAddress !== undefined ? { shippingAddress } : {}),
        ...(status !== undefined ? { status: targetStatus } : {}),
        ...(reassignUserId ? { user: { connect: { id: reassignUserId } } } : {}),
        total: newTotal,
      },
    });

    return NextResponse.json({
      message: 'Order updated successfully',
      newTotal,
      shipmentcharges: shipmentChargesValue,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
