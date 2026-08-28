'use server'

import { decrypt } from "@/lib/auth";
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers";

const AFFILIATE_COOKIE_NAME = 'affiliate-code';

const SOLD_ORDER_STATUSES = new Set(["تم تسليم الطلب", "تم التسليم", "مدفوعة"]);
const PAID_COMMISSION_ORDER_STATUSES = new Set(["تم تسليم الطلب", "تم التسليم", "مدفوعة", "تم البيع"]);

const isSoldOrderStatus = (status: string) => SOLD_ORDER_STATUSES.has(status);
const shouldMarkAffiliateCommissionPaid = (status: string) => PAID_COMMISSION_ORDER_STATUSES.has(String(status || "").trim());

const parseOptionalDate = (value: any) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const getOrderSortTimestamp = (orderLike: any) => {
    const dateValue = orderLike?.manualCreatedAt || orderLike?.createdAt;
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return 0;
    return parsed.getTime();
};

const sortOrdersByDisplayDateDesc = <T extends { manualCreatedAt?: Date | null; createdAt?: Date | null }>(orders: T[]) => {
    return [...orders].sort((a, b) => getOrderSortTimestamp(b) - getOrderSortTimestamp(a));
};

function canViewOrders(user: any) {
    if (!user) return false;
    if (user.accountType === "ADMIN") return true;
    return Boolean(user?.permission?.viewOrders);
}

export async function getCurrentSessionUser() {
    try {
        const session = cookies().get("skynova")?.value;
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

const roundToTwoDecimals = (value: number) => Number(value.toFixed(2));

async function resolveAffiliateCodeFromServerAction(inputCode?: string | null) {
    const normalizedInputCode = String(inputCode || '').trim();
    if (normalizedInputCode) {
        return normalizedInputCode;
    }

    try {
        const cookieValue = cookies().get(AFFILIATE_COOKIE_NAME)?.value;
        return String(cookieValue || '').trim();
    } catch {
        return '';
    }
}

async function applyAffiliateAttribution(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    orderId: number,
    items: any[],
    affiliateCode?: string | null,
) {
    const resolvedCode = await resolveAffiliateCodeFromServerAction(affiliateCode);
    if (!resolvedCode) {
        return;
    }

    const affiliateLink = await tx.affiliateLink.findUnique({
        where: { uniqueCode: resolvedCode },
    });

    if (!affiliateLink) {
        return;
    }

    let conversionsToAdd = 0;

    for (const rawItem of items) {
        const productId = Number(rawItem?.productId || 0);
        if (productId !== affiliateLink.productId) {
            continue;
        }

        const quantity = Number(rawItem?.quantity || 0);
        if (quantity <= 0) {
            continue;
        }

        const orderItem = await tx.orderItem.findFirst({
            where: {
                orderId,
                productId,
                affiliateLinkId: null,
            },
            orderBy: { id: 'asc' },
        });

        if (!orderItem) {
            continue;
        }

        const orderPrice = Number(rawItem?.price || 0);
        const commissionRate = Number(affiliateLink.commissionRate || 0);
        const commissionAmount = roundToTwoDecimals((orderPrice * quantity * commissionRate) / 100);

        await tx.orderItem.update({
            where: { id: orderItem.id },
            data: {
                affiliateLinkId: affiliateLink.id,
            },
        });

        await tx.commission.create({
            data: {
                affiliateLinkId: affiliateLink.id,
                orderId,
                amount: commissionAmount,
                status: 'PENDING',
            },
        });

        conversionsToAdd += 1;
    }

    if (conversionsToAdd > 0) {
        await tx.affiliateLink.update({
            where: { id: affiliateLink.id },
            data: {
                conversions: {
                    increment: conversionsToAdd,
                },
            },
        });
    }
}

/**
 * ترجع قائمة معرفات المستخدمين ضمن نطاق المستخدم الحالي:
 * نفسه + الموظفون المرتبطون به مباشرة عبر parentId.
 */
async function getScopedUserIds(userId: string) {
    const rows = await prisma.user.findMany({
        where: {
            OR: [
                { id: userId },
                { parentId: userId },
            ],
        },
        select: { id: true },
    });

    return rows.map((row) => row.id);
}

const orderItemSelect = {
    id: true,
    quantity: true,
    price: true,
    discount: true,
    productId: true,
    product: {
        select: {
            id: true,
            name: true,
        },
    },
} as const;

const orderBaseSelect = {
    id: true,
    orderNumber: true,
    usdToTryRateAtOrder: true,
    totalAmount: true,
    discount: true,
    finalAmount: true,
    receiverName: true,
    receiverPhone: true,
    fullAddress: true,
    status: true,
    userId: true,
    customerId: true,
    createdAt: true,
    manualCreatedAt: true,
    updatedAt: true,
    user: {
        select: {
            id: true,
            username: true,
            phone: true,
        },
    },
    customer: {
        select: {
            id: true,
            name: true,
            phone: true,
        },
    },
} as const;

const orderListSelect = {
    ...orderBaseSelect,
} as const;

const orderDetailsSelect = {
    ...orderBaseSelect,
    items: {
        select: orderItemSelect,
    },
} as const;

export async function getOrders() {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser) {
        return { success: false, error: "غير مصرح لك بعرض الطلبات" };
    }

    if (!canViewOrders(currentUser)) {
        return { success: false, error: "غير مصرح لك بعرض الطلبات" };
    }

    const isAdminUser = currentUser.accountType === "ADMIN";

    const where: any = {};

    if (!isAdminUser) {
        const scopedUserIds = await getScopedUserIds(currentUser.id);
        where.userId = {
            in: scopedUserIds.length > 0 ? scopedUserIds : [currentUser.id],
        };
    }

    const order = await prisma.order.findMany({
        where,
        orderBy:{createdAt:"desc"},
        select: orderListSelect,
    })

    return {success:true , data:sortOrdersByDisplayDateDesc(order)}
}

export async function getOrdersByUser(userId: any) {
    const orders = await prisma.order.findMany({
        where: {
            // هنا يكمن السر: تصفية النتائج حسب معرف المستخدم
            customerId: userId
        },
        orderBy: { createdAt: "desc" },
        select: orderDetailsSelect,
    })
    return { success: true, data: sortOrdersByDisplayDateDesc(orders) }
}

export async function getOrderById(orderId: string | number) {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser) {
        return { success: false, error: "غير مصرح لك بعرض الطلبات" };
    }

    if (!canViewOrders(currentUser)) {
        return { success: false, error: "غير مصرح لك بعرض الطلبات" };
    }

    const normalizedOrderId = Number(orderId);
    if (Number.isNaN(normalizedOrderId)) {
        return { success: false, error: "معرف الطلب غير صالح" };
    }

    const order = await prisma.order.findUnique({
        where: { id: normalizedOrderId },
        select: orderDetailsSelect,
    });

    if (!order) {
        return { success: false, error: "الطلب غير موجود" };
    }

    const isAdminUser = currentUser.accountType === "ADMIN";

    if (!isAdminUser) {
        const scopedUserIds = await getScopedUserIds(currentUser.id);
        const allowedUserIds = scopedUserIds.length > 0 ? scopedUserIds : [currentUser.id];
        if (!allowedUserIds.includes(String(order.userId))) {
            return { success: false, error: "غير مصرح لك بعرض هذا الطلب" };
        }
    }

    return { success: true, data: order };
}

export async function getOrdersByIds(orderIds: Array<string | number>) {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser) {
        return { success: false, error: "غير مصرح لك بعرض الطلبات" };
    }

    if (!canViewOrders(currentUser)) {
        return { success: false, error: "غير مصرح لك بعرض الطلبات" };
    }

    const normalizedIds = Array.from(
        new Set(
            orderIds
                .map((orderId) => Number(orderId))
                .filter((orderId) => !Number.isNaN(orderId))
        )
    );

    if (normalizedIds.length === 0) {
        return { success: true, data: [] };
    }

    const isAdminUser = currentUser.accountType === "ADMIN";

    const where: any = {
        id: {
            in: normalizedIds,
        },
    };

    if (!isAdminUser) {
        const scopedUserIds = await getScopedUserIds(currentUser.id);
        where.userId = {
            in: scopedUserIds.length > 0 ? scopedUserIds : [currentUser.id],
        };
    }

    const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: orderDetailsSelect,
    });

    return { success: true, data: sortOrdersByDisplayDateDesc(orders) };
}

export async function createOrder(data: any, items: any[], user: any) {
    try {
        const orderNumber = `ORD-${Date.now()}`;
        const manualCreatedAt = parseOptionalDate(data?.manualCreatedAt);
        const affiliateCode = await resolveAffiliateCodeFromServerAction(data?.affiliateCode);

        // إذا لم يصل معرف المستخدم من الواجهة، نستخرجه من الجلسة الحالية
        let userId = user ? String(user) : "";
        if (!userId) {
            const sessionUser = await getCurrentSessionUser();
            userId = sessionUser?.id ? String(sessionUser.id) : "";
        }

        // استخدام Transaction لضمان سلامة البيانات
        const result = await prisma.$transaction(async (tx) => {
            const normalizedItems = items.map((item: any) => ({
                productId: parseInt(item.productId),
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price),
                discount: parseFloat(item.discount || 0),
            }));

            const siteSettings = await tx.generalSetting.findFirst({
                orderBy: { id: "asc" },
                select: { siteCurrency: true, usdToTryRate: true },
            });
            const inputExchangeRate = Number(data.usdToTryRateAtOrder || 0);
            const settingsExchangeRate = Number(siteSettings?.usdToTryRate || 0);
            const siteCurrency = String(siteSettings?.siteCurrency || "").trim();
            const usdToTryRateAtOrder = inputExchangeRate > 0
                ? inputExchangeRate
                : (siteCurrency && siteCurrency !== "USD" && settingsExchangeRate > 0
                    ? settingsExchangeRate
                    : null);

            const finalAmount = roundToTwoDecimals(Number(data.grandTotal || 0));

            // 1. إنشاء الطلب
            const newOrder = await tx.order.create({
                data: {
                    orderNumber,
                    usdToTryRateAtOrder,
                    totalAmount: finalAmount + Number(data.overallDiscount || 0),
                    discount: Number(data.overallDiscount || 0),
                    finalAmount,
                    status: data.status,
                    receiverName: data.receiverName,
                    // ضمان أن receiverPhone مصفوفة حتى لو جاءت قيمة واحدة أو فارغة
                    receiverPhone: Array.isArray(data.receiverPhone)
                        ? data.receiverPhone
                        : data.receiverPhone ? [data.receiverPhone] : [],
                    fullAddress: data.fullAddress,
                    manualCreatedAt,
                    customer: { connect: { id: data.customerId } },
                    ...(userId ? { user: { connect: { id: userId } } } : {}),
                    items: {
                        create: normalizedItems.map((item: any) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                            discount: item.discount,
                        }))
                    }
                }
            });

            await tx.customer.update({
                where: { id: data.customerId },
                data: { status: "تم البيع" }
            });

            await applyAffiliateAttribution(tx, newOrder.id, items, affiliateCode);

            return newOrder;
        });

        return { success: true, order: result };
    } catch (error: any) {
        console.error("Error creating order:", error);
        return { success: false, error: error.message };
    }
}

export async function updateOrder(data: any, id: any, items: any) {
    try {
        // 1. جلب البيانات الأساسية خارج الـ Transaction لتقليل وقت القفل
        const oldOrder = await prisma.order.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!oldOrder) return { success: false, error: "الطلب غير موجود" };

        const result = await prisma.$transaction(async (tx) => {
            const oldOrderSavedRate = Number((oldOrder as any)?.usdToTryRateAtOrder || 0);
            const inputExchangeRate = Number(data.usdToTryRateAtOrder || 0);
            const siteSettings = await tx.generalSetting.findFirst({
                orderBy: { id: "asc" },
                select: { siteCurrency: true, usdToTryRate: true },
            });
            const settingsExchangeRate = Number(siteSettings?.usdToTryRate || 0);
            const siteCurrency = String(siteSettings?.siteCurrency || "").trim();
            const usdToTryRateAtOrder = inputExchangeRate > 0
                ? inputExchangeRate
                : (oldOrderSavedRate > 0
                    ? oldOrderSavedRate
                    : (siteCurrency && siteCurrency !== "USD" && settingsExchangeRate > 0
                        ? settingsExchangeRate
                        : null));
            const manualCreatedAt = parseOptionalDate(data?.manualCreatedAt);
            const normalizedItems = items.map((item: any) => ({
                productId: parseInt(item.productId),
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price),
                discount: parseFloat(item.discount || 0),
            }));

            const baseFinalAmount = Number(data.grandTotal || 0);
            const totalDiscount = Number(data.overallDiscount || 0);

            // ب - تحديث بيانات الطلب الرئيسية والعناصر (حذف وإضافة)
            const updatedOrder = await tx.order.update({
                where: { id },
                data: {
                    usdToTryRateAtOrder,
                    totalAmount: baseFinalAmount + Number(data.overallDiscount || 0),
                    discount: totalDiscount,
                    finalAmount: baseFinalAmount,
                    status: data.status,
                    receiverName: data.receiverName,
                    receiverPhone: data.receiverPhone,
                    fullAddress: data.fullAddress,
                    manualCreatedAt,
                    customer: { connect: { id: data.customerId } },
                    items: {
                        deleteMany: {}, // حذف العناصر السابقة
                        create: normalizedItems.map((item: any) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                            discount: item.discount,
                        }))
                    }
                }
            });

            if (isSoldOrderStatus(data.status)) {
                await tx.customer.update({
                    where: { id: data.customerId },
                    data: { status: "تم البيع" }
                });
            }

            return { success: true, data: updatedOrder };
        }, {
            maxWait: 5000,
            timeout: 20000
        });

        return result;

    } catch (error: any) {
        console.error("Critical Update Error:", error);
        return { success: false, error: "حدث خطأ في قاعدة البيانات، يرجى المحاولة مرة أخرى" };
    }
}

export async function deleteOrder(id: any) {
    try {
        const oldOrder = await prisma.order.findUnique({
            where: { id },
            select: { id: true }
        });

        if (!oldOrder) return { success: false, error: "الطلب غير موجود" };

        // سيحذف العناصر المرتبطة تلقائياً عبر Cascade Delete
        await prisma.order.delete({
            where: { id }
        });

        return { success: true };

    } catch (error: any) {
        console.error("Delete Order Error:", error);
        return {
            success: false,
            error: error.message || "حدث خطأ أثناء محاولة حذف الطلب"
        };
    }
}

export async function updateStaus(status:any , id:any){
    try {
        const nextStatus = String(status || "").trim();
        const orderId = Number(id);

        if (!nextStatus) {
            return { success: false, error: "حالة الطلب غير صالحة" };
        }

        if (!Number.isFinite(orderId)) {
            return { success: false, error: "معرف الطلب غير صالح" };
        }

        const updatedStatus = await prisma.$transaction(async (tx) => {
            const existingOrder = await tx.order.findUnique({
                where: { id: orderId },
                select: { id: true },
            });

            if (!existingOrder) {
                throw new Error("الطلب غير موجود");
            }

            const nextOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: nextStatus,
                },
                select: {
                    id: true,
                    customerId: true,
                    status: true,
                },
            });

            await tx.commission.updateMany({
                where: {
                    orderId,
                    status: {
                        not: "CANCELLED",
                    },
                },
                data: shouldMarkAffiliateCommissionPaid(nextStatus)
                    ? {
                        status: "PAID",
                        paidAt: new Date(),
                    }
                    : {
                        status: "PENDING",
                        paidAt: null,
                    },
            });

            if (isSoldOrderStatus(nextOrder.status)) {
                await tx.customer.update({
                    where: { id: nextOrder.customerId },
                    data: { status: "تم البيع" },
                });
            }

            return { nextOrder };
        });

        return {success :true , data:updatedStatus.nextOrder}
    } catch (error: any) {
        return { success: false, error: error?.message || "فشل تحديث حالة الطلب" };
    }
}
