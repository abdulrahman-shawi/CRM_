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

// ─── Suppliers ───

export async function getSuppliers() {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewSuppliers'))) {
        return { success: false, error: 'غير مصرح لك بعرض الموردين' };
    }
    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { invoices: true, products: true },
                },
            },
        });
        return { success: true, data: suppliers };
    } catch (error: any) {
        console.error('getSuppliers error:', error);
        return { success: false, error: 'تعذر تحميل الموردين' };
    }
}

export async function getSupplier(id: string) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewSuppliers'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: {
                _count: { select: { invoices: true, products: true } },
            },
        });
        if (!supplier) return { success: false, error: 'المورد غير موجود' };
        return { success: true, data: supplier };
    } catch (error: any) {
        console.error('getSupplier error:', error);
        return { success: false, error: 'تعذر تحميل المورد' };
    }
}

export async function createSupplier(data: { name: string; phone?: string; email?: string; address?: string; notes?: string }) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'addSuppliers');

    try {
        const name = String(data.name || '').trim();
        if (!name) return { success: false, error: 'اسم المورد مطلوب' };

        const supplier = await prisma.supplier.create({
            data: {
                name,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                notes: data.notes || null,
            },
        });
        revalidatePath('/dashboard/suppliers');
        return { success: true, data: supplier };
    } catch (error: any) {
        console.error('createSupplier error:', error);
        if (error.code === 'P2002') return { success: false, error: 'اسم المورد مستخدم مسبقاً' };
        return { success: false, error: 'تعذر إنشاء المورد' };
    }
}

export async function updateSupplier(id: string, data: { name?: string; phone?: string; email?: string; address?: string; notes?: string }) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'editSuppliers');

    try {
        const name = data.name ? String(data.name).trim() : undefined;
        if (name === '') return { success: false, error: 'اسم المورد مطلوب' };

        const supplier = await prisma.supplier.update({
            where: { id },
            data: {
                ...(name !== undefined ? { name } : {}),
                phone: data.phone !== undefined ? data.phone || null : undefined,
                email: data.email !== undefined ? data.email || null : undefined,
                address: data.address !== undefined ? data.address || null : undefined,
                notes: data.notes !== undefined ? data.notes || null : undefined,
            },
        });
        revalidatePath('/dashboard/suppliers');
        return { success: true, data: supplier };
    } catch (error: any) {
        console.error('updateSupplier error:', error);
        if (error.code === 'P2002') return { success: false, error: 'اسم المورد مستخدم مسبقاً' };
        return { success: false, error: 'تعذر تحديث المورد' };
    }
}

export async function deleteSupplier(id: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'deleteSuppliers');

    try {
        await prisma.supplier.delete({ where: { id } });
        revalidatePath('/dashboard/suppliers');
        return { success: true };
    } catch (error: any) {
        console.error('deleteSupplier error:', error);
        return { success: false, error: 'تعذر حذف المورد. قد يكون مرتبطاً بفواتير أو منتجات.' };
    }
}

// ─── Product cost/supplier links ───

export async function getProductSuppliers(productId: number) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewSuppliers'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const rows = await prisma.productSupplier.findMany({
            where: { productId },
            include: { supplier: true },
            orderBy: { isDefault: 'desc' },
        });
        return { success: true, data: rows };
    } catch (error: any) {
        console.error('getProductSuppliers error:', error);
        return { success: false, error: 'تعذر تحميل أسعار الشراء' };
    }
}

export async function getSupplierProducts(supplierId: string) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewSuppliers'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const rows = await prisma.productSupplier.findMany({
            where: { supplierId },
            include: { product: { select: { id: true, name: true, modelNumber: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return { success: true, data: rows };
    } catch (error: any) {
        console.error('getSupplierProducts error:', error);
        return { success: false, error: 'تعذر تحميل منتجات المورد' };
    }
}

export async function setProductSupplier(data: {
    productId: number;
    supplierId: string;
    costPrice: number;
    sku?: string;
    notes?: string;
    isDefault?: boolean;
}) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'editSuppliers');

    try {
        const productId = Number(data.productId);
        const supplierId = String(data.supplierId || '').trim();
        const costPrice = round(Number(data.costPrice || 0));
        if (!productId || !supplierId) return { success: false, error: 'المنتج والمورد مطلوبان' };

        const upsert = await prisma.productSupplier.upsert({
            where: { productId_supplierId: { productId, supplierId } },
            create: {
                productId,
                supplierId,
                costPrice,
                sku: data.sku || null,
                notes: data.notes || null,
                isDefault: Boolean(data.isDefault),
            },
            update: {
                costPrice,
                sku: data.sku !== undefined ? data.sku || null : undefined,
                notes: data.notes !== undefined ? data.notes || null : undefined,
                isDefault: data.isDefault !== undefined ? Boolean(data.isDefault) : undefined,
            },
        });

        if (data.isDefault) {
            await prisma.product.update({
                where: { id: productId },
                data: { costPrice },
            });
        }

        revalidatePath('/dashboard/products');
        return { success: true, data: upsert };
    } catch (error: any) {
        console.error('setProductSupplier error:', error);
        return { success: false, error: 'تعذر ربط المورد بالمنتج' };
    }
}

export async function removeProductSupplier(productId: number, supplierId: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'editSuppliers');

    try {
        await prisma.productSupplier.delete({
            where: { productId_supplierId: { productId, supplierId } },
        });
        revalidatePath('/dashboard/products');
        return { success: true };
    } catch (error: any) {
        console.error('removeProductSupplier error:', error);
        return { success: false, error: 'تعذر إزالة ربط المورد' };
    }
}

// ─── Purchase Invoices ───

export async function getPurchaseInvoices() {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewPurchaseInvoices'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const invoices = await prisma.purchaseInvoice.findMany({
            orderBy: { invoiceDate: 'desc' },
            include: {
                supplier: true,
                createdBy: { select: { username: true } },
                items: {
                    include: { product: { select: { id: true, name: true } }, warehouse: { select: { id: true, name: true } } },
                },
            },
        });
        return { success: true, data: invoices };
    } catch (error: any) {
        console.error('getPurchaseInvoices error:', error);
        return { success: false, error: 'تعذر تحميل فواتير الشراء' };
    }
}

export async function createPurchaseInvoice(data: {
    invoiceNumber: string;
    supplierId: string;
    invoiceDate?: string;
    notes?: string;
    items: Array<{ productId: number; quantity: number; costPrice: number; warehouseId?: number }>;
}) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'addPurchaseInvoices');

    try {
        const invoiceNumber = String(data.invoiceNumber || '').trim();
        const supplierId = String(data.supplierId || '').trim();
        if (!invoiceNumber) return { success: false, error: 'رقم فاتورة الشراء مطلوب' };
        if (!supplierId) return { success: false, error: 'المورد مطلوب' };
        if (!Array.isArray(data.items) || data.items.length === 0) return { success: false, error: 'يجب إضافة صنف واحد على الأقل' };

        const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : new Date();
        const totalAmount = round(data.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.costPrice || 0), 0));

        const result = await prisma.$transaction(async (tx) => {
            const invoice = await tx.purchaseInvoice.create({
                data: {
                    invoiceNumber,
                    supplierId,
                    totalAmount,
                    paidAmount: 0,
                    remainingAmount: totalAmount,
                    invoiceDate,
                    notes: data.notes || null,
                    createdById: user.id,
                    items: {
                        create: data.items.map((item) => ({
                            productId: Number(item.productId),
                            quantity: Number(item.quantity || 0),
                            costPrice: round(Number(item.costPrice || 0)),
                            totalPrice: round(Number(item.quantity || 0) * Number(item.costPrice || 0)),
                            warehouseId: item.warehouseId ? Number(item.warehouseId) : null,
                        })),
                    },
                },
                include: { items: true },
            });

            for (const item of invoice.items) {
                const stock = await tx.productStock.findUnique({
                    where: { productId_warehouseId: { productId: item.productId, warehouseId: item.warehouseId || 1 } },
                });
                if (stock) {
                    await tx.productStock.update({
                        where: { id: stock.id },
                        data: { quantity: stock.quantity + item.quantity, costPrice: item.costPrice },
                    });
                } else if (item.warehouseId) {
                    await tx.productStock.create({
                        data: {
                            productId: item.productId,
                            warehouseId: item.warehouseId,
                            quantity: item.quantity,
                            costPrice: item.costPrice,
                        },
                    });
                }

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: item.warehouseId || 1,
                        userId: user.id,
                        quantity: item.quantity,
                        type: 'IN',
                        reason: `فاتورة شراء ${invoiceNumber}`,
                    },
                });
            }

            return invoice;
        });

        revalidatePath('/dashboard/purchase-invoices');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('createPurchaseInvoice error:', error);
        if (error.code === 'P2002') return { success: false, error: 'رقم الفاتورة مستخدم مسبقاً' };
        return { success: false, error: 'تعذر إنشاء فاتورة الشراء' };
    }
}

export async function deletePurchaseInvoice(id: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'deletePurchaseInvoices');

    try {
        await prisma.$transaction(async (tx) => {
            const invoice = await tx.purchaseInvoice.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!invoice) throw new Error('الفاتورة غير موجودة');

            for (const item of invoice.items) {
                const stock = await tx.productStock.findUnique({
                    where: { productId_warehouseId: { productId: item.productId, warehouseId: item.warehouseId || 1 } },
                });
                if (stock) {
                    await tx.productStock.update({
                        where: { id: stock.id },
                        data: { quantity: Math.max(0, stock.quantity - item.quantity) },
                    });
                }
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: item.warehouseId || 1,
                        userId: user.id,
                        quantity: item.quantity,
                        type: 'OUT',
                        reason: `حذف فاتورة شراء ${invoice.invoiceNumber}`,
                    },
                });
            }

            await tx.purchaseInvoice.delete({ where: { id } });
        });

        revalidatePath('/dashboard/purchase-invoices');
        return { success: true };
    } catch (error: any) {
        console.error('deletePurchaseInvoice error:', error);
        return { success: false, error: 'تعذر حذف فاتورة الشراء' };
    }
}

export async function getProductCostInfo(productId: number) {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewSuppliers'))) {
        return { success: false, error: 'غير مصرح' };
    }
    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, name: true, costPrice: true },
        });
        const suppliers = await prisma.productSupplier.findMany({
            where: { productId },
            include: { supplier: { select: { id: true, name: true } } },
            orderBy: { costPrice: 'asc' },
        });
        return { success: true, data: { product, suppliers } };
    } catch (error: any) {
        console.error('getProductCostInfo error:', error);
        return { success: false, error: 'تعذر تحميل بيانات التكلفة' };
    }
}
