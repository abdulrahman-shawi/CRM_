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

function computeCouponStatus(coupon: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }): 'ACTIVE' | 'EXPIRED' | 'DISABLED' {
    if (!coupon.isActive) return 'DISABLED';
    const now = new Date();
    if (coupon.startsAt && now < new Date(coupon.startsAt)) return 'ACTIVE';
    if (coupon.endsAt && now > new Date(coupon.endsAt)) return 'EXPIRED';
    return 'ACTIVE';
}

export async function getCoupons() {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewCoupons'))) {
        return { success: false, error: 'غير مصرح لك بعرض الكوبونات' };
    }
    try {
        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { orders: true } } },
        });
        const data = coupons.map((c) => ({ ...c, status: computeCouponStatus(c) }));
        return { success: true, data };
    } catch (error: any) {
        console.error('getCoupons error:', error);
        return { success: false, error: 'تعذر تحميل الكوبونات' };
    }
}

export async function createCoupon(data: {
    code: string;
    title?: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    maxDiscountValue?: number;
    minOrderAmount?: number;
    usageLimit?: number;
    perCustomerLimit?: number;
    startsAt?: string;
    endsAt?: string;
    isActive?: boolean;
}) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'addCoupons');

    try {
        const code = String(data.code || '').trim().toUpperCase();
        if (!code) return { success: false, error: 'كود الكوبون مطلوب' };
        if (data.discountValue <= 0) return { success: false, error: 'قيمة الخصم يجب أن تكون أكبر من صفر' };

        const coupon = await prisma.coupon.create({
            data: {
                code,
                title: data.title || null,
                discountType: data.discountType,
                discountValue: round(Number(data.discountValue)),
                maxDiscountValue: data.maxDiscountValue ? round(Number(data.maxDiscountValue)) : null,
                minOrderAmount: data.minOrderAmount ? round(Number(data.minOrderAmount)) : null,
                usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
                perCustomerLimit: data.perCustomerLimit ? Number(data.perCustomerLimit) : null,
                startsAt: data.startsAt ? new Date(data.startsAt) : null,
                endsAt: data.endsAt ? new Date(data.endsAt) : null,
                isActive: data.isActive !== false,
            },
        });
        revalidatePath('/dashboard/coupons');
        return { success: true, data: coupon };
    } catch (error: any) {
        console.error('createCoupon error:', error);
        if (error.code === 'P2002') return { success: false, error: 'كود الكوبون مستخدم مسبقاً' };
        return { success: false, error: 'تعذر إنشاء الكوبون' };
    }
}

export async function updateCoupon(id: string, data: {
    code?: string;
    title?: string;
    discountType?: 'PERCENTAGE' | 'FIXED';
    discountValue?: number;
    maxDiscountValue?: number | null;
    minOrderAmount?: number | null;
    usageLimit?: number | null;
    perCustomerLimit?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    isActive?: boolean;
}) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'editCoupons');

    try {
        const coupon = await prisma.coupon.update({
            where: { id },
            data: {
                ...(data.code !== undefined ? { code: String(data.code).trim().toUpperCase() } : {}),
                ...(data.title !== undefined ? { title: data.title || null } : {}),
                ...(data.discountType !== undefined ? { discountType: data.discountType } : {}),
                ...(data.discountValue !== undefined ? { discountValue: round(Number(data.discountValue)) } : {}),
                ...(data.maxDiscountValue !== undefined ? { maxDiscountValue: data.maxDiscountValue === null ? null : round(Number(data.maxDiscountValue)) } : {}),
                ...(data.minOrderAmount !== undefined ? { minOrderAmount: data.minOrderAmount === null ? null : round(Number(data.minOrderAmount)) } : {}),
                ...(data.usageLimit !== undefined ? { usageLimit: data.usageLimit === null ? null : Number(data.usageLimit) } : {}),
                ...(data.perCustomerLimit !== undefined ? { perCustomerLimit: data.perCustomerLimit === null ? null : Number(data.perCustomerLimit) } : {}),
                ...(data.startsAt !== undefined ? { startsAt: data.startsAt ? new Date(data.startsAt) : null } : {}),
                ...(data.endsAt !== undefined ? { endsAt: data.endsAt ? new Date(data.endsAt) : null } : {}),
                ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
            },
        });
        revalidatePath('/dashboard/coupons');
        return { success: true, data: coupon };
    } catch (error: any) {
        console.error('updateCoupon error:', error);
        if (error.code === 'P2002') return { success: false, error: 'كود الكوبون مستخدم مسبقاً' };
        return { success: false, error: 'تعذر تحديث الكوبون' };
    }
}

export async function deleteCoupon(id: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'deleteCoupons');

    try {
        await prisma.coupon.delete({ where: { id } });
        revalidatePath('/dashboard/coupons');
        return { success: true };
    } catch (error: any) {
        console.error('deleteCoupon error:', error);
        return { success: false, error: 'تعذر حذف الكوبون' };
    }
}

export interface ValidateCouponInput {
    code: string;
    customerId: string;
    subTotal: number;
}

export async function validateCoupon(input: ValidateCouponInput) {
    try {
        const code = String(input.code || '').trim().toUpperCase();
        const customerId = String(input.customerId || '').trim();
        const subTotal = round(Number(input.subTotal || 0));
        if (!code || !customerId) return { success: false, error: 'بيانات الكوبون غير كافية' };

        const coupon = await prisma.coupon.findUnique({ where: { code } });
        if (!coupon) return { success: false, error: 'كوبون غير موجود' };
        if (!coupon.isActive) return { success: false, error: 'الكوبون غير مفعّل' };
        if (computeCouponStatus(coupon) !== 'ACTIVE') return { success: false, error: 'الكوبون منتهي الصلاحية' };
        if (coupon.minOrderAmount && subTotal < coupon.minOrderAmount) {
            return { success: false, error: `الحد الأدنى للطلب ${coupon.minOrderAmount}` };
        }
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return { success: false, error: 'تم استنفاد عدد استخدامات الكوبون' };
        }
        if (coupon.perCustomerLimit) {
            const customerUsage = await prisma.order.count({
                where: { couponId: coupon.id, customerId },
            });
            if (customerUsage >= coupon.perCustomerLimit) {
                return { success: false, error: 'لقد استخدمت هذا الكوبون من قبل' };
            }
        }

        let discount = 0;
        if (coupon.discountType === 'PERCENTAGE') {
            discount = subTotal * (coupon.discountValue / 100);
            if (coupon.maxDiscountValue && discount > coupon.maxDiscountValue) discount = coupon.maxDiscountValue;
        } else {
            discount = coupon.discountValue;
        }
        discount = round(Math.min(discount, subTotal));

        return { success: true, data: { couponId: coupon.id, code: coupon.code, discount, discountType: coupon.discountType } };
    } catch (error: any) {
        console.error('validateCoupon error:', error);
        return { success: false, error: 'تعذر التحقق من الكوبون' };
    }
}
