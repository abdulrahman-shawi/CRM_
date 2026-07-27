'use server';

import { decrypt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { hasPermission, isAdmin } from '@/lib/utils';
import type { PermissionKey } from '@/lib/type';

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

const EXPENSE_TYPES = ['DAILY', 'STAFF_SALARY', 'RENT'] as const;
type ExpenseTypeInput = (typeof EXPENSE_TYPES)[number];

type ExpenseInput = {
    type?: ExpenseTypeInput;
    amount: number;
    description?: string;
    employeeId?: string | null;
    scheduledDate?: string | null;
    notes?: string;
};

const expenseInclude = {
    employee: { select: { id: true, username: true } },
} as const;

function validateExpenseInput(data: ExpenseInput) {
    const type = EXPENSE_TYPES.includes(data.type as ExpenseTypeInput) ? (data.type as ExpenseTypeInput) : 'DAILY';
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { error: 'المبلغ يجب أن يكون أكبر من صفر' };
    }

    let scheduledDate: Date | null = null;
    if (data.scheduledDate) {
        const parsed = new Date(data.scheduledDate);
        if (Number.isNaN(parsed.getTime())) {
            return { error: 'تاريخ المصروف غير صالح' };
        }
        scheduledDate = parsed;
    }

    return {
        values: {
            type,
            amount: Number(amount.toFixed(2)),
            description: String(data.description || '').trim() || null,
            notes: String(data.notes || '').trim() || null,
            scheduledDate,
            // العملة الافتراضية دولار — التحويل لعملة الموقع يتم عند العرض فقط
            currency: 'USD' as const,
        },
        employeeId: String(data.employeeId || '').trim() || null,
    };
}

export async function getExpenses(filters?: { month?: string; type?: ExpenseTypeInput }) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewExpenses'))) {
        return { success: false, error: 'غير مصرح لك بعرض المصاريف' };
    }

    try {
        const where: any = {};

        if (filters?.type && EXPENSE_TYPES.includes(filters.type)) {
            where.type = filters.type;
        }

        if (filters?.month) {
            const start = new Date(`${filters.month}-01T00:00:00`);
            if (!Number.isNaN(start.getTime())) {
                const end = new Date(start);
                end.setMonth(end.getMonth() + 1);
                where.createdAt = { gte: start, lt: end };
            }
        }

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: expenseInclude,
        });

        const totalUSD = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

        return { success: true, data: expenses, summary: { totalUSD: Number(totalUSD.toFixed(2)), count: expenses.length } };
    } catch (error) {
        console.error('getExpenses error:', error);
        return { success: false, error: 'تعذر تحميل المصاريف' };
    }
}

export async function createExpense(data: ExpenseInput) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };

    try {
        requirePermission(user, 'addExpenses');

        const { values, employeeId, error } = validateExpenseInput(data) as any;
        if (error) return { success: false, error };

        if (values.type === 'STAFF_SALARY' && employeeId) {
            const employee = await prisma.user.findUnique({ where: { id: employeeId }, select: { id: true } });
            if (!employee) return { success: false, error: 'الموظف المحدد غير موجود' };
        }

        const expense = await prisma.expense.create({
            data: {
                ...values,
                ...(employeeId ? { employee: { connect: { id: employeeId } } } : {}),
            },
            include: expenseInclude,
        });

        return { success: true, data: expense };
    } catch (error: any) {
        console.error('createExpense error:', error);
        return { success: false, error: error?.message || 'تعذر إنشاء المصروف' };
    }
}

export async function updateExpense(id: number, data: ExpenseInput) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };

    try {
        requirePermission(user, 'editExpenses');

        const expenseId = Number(id);
        if (!expenseId) return { success: false, error: 'المصروف غير موجود' };

        const { values, employeeId, error } = validateExpenseInput(data) as any;
        if (error) return { success: false, error };

        if (values.type === 'STAFF_SALARY' && employeeId) {
            const employee = await prisma.user.findUnique({ where: { id: employeeId }, select: { id: true } });
            if (!employee) return { success: false, error: 'الموظف المحدد غير موجود' };
        }

        const expense = await prisma.expense.update({
            where: { id: expenseId },
            data: {
                ...values,
                employee: employeeId ? { connect: { id: employeeId } } : { disconnect: true },
            },
            include: expenseInclude,
        });

        return { success: true, data: expense };
    } catch (error: any) {
        console.error('updateExpense error:', error);
        return { success: false, error: error?.message || 'تعذر تعديل المصروف' };
    }
}

export async function deleteExpense(id: number) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };

    try {
        requirePermission(user, 'deleteExpenses');

        const expenseId = Number(id);
        if (!expenseId) return { success: false, error: 'المصروف غير موجود' };

        await prisma.expense.delete({ where: { id: expenseId } });
        return { success: true };
    } catch (error: any) {
        console.error('deleteExpense error:', error);
        return { success: false, error: error?.message || 'تعذر حذف المصروف' };
    }
}
