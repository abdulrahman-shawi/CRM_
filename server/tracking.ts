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

export async function getOrdersWithTracking(params?: {
    status?: string;
    trackingStatus?: string;
    search?: string;
    take?: number;
}) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewTracking') && !hasPermission(user, 'viewOrders'))) {
        return { success: false, error: 'غير مصرح لك بعرض التتبع' };
    }
    try {
        const where: any = {};
        if (params?.status) where.status = params.status;
        if (params?.trackingStatus) where.trackingStatus = params.trackingStatus;
        if (params?.search) {
            where.OR = [
                { orderNumber: { contains: params.search, mode: 'insensitive' } },
                { trackingNumber: { contains: params.search, mode: 'insensitive' } },
                { customer: { name: { contains: params.search, mode: 'insensitive' } } },
            ];
        }
        const orders = await prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: params?.take || 200,
            select: {
                id: true,
                orderNumber: true,
                status: true,
                trackingNumber: true,
                trackingStatus: true,
                trackingUrl: true,
                customer: { select: { id: true, name: true } },
                shipping: { select: { id: true, name: true } },
                createdAt: true,
            },
        });
        return { success: true, data: orders };
    } catch (error: any) {
        console.error('getOrdersWithTracking error:', error);
        return { success: false, error: 'تعذر تحميل بيانات التتبع' };
    }
}

export async function updateOrderTracking(
    orderId: number,
    data: {
        trackingNumber?: string;
        trackingStatus?: 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RETURNED';
        trackingUrl?: string;
        shippingCompanyName?: string;
        shippingPrice?: number;
    }
) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'editTracking');

    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, shippingId: true },
        });
        if (!order) return { success: false, error: 'الطلب غير موجود' };

        let shippingId = order.shippingId;
        const companyName = String(data.shippingCompanyName || '').trim();
        if (companyName) {
            let shipping = await prisma.shipping.findFirst({ where: { name: companyName }, select: { id: true } });
            if (!shipping) {
                shipping = await prisma.shipping.create({
                    data: { name: companyName, price: Number(data.shippingPrice || 0) },
                    select: { id: true },
                });
            } else if (data.shippingPrice !== undefined) {
                await prisma.shipping.update({
                    where: { id: shipping.id },
                    data: { price: Number(data.shippingPrice || 0) },
                });
            }
            shippingId = shipping.id;
        }

        const updateData: any = {};
        if (data.trackingNumber !== undefined) updateData.trackingNumber = data.trackingNumber ? String(data.trackingNumber).trim() : null;
        if (data.trackingStatus !== undefined) updateData.trackingStatus = data.trackingStatus;
        if (data.trackingUrl !== undefined) updateData.trackingUrl = data.trackingUrl ? String(data.trackingUrl).trim() : null;
        if (shippingId) updateData.shipping = { connect: { id: shippingId } };
        if (data.shippingPrice !== undefined) updateData.shippingPrice = Number(data.shippingPrice || 0);

        const updated = await prisma.order.update({
            where: { id: orderId },
            data: updateData,
            select: {
                id: true,
                orderNumber: true,
                trackingNumber: true,
                trackingStatus: true,
                trackingUrl: true,
                status: true,
            },
        });

        revalidatePath('/dashboard/tracking');
        revalidatePath('/dashboard/orders');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('updateOrderTracking error:', error);
        return { success: false, error: 'تعذر تحديث بيانات التتبع' };
    }
}

const TRACKING_STATUS_LABELS: Record<string, string> = {
    PENDING: 'معلق',
    PICKED_UP: 'تم الالتقاط',
    IN_TRANSIT: 'في الطريق',
    OUT_FOR_DELIVERY: 'خرج للتوصيل',
    DELIVERED: 'تم التسليم',
    RETURNED: 'مرتجع',
};

export async function syncTrackingStatusFromOrderStatus(orderId: number, status: string) {
    try {
        const map: Record<string, string> = {
            'تم تسليم الطلب': 'DELIVERED',
            'تم التسليم': 'DELIVERED',
            'قيد التوصيل': 'OUT_FOR_DELIVERY',
            'تم الشحن': 'IN_TRANSIT',
            'تم الاستلام': 'PICKED_UP',
            'فشل التسليم مرتجع': 'RETURNED',
        };
        const trackingStatus = map[status];
        if (!trackingStatus) return { success: true, data: null };
        const updated = await prisma.order.update({
            where: { id: orderId },
            data: { trackingStatus: trackingStatus as any },
            select: { id: true, trackingStatus: true },
        });
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('syncTrackingStatusFromOrderStatus error:', error);
        return { success: false, error: 'تعذر مزامنة حالة التتبع' };
    }
}
