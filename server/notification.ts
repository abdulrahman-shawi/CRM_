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

export async function getNotifications(userId?: string, unreadOnly = false) {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser || (!isAdmin(currentUser) && !hasPermission(currentUser, 'viewNotifications'))) {
        return { success: false, error: 'غير مصرح لك بعرض الإشعارات' };
    }
    try {
        const targetId = userId && (isAdmin(currentUser) || hasPermission(currentUser, 'viewNotifications')) ? userId : currentUser.id;
        const where: any = { userId: targetId };
        if (unreadOnly) where.readAt = null;
        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                customer: { select: { id: true, name: true } },
                user: { select: { id: true, username: true } },
            },
            take: 200,
        });
        return { success: true, data: notifications };
    } catch (error: any) {
        console.error('getNotifications error:', error);
        return { success: false, error: 'تعذر تحميل الإشعارات' };
    }
}

export async function getUnreadNotificationCount(userId?: string) {
    try {
        const currentUser = await getCurrentSessionUser();
        if (!currentUser) return { success: false, count: 0 };
        const targetId = userId && isAdmin(currentUser) ? userId : currentUser.id;
        const count = await prisma.notification.count({
            where: { userId: targetId, readAt: null },
        });
        return { success: true, count };
    } catch (error: any) {
        console.error('getUnreadNotificationCount error:', error);
        return { success: false, count: 0 };
    }
}

export async function createNotification(data: {
    type: 'LOW_STOCK' | 'ORDER_STATUS_CHANGE' | 'WHOLESALE_FOLLOW_UP' | 'TASK_REMINDER' | 'SYSTEM';
    channel?: 'IN_APP' | 'EMAIL' | 'WHATSAPP';
    userId?: string;
    customerId?: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
}) {
    try {
        const notification = await prisma.notification.create({
            data: {
                type: data.type,
                channel: data.channel || 'IN_APP',
                userId: data.userId || null,
                customerId: data.customerId || null,
                title: data.title,
                message: data.message,
                entityType: data.entityType || null,
                entityId: data.entityId || null,
            },
        });
        revalidatePath('/dashboard/notifications');
        return { success: true, data: notification };
    } catch (error: any) {
        console.error('createNotification error:', error);
        return { success: false, error: 'تعذر إنشاء الإشعار' };
    }
}

export async function markNotificationRead(id: string) {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser) return { success: false, error: 'غير مصرح' };
    try {
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification) return { success: false, error: 'الإشعار غير موجود' };
        if (!isAdmin(currentUser) && notification.userId !== currentUser.id) {
            return { success: false, error: 'غير مصرح' };
        }
        const updated = await prisma.notification.update({
            where: { id },
            data: { readAt: new Date() },
        });
        revalidatePath('/dashboard/notifications');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('markNotificationRead error:', error);
        return { success: false, error: 'تعذر تحديث الإشعار' };
    }
}

export async function markAllNotificationsRead(userId?: string) {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser) return { success: false, error: 'غير مصرح' };
    try {
        const targetId = userId && isAdmin(currentUser) ? userId : currentUser.id;
        await prisma.notification.updateMany({
            where: { userId: targetId, readAt: null },
            data: { readAt: new Date() },
        });
        revalidatePath('/dashboard/notifications');
        return { success: true };
    } catch (error: any) {
        console.error('markAllNotificationsRead error:', error);
        return { success: false, error: 'تعذر تحديث الإشعارات' };
    }
}

export async function deleteNotification(id: string) {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser) return { success: false, error: 'غير مصرح' };
    try {
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification) return { success: false, error: 'الإشعار غير موجود' };
        if (!isAdmin(currentUser) && notification.userId !== currentUser.id) {
            return { success: false, error: 'غير مصرح' };
        }
        await prisma.notification.delete({ where: { id } });
        revalidatePath('/dashboard/notifications');
        return { success: true };
    } catch (error: any) {
        console.error('deleteNotification error:', error);
        return { success: false, error: 'تعذر حذف الإشعار' };
    }
}

export async function createLowStockNotifications(threshold = 5) {
    try {
        const products = await prisma.product.findMany({
            select: {
                id: true,
                name: true,
                stocks: { select: { quantity: true, warehouse: { select: { id: true, name: true } } } },
            },
        });
        const admins = await prisma.user.findMany({
            where: { accountType: 'ADMIN' },
            select: { id: true },
        });
        const notifications = [];
        for (const product of products) {
            for (const stock of product.stocks) {
                if ((stock.quantity || 0) <= threshold) {
                    for (const admin of admins) {
                        notifications.push({
                            type: 'LOW_STOCK' as const,
                            channel: 'IN_APP' as const,
                            userId: admin.id,
                            title: 'تنبيه انخفاض المخزون',
                            message: `المخزون منخفض لـ ${product.name} في ${stock.warehouse.name} (الكمية: ${stock.quantity})`,
                            entityType: 'product',
                            entityId: String(product.id),
                        });
                    }
                }
            }
        }
        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications });
        }
        return { success: true, count: notifications.length };
    } catch (error: any) {
        console.error('createLowStockNotifications error:', error);
        return { success: false, error: 'تعذر إنشاء إشعارات المخزون' };
    }
}

export async function createOrderStatusChangeNotification(orderId: number, status: string, userId?: string) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, orderNumber: true, customerId: true, userId: true },
        });
        if (!order) return { success: false, error: 'الطلب غير موجود' };
        const targetUserId = userId || order.userId;
        if (!targetUserId) return { success: true, data: null };

        return createNotification({
            type: 'ORDER_STATUS_CHANGE',
            channel: 'IN_APP',
            userId: targetUserId,
            customerId: order.customerId,
            title: 'تغيير حالة الطلب',
            message: `تغيرت حالة الطلب #${order.orderNumber} إلى ${status}`,
            entityType: 'order',
            entityId: String(order.id),
        });
    } catch (error: any) {
        console.error('createOrderStatusChangeNotification error:', error);
        return { success: false, error: 'تعذر إنشاء إشعار حالة الطلب' };
    }
}

export async function createWholesaleFollowUpNotifications() {
    try {
        const now = new Date();
        const upcoming = new Date(now);
        upcoming.setDate(upcoming.getDate() + 2);
        const customers = await prisma.wholesaleCustomer.findMany({
            where: {
                nextFollowUpAt: { gte: now, lte: upcoming },
                assignedUserId: { not: null },
            },
            select: {
                id: true,
                name: true,
                assignedUserId: true,
                nextFollowUpAt: true,
            },
        });
        if (customers.length === 0) return { success: true, count: 0 };

        // تجنب التكرار: لا تنشئ إشعارًا جديدًا إذا وُجد إشعار لنفس العميل اليوم
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const existing = await prisma.notification.findMany({
            where: {
                entityType: 'wholesaleCustomer',
                entityId: { in: customers.map((c) => String(c.id)) },
                createdAt: { gte: startOfDay },
            },
            select: { entityId: true },
        });
        const alreadyNotified = new Set(existing.map((n) => n.entityId));

        const notifications = customers
            .filter((customer) => !alreadyNotified.has(String(customer.id)))
            .map((customer) => ({
                type: 'WHOLESALE_FOLLOW_UP' as const,
                channel: 'IN_APP' as const,
                userId: customer.assignedUserId as string,
                title: 'متابعة عميل جملة',
                message: `موعد متابعة ${customer.name} بتاريخ ${new Date(customer.nextFollowUpAt as Date).toLocaleDateString('ar-EG')}`,
                entityType: 'wholesaleCustomer',
                entityId: String(customer.id),
            }));
        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications });
        }
        return { success: true, count: notifications.length };
    } catch (error: any) {
        console.error('createWholesaleFollowUpNotifications error:', error);
        return { success: false, error: 'تعذر إنشاء إشعارات المتابعة' };
    }
}

export async function createTaskReminderNotifications() {
    try {
        const now = new Date();
        const upcoming = new Date(now);
        upcoming.setDate(upcoming.getDate() + 1);
        const tasks = await prisma.task.findMany({
            where: {
                status: { in: ['PENDING', 'IN_PROGRESS'] },
                dueDate: { gte: now, lte: upcoming },
            },
            select: { id: true, title: true, assignedUserId: true, dueDate: true },
        });
        if (tasks.length === 0) return { success: true, count: 0 };

        // تجنب التكرار: لا تنشئ تذكيرًا جديدًا إذا وُجد تذكير لنفس المهمة اليوم
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const existing = await prisma.notification.findMany({
            where: {
                entityType: 'task',
                entityId: { in: tasks.map((t) => String(t.id)) },
                createdAt: { gte: startOfDay },
            },
            select: { entityId: true },
        });
        const alreadyNotified = new Set(existing.map((n) => n.entityId));

        const notifications = tasks
            .filter((task) => !alreadyNotified.has(String(task.id)))
            .map((task) => ({
                type: 'TASK_REMINDER' as const,
                channel: 'IN_APP' as const,
                userId: task.assignedUserId,
                title: 'تذكير بمهمة',
                message: `المهمة "${task.title}" مستحقة بتاريخ ${new Date(task.dueDate).toLocaleDateString('ar-EG')}`,
                entityType: 'task',
                entityId: String(task.id),
            }));
        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications });
        }
        return { success: true, count: notifications.length };
    } catch (error: any) {
        console.error('createTaskReminderNotifications error:', error);
        return { success: false, error: 'تعذر إنشاء تذكيرات المهام' };
    }
}
