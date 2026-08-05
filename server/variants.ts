'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getColors() {
    const colors = await prisma.color.findMany({
        orderBy: { name: 'asc' },
    });
    return JSON.parse(JSON.stringify(colors));
}

export async function createColor(name: string, hexCode?: string | null) {
    try {
        const normalizedName = String(name || '').trim();
        if (!normalizedName) {
            return { success: false, error: "اسم اللون مطلوب" };
        }

        const normalizedHex = String(hexCode || '').trim() || null;
        if (normalizedHex && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalizedHex)) {
            return { success: false, error: "كود اللون غير صالح (مثال: #FF0000)" };
        }

        const color = await prisma.color.create({
            data: { name: normalizedName, hexCode: normalizedHex },
        });

        revalidatePath('/dashboard/products');
        return { success: true, data: JSON.parse(JSON.stringify(color)) };
    } catch (error: any) {
        console.error("Prisma Error:", error);
        if (error.code === 'P2002') {
            return { success: false, error: "هذا اللون موجود بالفعل" };
        }
        return { success: false, error: "فشل في إنشاء اللون" };
    }
}

export async function deleteColor(id: number) {
    try {
        await prisma.color.delete({ where: { id: Number(id) } });
        revalidatePath('/dashboard/products');
        return { success: true };
    } catch (error) {
        console.error("Prisma Error:", error);
        return { success: false, error: "فشل حذف اللون" };
    }
}

export async function getSizes() {
    const sizes = await prisma.size.findMany({
        orderBy: { name: 'asc' },
    });
    return JSON.parse(JSON.stringify(sizes));
}

export async function createSize(name: string) {
    try {
        const normalizedName = String(name || '').trim();
        if (!normalizedName) {
            return { success: false, error: "اسم المقاس مطلوب" };
        }

        const size = await prisma.size.create({
            data: { name: normalizedName },
        });

        revalidatePath('/dashboard/products');
        return { success: true, data: JSON.parse(JSON.stringify(size)) };
    } catch (error: any) {
        console.error("Prisma Error:", error);
        if (error.code === 'P2002') {
            return { success: false, error: "هذا المقاس موجود بالفعل" };
        }
        return { success: false, error: "فشل في إنشاء المقاس" };
    }
}

export async function deleteSize(id: number) {
    try {
        await prisma.size.delete({ where: { id: Number(id) } });
        revalidatePath('/dashboard/products');
        return { success: true };
    } catch (error) {
        console.error("Prisma Error:", error);
        return { success: false, error: "فشل حذف المقاس" };
    }
}
