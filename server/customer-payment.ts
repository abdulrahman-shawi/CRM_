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

export async function getCustomerPayments(customerId?: string) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewCustomerPayments'))) {
        return { success: false, error: 'غير مصرح لك بعرض الدفعات' };
    }
    try {
        const where = customerId ? { customerId } : undefined;
        const payments = await prisma.customerPayment.findMany({
            where,
            orderBy: { paymentDate: 'desc' },
            include: {
                customer: { select: { id: true, name: true } },
                order: { select: { id: true, orderNumber: true } },
                createdBy: { select: { username: true } },
            },
        });
        return { success: true, data: payments };
    } catch (error: any) {
        console.error('getCustomerPayments error:', error);
        return { success: false, error: 'تعذر تحميل الدفعات' };
    }
}

export async function getCustomerStatement(customerId: string) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewCustomerPayments'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                orders: {
                    orderBy: { createdAt: 'asc' },
                    select: { id: true, orderNumber: true, finalAmount: true, paidAmount: true, remainingAmount: true, createdAt: true, status: true },
                },
                payments: {
                    orderBy: { paymentDate: 'asc' },
                    select: { id: true, amount: true, paymentDate: true, paymentType: true, orderId: true },
                },
            },
        });
        if (!customer) return { success: false, error: 'العميل غير موجود' };

        const totalOrders = customer.orders.reduce((sum, o) => sum + Number(o.finalAmount), 0);
        const totalPaid = customer.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalRemaining = customer.orders.reduce((sum, o) => sum + Number(o.remainingAmount), 0);

        const entries = [
            ...customer.orders.map((o) => ({
                type: 'order' as const,
                date: o.createdAt,
                description: `طلب #${o.orderNumber}`,
                debit: Number(o.finalAmount),
                credit: 0,
                orderId: o.id,
            })),
            ...customer.payments.map((p) => ({
                type: 'payment' as const,
                date: p.paymentDate,
                description: 'دفعة',
                debit: 0,
                credit: Number(p.amount),
                paymentId: p.id,
                orderId: p.orderId,
            })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let balance = 0;
        const statement = entries.map((e) => {
            balance += e.debit - e.credit;
            return { ...e, balance: round(balance) };
        });

        return { success: true, data: { customer, summary: { totalOrders, totalPaid, totalRemaining }, statement } };
    } catch (error: any) {
        console.error('getCustomerStatement error:', error);
        return { success: false, error: 'تعذر إنشاء كشف الحساب' };
    }
}

export async function createCustomerPayment(data: {
    customerId: string;
    orderId?: number;
    amount: number;
    paymentType: 'CASH' | 'BANK_TRANSFER' | 'INSTALLMENT' | 'CHECK' | 'OTHER';
    paymentDate?: string;
    notes?: string;
}) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'addCustomerPayments');

    try {
        const customerId = String(data.customerId || '').trim();
        const amount = round(Number(data.amount || 0));
        if (!customerId) return { success: false, error: 'العميل مطلوب' };
        if (amount <= 0) return { success: false, error: 'مبلغ الدفعة يجب أن يكون أكبر من صفر' };

        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.customerPayment.create({
                data: {
                    customerId,
                    orderId: data.orderId || null,
                    amount,
                    paymentType: data.paymentType || 'CASH',
                    paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
                    notes: data.notes || null,
                    createdById: user.id,
                },
            });

            if (data.orderId) {
                const order = await tx.order.findUnique({
                    where: { id: Number(data.orderId) },
                    include: { returns: { select: { refundAmount: true } }, payments: { select: { amount: true } } },
                });
                if (order) {
                    const totalRefunds = order.returns.reduce((sum, r) => sum + Number(r.refundAmount), 0);
                    const totalPayments = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                    await tx.order.update({
                        where: { id: order.id },
                        data: {
                            paidAmount: totalPayments,
                            remainingAmount: round(Math.max(0, order.finalAmount - totalRefunds - totalPayments)),
                        },
                    });
                }
            }

            return payment;
        });

        revalidatePath('/dashboard/customer-payments');
        revalidatePath('/dashboard/orders');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('createCustomerPayment error:', error);
        return { success: false, error: 'تعذر تسجيل الدفعة' };
    }
}

export async function deleteCustomerPayment(id: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'deleteCustomerPayments');

    try {
        await prisma.$transaction(async (tx) => {
            const payment = await tx.customerPayment.findUnique({ where: { id } });
            if (!payment) throw new Error('الدفعة غير موجودة');
            await tx.customerPayment.delete({ where: { id } });

            if (payment.orderId) {
                const order = await tx.order.findUnique({
                    where: { id: payment.orderId },
                    include: { returns: { select: { refundAmount: true } }, payments: { select: { amount: true } } },
                });
                if (order) {
                    const totalRefunds = order.returns.reduce((sum, r) => sum + Number(r.refundAmount), 0);
                    const totalPayments = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                    await tx.order.update({
                        where: { id: order.id },
                        data: {
                            paidAmount: totalPayments,
                            remainingAmount: round(Math.max(0, order.finalAmount - totalRefunds - totalPayments)),
                        },
                    });
                }
            }
        });

        revalidatePath('/dashboard/customer-payments');
        revalidatePath('/dashboard/orders');
        return { success: true };
    } catch (error: any) {
        console.error('deleteCustomerPayment error:', error);
        return { success: false, error: 'تعذر حذف الدفعة' };
    }
}

export async function getOverdueCustomers() {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewCustomerPayments'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const customers = await prisma.customer.findMany({
            where: { orders: { some: { remainingAmount: { gt: 0 } } } },
            include: {
                orders: {
                    where: { remainingAmount: { gt: 0 } },
                    select: { id: true, orderNumber: true, remainingAmount: true, finalAmount: true, createdAt: true },
                },
            },
        });
        const data = customers.map((c) => ({
            ...c,
            totalDebt: c.orders.reduce((sum, o) => sum + Number(o.remainingAmount), 0),
        }));
        return { success: true, data };
    } catch (error: any) {
        console.error('getOverdueCustomers error:', error);
        return { success: false, error: 'تعذر تحميل العملاء المدينين' };
    }
}
