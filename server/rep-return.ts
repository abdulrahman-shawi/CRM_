'use server';

import { decrypt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { hasPermission, isAdmin } from '@/lib/utils';
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

async function getScopedUserIds(userId: string) {
    const rows = await prisma.user.findMany({
        where: { OR: [{ id: userId }, { parentId: userId }] },
        select: { id: true },
    });
    return rows.map((row) => row.id);
}

function round(value: number) {
    return Number(Number(value).toFixed(2));
}

const RETURNABLE_STATUSES = new Set(['تم تسليم الطلب', 'تم التسليم', 'تم البيع', 'مدفوعة', 'قيد التوصيل']);

// طلبات الجملة الخاصة بالمندوب (تُستخدم في شاشة مرتجعات المندوبين)
export async function getRepOrders(search?: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };

    const canAccess = isAdmin(user) || hasPermission(user, 'viewOrders') || hasPermission(user, 'viewWholesaleCustomers') || hasPermission(user, 'viewReturns');
    if (!canAccess) return { success: false, error: 'غير مصرح لك بعرض الطلبات' };

    try {
        const scopedIds = isAdmin(user) ? undefined : await getScopedUserIds(user.id);
        const where: any = {};
        if (scopedIds) where.userId = { in: scopedIds };

        if (search?.trim()) {
            const term = search.trim();
            where.OR = [
                { orderNumber: { contains: term, mode: 'insensitive' } },
                { wholesaleCustomer: { name: { contains: term, mode: 'insensitive' } } },
            ];
        }

        const orders = await prisma.wholesaleOrder.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
                id: true,
                orderNumber: true,
                status: true,
                finalAmount: true,
                wholesaleCustomer: { select: { id: true, name: true } },
                warehouse: { select: { id: true, name: true } },
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        price: true,
                        discount: true,
                        product: { select: { id: true, name: true } },
                    },
                },
            },
        });

        return { success: true, data: orders };
    } catch (error: any) {
        console.error('getRepOrders error:', error);
        return { success: false, error: 'تعذر تحميل الطلبات' };
    }
}

export async function getRepReturns(search?: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };

    const canAccess = isAdmin(user) || hasPermission(user, 'viewOrders') || hasPermission(user, 'viewWholesaleCustomers') || hasPermission(user, 'viewReturns');
    if (!canAccess) return { success: false, error: 'غير مصرح لك بعرض المرتجعات' };

    try {
        const scopedIds = isAdmin(user) ? undefined : await getScopedUserIds(user.id);
        const where: any = {};
        if (scopedIds) where.wholesaleOrder = { userId: { in: scopedIds } };

        if (search?.trim()) {
            const term = search.trim();
            where.OR = [
                { wholesaleOrder: { orderNumber: { contains: term, mode: 'insensitive' } } },
                { wholesaleOrder: { wholesaleCustomer: { name: { contains: term, mode: 'insensitive' } } } },
            ];
            if (scopedIds) where.wholesaleOrder.userId = { in: scopedIds };
        }

        const returns = await prisma.wholesaleOrderReturn.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                wholesaleOrder: { select: { id: true, orderNumber: true, wholesaleCustomer: { select: { id: true, name: true } } } },
                warehouse: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true } },
                        wholesaleOrderItem: { select: { id: true, price: true, discount: true } },
                    },
                },
            },
        });
        return { success: true, data: returns };
    } catch (error: any) {
        console.error('getRepReturns error:', error);
        return { success: false, error: 'تعذر تحميل المرتجعات' };
    }
}

export async function createRepReturn(data: {
    orderId: number;
    reason: 'DAMAGED' | 'WRONG_PRODUCT' | 'CUSTOMER_RETURN' | 'EXPIRED' | 'OTHER';
    reasonNotes?: string;
    warehouseId?: number;
    items: Array<{ orderItemId: number; quantity: number }>;
}) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };

    const canCreate = isAdmin(user) || hasPermission(user, 'addReturns') || hasPermission(user, 'viewWholesaleCustomers');
    if (!canCreate) return { success: false, error: 'غير مصرح لك بإنشاء مرتجع' };

    try {
        const orderId = Number(data.orderId);
        if (!orderId) return { success: false, error: 'الطلب مطلوب' };
        if (!Array.isArray(data.items) || data.items.length === 0) return { success: false, error: 'يجب إرجاع صنف واحد على الأقل' };

        const order = await prisma.wholesaleOrder.findUnique({
            where: { id: orderId },
            include: { items: true },
        });
        if (!order) return { success: false, error: 'الطلب غير موجود' };

        if (!isAdmin(user)) {
            const scopedIds = await getScopedUserIds(user.id);
            if (!order.userId || !scopedIds.includes(order.userId)) {
                return { success: false, error: 'هذا الطلب خارج نطاق صلاحياتك' };
            }
        }

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
                    wholesaleOrderItemId: orderItem.id,
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
                        reason: `مرتجع طلب جملة #${order.orderNumber} - ${data.reason}`,
                    },
                });
            }

            if (returnItems.length === 0) throw new Error('لا يوجد أصناف صالحة للإرجاع');

            const orderReturn = await tx.wholesaleOrderReturn.create({
                data: {
                    wholesaleOrderId: orderId,
                    reason: data.reason,
                    reasonNotes: data.reasonNotes || null,
                    refundAmount: round(refundAmount),
                    warehouseId,
                    items: { create: returnItems },
                },
                include: { items: true },
            });

            return orderReturn;
        });

        revalidatePath('/dashboard/rep-returns');
        revalidatePath('/dashboard/wholesale-orders');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('createRepReturn error:', error);
        return { success: false, error: error.message || 'تعذر إنشاء المرتجع' };
    }
}
