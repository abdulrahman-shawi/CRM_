'use server';

import { decrypt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { hasPermission, isAdmin } from '@/lib/utils';
import type { PermissionKey } from '@/lib/type';
import { revalidatePath } from 'next/cache';

async function getCurrentSessionUser() {
    try {
        const session = cookies().get('skynova')?.value;
        if (!session) return null;
        const decoded = await decrypt(session);
        if (!decoded?.userId) return null;
        return await prisma.user.findUnique({
            where: { id: String(decoded.userId) },
            include: { permission: true },
        });
    } catch {
        return null;
    }
}

function requirePermission(user: any, permission: PermissionKey) {
    if (!isAdmin(user) && !hasPermission(user, permission)) {
        throw new Error('غير مصرح لك بتنفيذ هذا الإجراء');
    }
}

function round(value: number) {
    return Number(Number(value).toFixed(2));
}

const RETURNABLE_STATUSES = new Set(['تم تسليم الطلب', 'تم التسليم', 'تم البيع', 'مدفوعة', 'قيد التوصيل']);

export async function getOrderReturns(orderId?: number) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewReturns'))) {
        return { success: false, error: 'غير مصرح لك بعرض المرتجعات' };
    }
    try {
        const where = orderId ? { orderId } : undefined;
        const returns = await prisma.orderReturn.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                order: { select: { id: true, orderNumber: true, finalAmount: true, status: true } },
                warehouse: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true } },
                        orderItem: { select: { id: true, price: true, discount: true } },
                    },
                },
            },
        });
        return { success: true, data: returns };
    } catch (error: any) {
        console.error('getOrderReturns error:', error);
        return { success: false, error: 'تعذر تحميل المرتجعات' };
    }
}

export async function createOrderReturn(data: {
    orderId: number;
    reason: 'DAMAGED' | 'WRONG_PRODUCT' | 'CUSTOMER_RETURN' | 'EXPIRED' | 'OTHER';
    reasonNotes?: string;
    warehouseId?: number;
    items: Array<{ orderItemId: number; quantity: number }>;
}) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'addReturns');

    try {
        const orderId = Number(data.orderId);
        if (!orderId) return { success: false, error: 'الطلب مطلوب' };
        if (!Array.isArray(data.items) || data.items.length === 0) return { success: false, error: 'يجب إرجاع صنف واحد على الأقل' };

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: { select: { id: true, name: true } } } }, warehouse: true },
        });
        if (!order) return { success: false, error: 'الطلب غير موجود' };
        if (!RETURNABLE_STATUSES.has(order.status)) {
            return { success: false, error: 'لا يمكن إرجاع طلب بهذه الحالة' };
        }

        const warehouseId = data.warehouseId ? Number(data.warehouseId) : order.warehouseId || undefined;

        const result = await prisma.$transaction(async (tx) => {
            let refundAmount = 0;
            const returnItems = [];

            for (const entry of data.items) {
                const orderItem = order.items.find((i) => i.id === Number(entry.orderItemId));
                if (!orderItem) continue;
                const quantity = Math.min(Number(entry.quantity || 0), orderItem.quantity);
                if (quantity <= 0) continue;
                const effectivePrice = Math.max(0, orderItem.price - (orderItem.discount || 0));
                refundAmount += effectivePrice * quantity;

                returnItems.push({
                    orderItemId: orderItem.id,
                    productId: orderItem.productId,
                    quantity,
                    price: effectivePrice,
                });

                if (warehouseId) {
                    const stock = await tx.productStock.findUnique({
                        where: { productId_warehouseId: { productId: orderItem.productId, warehouseId } },
                    });
                    if (stock) {
                        await tx.productStock.update({
                            where: { id: stock.id },
                            data: { quantity: stock.quantity + quantity },
                        });
                    } else {
                        await tx.productStock.create({
                            data: {
                                productId: orderItem.productId,
                                warehouseId,
                                quantity,
                            },
                        });
                    }
                }

                await tx.stockMovement.create({
                    data: {
                        productId: orderItem.productId,
                        warehouseId: warehouseId || order.warehouseId || 1,
                        userId: user.id,
                        quantity,
                        type: 'RETURN',
                        reason: `مرتجع طلب #${order.orderNumber} - ${data.reason}`,
                    },
                });
            }

            if (returnItems.length === 0) throw new Error('لا يوجد أصناف صالحة للإرجاع');

            const orderReturn = await tx.orderReturn.create({
                data: {
                    orderId,
                    reason: data.reason,
                    reasonNotes: data.reasonNotes || null,
                    refundAmount: round(refundAmount),
                    warehouseId,
                    items: { create: returnItems },
                },
                include: { items: true },
            });

            await tx.order.update({
                where: { id: orderId },
                data: { remainingAmount: round(Math.max(0, order.finalAmount - refundAmount - order.paidAmount)) },
            });

            return orderReturn;
        });

        revalidatePath('/dashboard/returns');
        revalidatePath('/dashboard/orders');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('createOrderReturn error:', error);
        return { success: false, error: error.message || 'تعذر إنشاء المرتجع' };
    }
}

export async function deleteOrderReturn(id: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'deleteReturns');

    try {
        await prisma.$transaction(async (tx) => {
            const orderReturn = await tx.orderReturn.findUnique({
                where: { id },
                include: { items: true, order: true },
            });
            if (!orderReturn) throw new Error('المرتجع غير موجود');

            for (const item of orderReturn.items) {
                if (orderReturn.warehouseId) {
                    const stock = await tx.productStock.findUnique({
                        where: { productId_warehouseId: { productId: item.productId, warehouseId: orderReturn.warehouseId } },
                    });
                    if (stock) {
                        await tx.productStock.update({
                            where: { id: stock.id },
                            data: { quantity: Math.max(0, stock.quantity - item.quantity) },
                        });
                    }
                }
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: orderReturn.warehouseId || orderReturn.order.warehouseId || 1,
                        userId: user.id,
                        quantity: item.quantity,
                        type: 'OUT',
                        reason: `حذف مرتجع طلب #${orderReturn.order.orderNumber}`,
                    },
                });
            }

            await tx.orderReturn.delete({ where: { id } });

            const order = await tx.order.findUnique({
                where: { id: orderReturn.orderId },
                include: { returns: { select: { refundAmount: true } }, payments: { select: { amount: true } } },
            });
            if (order) {
                const totalRefunds = order.returns.reduce((sum, r) => sum + Number(r.refundAmount), 0);
                const totalPayments = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                await tx.order.update({
                    where: { id: order.id },
                    data: { remainingAmount: round(Math.max(0, order.finalAmount - totalRefunds - totalPayments)) },
                });
            }
        });

        revalidatePath('/dashboard/returns');
        revalidatePath('/dashboard/orders');
        return { success: true };
    } catch (error: any) {
        console.error('deleteOrderReturn error:', error);
        return { success: false, error: error.message || 'تعذر حذف المرتجع' };
    }
}
