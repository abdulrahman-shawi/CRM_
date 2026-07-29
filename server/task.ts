'use server';

import { decrypt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { hasPermission, isAdmin } from '@/lib/utils';
import type { PermissionKey } from '@/lib/type';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/server/notification';

const statusLabels: Record<string, string> = {
    PENDING: 'معلّقة',
    IN_PROGRESS: 'قيد التنفيذ',
    COMPLETED: 'مكتملة',
    CANCELLED: 'ملغاة',
};

// إشعار فوري للمسؤول عند إسناد مهمة أو قرب استحقاقها (خلال 24 ساعة)
async function notifyTaskReminder(task: { id: string; title: string; assignedUserId: string; dueDate: Date; status: string }, customMessage?: string) {
    try {
        if (!['PENDING', 'IN_PROGRESS'].includes(task.status)) return;
        const now = new Date();
        const upcoming = new Date(now);
        upcoming.setDate(upcoming.getDate() + 1);
        const due = new Date(task.dueDate);
        if (due < now || due > upcoming) return;

        // لا تكرر التذكير لنفس المهمة في نفس اليوم
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const existing = await prisma.notification.findFirst({
            where: { entityType: 'task', entityId: String(task.id), createdAt: { gte: startOfDay } },
            select: { id: true },
        });
        if (existing) return;

        await createNotification({
            type: 'TASK_REMINDER',
            channel: 'IN_APP',
            userId: task.assignedUserId,
            title: 'تذكير بمهمة',
            message: customMessage || `المهمة "${task.title}" مستحقة بتاريخ ${due.toLocaleDateString('ar-EG')}`,
            entityType: 'task',
            entityId: String(task.id),
        });
    } catch (error) {
        console.error('notifyTaskReminder error:', error);
    }
}

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

function roundToTwo(value: number) {
    return Number(Number(value).toFixed(2));
}

export async function getTasks(params?: {
    assignedUserId?: string;
    status?: string;
    type?: string;
    dueBefore?: string;
    search?: string;
}) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewTasks'))) {
        return { success: false, error: 'غير مصرح لك بعرض المهام' };
    }
    try {
        const where: any = {};
        if (params?.assignedUserId && (isAdmin(user) || hasPermission(user, 'editTasks'))) {
            where.assignedUserId = params.assignedUserId;
        } else if (!isAdmin(user)) {
            where.assignedUserId = user.id;
        }
        if (params?.status) where.status = params.status;
        if (params?.type) where.type = params.type;
        if (params?.dueBefore) where.dueDate = { lte: new Date(params.dueBefore) };
        if (params?.search) {
            where.OR = [
                { title: { contains: params.search, mode: 'insensitive' } },
                { description: { contains: params.search, mode: 'insensitive' } },
                { customer: { name: { contains: params.search, mode: 'insensitive' } } },
                { wholesaleCustomer: { name: { contains: params.search, mode: 'insensitive' } } },
            ];
        }
        const tasks = await prisma.task.findMany({
            where,
            orderBy: { dueDate: 'asc' },
            include: {
                assignedUser: { select: { id: true, username: true } },
                createdBy: { select: { id: true, username: true } },
                customer: { select: { id: true, name: true } },
                wholesaleCustomer: { select: { id: true, name: true } },
            },
            take: 200,
        });
        return { success: true, data: tasks };
    } catch (error: any) {
        console.error('getTasks error:', error);
        return { success: false, error: 'تعذر تحميل المهام' };
    }
}

export async function getTaskById(id: string) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewTasks'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                assignedUser: { select: { id: true, username: true } },
                createdBy: { select: { id: true, username: true } },
                customer: { select: { id: true, name: true } },
                wholesaleCustomer: { select: { id: true, name: true } },
            },
        });
        if (!task) return { success: false, error: 'المهمة غير موجودة' };
        if (!isAdmin(user) && task.assignedUserId !== user.id && !hasPermission(user, 'editTasks')) {
            return { success: false, error: 'غير مصرح' };
        }
        return { success: true, data: task };
    } catch (error: any) {
        console.error('getTaskById error:', error);
        return { success: false, error: 'تعذر تحميل المهمة' };
    }
}

export async function createTask(data: {
    title: string;
    type: 'VISIT' | 'CALL' | 'FOLLOW_UP' | 'DELIVERY' | 'MEETING' | 'OTHER';
    description?: string;
    assignedUserId: string;
    customerId?: string;
    wholesaleCustomerId?: string;
    dueDate: string;
}) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'addTasks');

    try {
        if (!data.title || !data.assignedUserId || !data.dueDate) {
            return { success: false, error: 'العنوان والمسؤول والتاريخ المستحق مطلوبة' };
        }
        const task = await prisma.task.create({
            data: {
                title: data.title,
                type: data.type || 'OTHER',
                description: data.description || null,
                assignedUserId: data.assignedUserId,
                customerId: data.customerId || null,
                wholesaleCustomerId: data.wholesaleCustomerId || null,
                dueDate: new Date(data.dueDate),
                createdById: user.id,
            },
        });
        await notifyTaskReminder(task as any, `أُسندت إليك مهمة جديدة "${task.title}" مستحقة بتاريخ ${new Date(task.dueDate).toLocaleDateString('ar-EG')}`);
        revalidatePath('/dashboard/tasks');
        return { success: true, data: task };
    } catch (error: any) {
        console.error('createTask error:', error);
        return { success: false, error: 'تعذر إنشاء المهمة' };
    }
}

export async function updateTask(
    id: string,
    data: {
        title?: string;
        type?: 'VISIT' | 'CALL' | 'FOLLOW_UP' | 'DELIVERY' | 'MEETING' | 'OTHER';
        description?: string;
        assignedUserId?: string;
        customerId?: string | null;
        wholesaleCustomerId?: string | null;
        dueDate?: string;
        status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
        resultNotes?: string;
        latitude?: number;
        longitude?: number;
    }
) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };

    try {
        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) return { success: false, error: 'المهمة غير موجودة' };
        const canEdit = isAdmin(user) || hasPermission(user, 'editTasks') || task.assignedUserId === user.id;
        if (!canEdit) return { success: false, error: 'غير مصرح' };

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.description !== undefined) updateData.description = data.description || null;
        if (data.assignedUserId !== undefined && (isAdmin(user) || hasPermission(user, 'editTasks'))) {
            updateData.assignedUserId = data.assignedUserId;
        }
        if (data.customerId !== undefined) updateData.customerId = data.customerId || null;
        if (data.wholesaleCustomerId !== undefined) updateData.wholesaleCustomerId = data.wholesaleCustomerId || null;
        if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
        if (data.status !== undefined) {
            updateData.status = data.status;
            if (data.status === 'COMPLETED' && !task.completedAt) {
                updateData.completedAt = new Date();
            }
        }
        if (data.resultNotes !== undefined) updateData.resultNotes = data.resultNotes || null;
        if (data.latitude !== undefined) updateData.latitude = data.latitude || null;
        if (data.longitude !== undefined) updateData.longitude = data.longitude || null;

        const updated = await prisma.task.update({ where: { id }, data: updateData });
        await notifyTaskReminder(updated as any);
        revalidatePath('/dashboard/tasks');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('updateTask error:', error);
        return { success: false, error: 'تعذر تحديث المهمة' };
    }
}

export async function markTaskCompleted(id: string, resultNotes?: string, latitude?: number, longitude?: number) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    try {
        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) return { success: false, error: 'المهمة غير موجودة' };
        if (!isAdmin(user) && task.assignedUserId !== user.id && !hasPermission(user, 'editTasks')) {
            return { success: false, error: 'غير مصرح' };
        }
        const updated = await prisma.task.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                resultNotes: resultNotes || null,
                latitude: latitude || null,
                longitude: longitude || null,
            },
        });
        revalidatePath('/dashboard/tasks');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('markTaskCompleted error:', error);
        return { success: false, error: 'تعذر إكمال المهمة' };
    }
}

export async function deleteTask(id: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'deleteTasks');
    try {
        await prisma.task.delete({ where: { id } });
        revalidatePath('/dashboard/tasks');
        return { success: true };
    } catch (error: any) {
        console.error('deleteTask error:', error);
        return { success: false, error: 'تعذر حذف المهمة' };
    }
}

export async function getTaskStats(userId?: string, startDate?: string, endDate?: string) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewTasks'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        if (end) end.setHours(23, 59, 59, 999);

        const where: any = {};
        if (userId && (isAdmin(user) || hasPermission(user, 'editTasks'))) where.assignedUserId = userId;
        else if (!isAdmin(user)) where.assignedUserId = user.id;
        if (start || end) {
            where.dueDate = {};
            if (start) where.dueDate.gte = start;
            if (end) where.dueDate.lte = end;
        }

        const [total, completed, pending, inProgress, cancelled] = await Promise.all([
            prisma.task.count({ where }),
            prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
            prisma.task.count({ where: { ...where, status: 'PENDING' } }),
            prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            prisma.task.count({ where: { ...where, status: 'CANCELLED' } }),
        ]);

        const completionRate = total > 0 ? roundToTwo((completed / total) * 100) : 0;
        return { success: true, data: { total, completed, pending, inProgress, cancelled, completionRate } };
    } catch (error: any) {
        console.error('getTaskStats error:', error);
        return { success: false, error: 'تعذر تحميل إحصائيات المهام' };
    }
}

export async function getTaskAssignees() {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewTasks'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const users = await prisma.user.findMany({
            where: { accountType: { in: ['ADMIN', 'MANAGER', 'STAFF'] } },
            select: { id: true, username: true },
            orderBy: { username: 'asc' },
        });
        return { success: true, data: users };
    } catch (error: any) {
        console.error('getTaskAssignees error:', error);
        return { success: false, error: 'تعذر تحميل المستخدمين' };
    }
}

export async function getTaskCustomers() {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewTasks'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const [customers, wholesaleCustomers] = await Promise.all([
            prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 200 }),
            prisma.wholesaleCustomer.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 200 }),
        ]);
        return { success: true, data: { customers, wholesaleCustomers } };
    } catch (error: any) {
        console.error('getTaskCustomers error:', error);
        return { success: false, error: 'تعذر تحميل العملاء' };
    }
}
