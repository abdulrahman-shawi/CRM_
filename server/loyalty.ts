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

async function getActiveRule() {
    return prisma.loyaltyRule.findFirst({ where: { isActive: true } });
}

export async function getLoyaltyRules() {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewLoyalty'))) {
        return { success: false, error: 'غير مصرح لك بعرض قواعد الولاء' };
    }
    try {
        const rules = await prisma.loyaltyRule.findMany({ orderBy: { createdAt: 'desc' } });
        return { success: true, data: rules };
    } catch (error: any) {
        console.error('getLoyaltyRules error:', error);
        return { success: false, error: 'تعذر تحميل قواعد الولاء' };
    }
}

export async function createLoyaltyRule(data: {
    name?: string;
    pointsPerCurrency: number;
    redeemValue: number;
    minPointsToRedeem: number;
    isActive?: boolean;
}) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'editLoyalty');

    try {
        const rule = await prisma.loyaltyRule.create({
            data: {
                name: data.name || null,
                pointsPerCurrency: Math.max(0, Number(data.pointsPerCurrency || 1)),
                redeemValue: Math.max(0, Number(data.redeemValue || 0)),
                minPointsToRedeem: Math.max(0, Number(data.minPointsToRedeem || 0)),
                isActive: data.isActive !== false,
            },
        });
        revalidatePath('/dashboard/loyalty');
        return { success: true, data: rule };
    } catch (error: any) {
        console.error('createLoyaltyRule error:', error);
        return { success: false, error: 'تعذر إنشاء قاعدة الولاء' };
    }
}

export async function updateLoyaltyRule(id: string, data: {
    name?: string;
    pointsPerCurrency?: number;
    redeemValue?: number;
    minPointsToRedeem?: number;
    isActive?: boolean;
}) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'editLoyalty');

    try {
        const rule = await prisma.loyaltyRule.update({
            where: { id },
            data: {
                ...(data.name !== undefined ? { name: data.name || null } : {}),
                ...(data.pointsPerCurrency !== undefined ? { pointsPerCurrency: Math.max(0, Number(data.pointsPerCurrency)) } : {}),
                ...(data.redeemValue !== undefined ? { redeemValue: Math.max(0, Number(data.redeemValue)) } : {}),
                ...(data.minPointsToRedeem !== undefined ? { minPointsToRedeem: Math.max(0, Number(data.minPointsToRedeem)) } : {}),
                ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
            },
        });
        revalidatePath('/dashboard/loyalty');
        return { success: true, data: rule };
    } catch (error: any) {
        console.error('updateLoyaltyRule error:', error);
        return { success: false, error: 'تعذر تحديث قاعدة الولاء' };
    }
}

export async function deleteLoyaltyRule(id: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'editLoyalty');

    try {
        await prisma.loyaltyRule.delete({ where: { id } });
        revalidatePath('/dashboard/loyalty');
        return { success: true };
    } catch (error: any) {
        console.error('deleteLoyaltyRule error:', error);
        return { success: false, error: 'تعذر حذف قاعدة الولاء' };
    }
}

export async function getCustomerLoyaltySummary(customerId: string) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewLoyalty') && !hasPermission(user, 'viewCustomers'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true, loyaltyPoints: true },
        });
        if (!customer) return { success: false, error: 'العميل غير موجود' };
        const rule = await getActiveRule();
        return { success: true, data: { customer, rule } };
    } catch (error: any) {
        console.error('getCustomerLoyaltySummary error:', error);
        return { success: false, error: 'تعذر تحميل ملخص الولاء' };
    }
}

export async function getLoyaltyTransactions(customerId?: string) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewLoyalty'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const where = customerId ? { customerId } : undefined;
        const transactions = await prisma.loyaltyTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                customer: { select: { id: true, name: true } },
                order: { select: { id: true, orderNumber: true } },
            },
            take: 500,
        });
        return { success: true, data: transactions };
    } catch (error: any) {
        console.error('getLoyaltyTransactions error:', error);
        return { success: false, error: 'تعذر تحميل حركات النقاط' };
    }
}

export async function earnLoyaltyPointsForOrder(orderId: number) {
    try {
        const rule = await getActiveRule();
        if (!rule || rule.pointsPerCurrency <= 0) return { success: true, data: null };

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, customerId: true, finalAmount: true, status: true },
        });
        if (!order || !order.customerId) return { success: true, data: null };

        const nonEarningStatuses = ['تم الغاء الطلب', 'فشل التسليم مرتجع'];
        if (nonEarningStatuses.includes(order.status)) return { success: true, data: null };

        const points = Math.floor(Math.max(0, Number(order.finalAmount || 0)) * rule.pointsPerCurrency);
        if (points <= 0) return { success: true, data: null };

        const result = await prisma.$transaction(async (tx) => {
            await tx.customer.update({
                where: { id: order.customerId },
                data: { loyaltyPoints: { increment: points } },
            });
            return tx.loyaltyTransaction.create({
                data: {
                    customerId: order.customerId,
                    orderId: order.id,
                    type: 'EARN',
                    points,
                    value: 0,
                    notes: `نقاط مكتسبة من طلب #${orderId}`,
                },
            });
        });
        return { success: true, data: result };
    } catch (error: any) {
        console.error('earnLoyaltyPointsForOrder error:', error);
        return { success: false, error: 'تعذر إضافة نقاط الولاء' };
    }
}

export async function addManualLoyaltyPointsForOrder(orderId: number, pointsInput: number) {
    try {
        const points = Math.max(0, Math.floor(Number(pointsInput || 0)));
        if (points <= 0) return { success: true, data: null };

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, customerId: true },
        });
        if (!order || !order.customerId) return { success: true, data: null };

        const result = await prisma.$transaction(async (tx) => {
            await tx.customer.update({
                where: { id: order.customerId },
                data: { loyaltyPoints: { increment: points } },
            });
            return tx.loyaltyTransaction.create({
                data: {
                    customerId: order.customerId,
                    orderId: order.id,
                    type: 'BONUS',
                    points,
                    value: 0,
                    notes: `نقاط إضافية من الموظف على طلب #${orderId}`,
                },
            });
        });
        return { success: true, data: result };
    } catch (error: any) {
        console.error('addManualLoyaltyPointsForOrder error:', error);
        return { success: false, error: 'تعذر إضافة نقاط الولاء اليدوية' };
    }
}

