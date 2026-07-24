// server/move.ts
"use server"
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const resolveWarehouseLocation = (warehouse: {
  location?: string | null;
  country?: { name?: string | null } | null;
}) => String(warehouse.country?.name || warehouse.location || "").trim();

export async function getInventoryData() {
  const [stocks, products, warehouses, countries] = await Promise.all([
    prisma.productStock.findMany({
      include: {
        product: { select: { id: true, name: true, modelNumber: true } },
        warehouse: {
          select: {
            id: true,
            name: true,
            location: true,
            country: { select: { name: true } },
          }
        }
      }
    }),
    prisma.product.findMany({ select: { id: true, name: true, modelNumber: true } }),
    prisma.warehouse.findMany({
      select: {
        id: true,
        name: true,
        location: true,
        country: { select: { name: true } },
      }
    }),
    prisma.country.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    stocks: stocks.map((stock) => ({
      ...stock,
      warehouse: {
        ...stock.warehouse,
        location: resolveWarehouseLocation(stock.warehouse),
      },
    })),
    products,
    warehouses: warehouses.map((warehouse) => ({
      ...warehouse,
      location: resolveWarehouseLocation(warehouse),
    })),
    countries,
  };
}

export async function createMovementAction(data: any) {
  try {
    const items = Array.isArray(data.items) && data.items.length > 0
      ? data.items
      : data.productId
        ? [{
            productId: Number(data.productId),
            quantity: Number(data.quantity),
          }]
        : [];

    if (items.length === 0) {
      return { success: false, error: "يرجى إضافة منتج واحد على الأقل" };
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const productId = Number(item.productId);
        const qty = Number(item.quantity);

        if (!Number.isInteger(productId) || productId <= 0 || !Number.isFinite(qty) || qty <= 0) {
          throw new Error("بيانات المنتج أو الكمية غير صالحة");
        }

        // --- حالة الجرد (ADJUSTMENT) ---
        if (data.type === 'ADJUSTMENT') {
          await tx.productStock.upsert({
            where: { productId_warehouseId: { productId, warehouseId: data.warehouseId } },
            update: { quantity: qty },
            create: { productId, warehouseId: data.warehouseId, quantity: qty }
          });
        } 
        // --- حالة التحويل (TRANSFER) ---
        else if (data.type === 'TRANSFER' && data.targetWarehouseId) {
          // 1. خصم من المصدر
          await tx.productStock.upsert({
            where: { productId_warehouseId: { productId, warehouseId: data.warehouseId } },
            update: { quantity: { decrement: qty } },
            create: { productId, warehouseId: data.warehouseId, quantity: -qty }
          });
          // 2. إضافة للوجهة
          await tx.productStock.upsert({
            where: { productId_warehouseId: { productId, warehouseId: data.targetWarehouseId } },
            update: { quantity: { increment: qty } },
            create: { productId, warehouseId: data.targetWarehouseId, quantity: qty }
          });
        } 
        // --- حالة توريد (IN) أو صرف (OUT) ---
        else {
          const adjustment = data.type === 'OUT' ? -qty : qty;
          await tx.productStock.upsert({
            where: { productId_warehouseId: { productId, warehouseId: data.warehouseId } },
            update: { quantity: { increment: adjustment } },
            create: { productId, warehouseId: data.warehouseId, quantity: adjustment }
          });
        }

        // سجل الحركة التاريخي
        await tx.stockMovement.create({
          data: {
            productId,
            warehouseId: data.warehouseId,
            quantity: qty,
            type: data.type,
            reason: data.reason || "",
          }
        });
      }
    });

    revalidatePath('/dashboard/inventories');
    return { success: true };
  } catch (error: any) {
    console.error("Movement error:", error);
    return { success: false, error: error?.message || "فشلت العملية" };
  }
}