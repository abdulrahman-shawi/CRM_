'use server';

import { decrypt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { hasPermission, isAdmin } from '@/lib/utils';
import { createOrderReturn } from '@/server/return';

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
                { customer: { name: { contains: term, mode: 'insensitive' } } },
            ];
        }

        const orders = await prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
                id: true,
                orderNumber: true,
                status: true,
                finalAmount: true,
                customer: { select: { id: true, name: true } },
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
        if (scopedIds) where.order = { userId: { in: scopedIds } };

        if (search?.trim()) {
            const term = search.trim();
            where.OR = [
                { order: { orderNumber: { contains: term, mode: 'insensitive' } } },
                { order: { customer: { name: { contains: term, mode: 'insensitive' } } } },
            ];
            if (scopedIds) where.order.userId = { in: scopedIds };
        }

        const returns = await prisma.orderReturn.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                order: { select: { id: true, orderNumber: true, customer: { select: { id: true, name: true } } } },
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
        if (!isAdmin(user)) {
            const order = await prisma.order.findUnique({
                where: { id: Number(data.orderId) },
                select: { userId: true },
            });
            if (!order) return { success: false, error: 'الطلب غير موجود' };
            const scopedIds = await getScopedUserIds(user.id);
            if (!order.userId || !scopedIds.includes(order.userId)) {
                return { success: false, error: 'هذا الطلب خارج نطاق صلاحياتك' };
            }
        }
        return createOrderReturn(data);
    } catch (error: any) {
        console.error('createRepReturn error:', error);
        return { success: false, error: 'تعذر إنشاء المرتجع' };
    }
}
