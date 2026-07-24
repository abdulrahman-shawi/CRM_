"use server";

import { prisma } from "@/lib/prisma";

const warehouseInclude = {
    country: true,
    city: true,
    _count: {
        select: {
            stocks: true,
        },
    },
} as const;

const mapWarehouse = (warehouse: any) => ({
    ...warehouse,
    location: warehouse.country?.name || warehouse.location,
});

const resolveCountryId = (value: unknown) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const resolveCityId = (value: unknown) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getWarehouse = async () => {
    const warehouses = await prisma.warehouse.findMany({
        orderBy: { createdAt: 'desc' },
        include: warehouseInclude,
    });
    return JSON.parse(JSON.stringify(warehouses.map(mapWarehouse)));
}

export const createWarehouse = async (data: any) => {
    try {
        const countryId = resolveCountryId(data.countryId);
        const cityId = resolveCityId(data.cityId);

        if (!countryId) {
            return { success: false, error: "يرجى اختيار بلد المستودع" };
        }

        const country = await prisma.country.findUnique({
            where: { id: countryId },
            select: { id: true, name: true },
        });

        if (!country) {
            return { success: false, error: "البلد المحدد غير موجود" };
        }

        let cityName = country.name;
        if (cityId) {
            const city = await prisma.city.findUnique({
                where: { id: cityId },
                select: { id: true, name: true, countryId: true },
            });
            if (!city) {
                return { success: false, error: "المدينة المحددة غير موجودة" };
            }
            if (city.countryId !== countryId) {
                return { success: false, error: "المدينة لا تنتمي إلى البلد المحدد" };
            }
            cityName = city.name;
        }

        const warehouse = await prisma.warehouse.create({
            data: {
                name: data.name,
                location: cityName,
                countryId: country.id,
                cityId,
            },
            include: warehouseInclude,
        });
        return { success: true, data: mapWarehouse(warehouse) };
    } catch (error: any) {
        console.error("Prisma Error:", error);
        return { success: false, error: "فشل في إنشاء المستودع، يرجى التحقق من المدخلات" };
    }
}

export const updateWarehouse = async (id: string, data: any) => {
    try {
        const countryId = resolveCountryId(data.countryId);
        const cityId = resolveCityId(data.cityId);

        if (!countryId) {
            return { success: false, error: "يرجى اختيار بلد المستودع" };
        }

        const country = await prisma.country.findUnique({
            where: { id: countryId },
            select: { id: true, name: true },
        });

        if (!country) {
            return { success: false, error: "البلد المحدد غير موجود" };
        }

        let cityName = country.name;
        if (cityId) {
            const city = await prisma.city.findUnique({
                where: { id: cityId },
                select: { id: true, name: true, countryId: true },
            });
            if (!city) {
                return { success: false, error: "المدينة المحددة غير موجودة" };
            }
            if (city.countryId !== countryId) {
                return { success: false, error: "المدينة لا تنتمي إلى البلد المحدد" };
            }
            cityName = city.name;
        }

        const warehouse = await prisma.warehouse.update({
            where: { id: Number(id) },
            data: {
                name: data.name,
                location: cityName,
                countryId: country.id,
                cityId,
            },
            include: warehouseInclude,
        });
        return { success: true, data: mapWarehouse(warehouse) };
    } catch (error: any) {
        console.error("Prisma Error:", error);
        return { success: false, error: "فشل في تحديث بيانات المستودع" };
    }   
}

export const deleteWarehouse = async (id: string) => {
    try {
        await prisma.warehouse.delete({
            where: { id: Number(id) },
        });
        return { success: true };
    } catch (error: any) {
        console.error("Prisma Error:", error);
        return { success: false, error: "فشل في حذف المستودع، قد يكون مرتبطًا بسجلات أخرى" };
    }   
}

export const getWarehouseDetails = async (id: string) => {
    try {
        const warehouseId = Number(id);
        if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
            return { success: false, error: "معرف المستودع غير صالح" };
        }

        const [warehouse, stocks, orders, movements] = await prisma.$transaction(async (tx) => {
            const warehouse = await tx.warehouse.findUnique({
                where: { id: warehouseId },
                include: {
                    country: true,
                    city: true,
                    _count: {
                        select: { stocks: true, orders: true, movements: true },
                    },
                },
            });

            if (!warehouse) return [null, null, null, null];

            const stocks = await tx.productStock.findMany({
                where: { warehouseId },
                include: {
                    product: { select: { id: true, name: true, modelNumber: true } },
                },
                orderBy: { quantity: "desc" },
            });

            const orders = await tx.order.findMany({
                where: { warehouseId },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    status: true,
                    finalAmount: true,
                    receiverName: true,
                    receiverPhone: true,
                    createdAt: true,
                    manualCreatedAt: true,
                    customer: { select: { id: true, name: true, phone: true } },
                    user: { select: { id: true, username: true } },
                    items: { select: { quantity: true, price: true, product: { select: { name: true } } } },
                },
                take: 200,
            });

            const movements = await tx.stockMovement.findMany({
                where: { warehouseId },
                orderBy: { createdAt: "desc" },
                include: {
                    product: { select: { id: true, name: true, modelNumber: true } },
                    user: { select: { id: true, username: true } },
                },
                take: 200,
            });

            return [warehouse, stocks, orders, movements];
        });

        if (!warehouse) {
            return { success: false, error: "المستودع غير موجود" };
        }

        return {
            success: true,
            data: {
                warehouse: mapWarehouse(warehouse),
                stocks: JSON.parse(JSON.stringify(stocks)),
                orders: JSON.parse(JSON.stringify(sortOrdersByDisplayDateDesc(orders))),
                movements: JSON.parse(JSON.stringify(movements)),
            },
        };
    } catch (error: any) {
        console.error("Prisma Error:", error);
        return { success: false, error: "فشل في جلب تفاصيل المستودع" };
    }
}

const getOrderSortTimestamp = (orderLike: any) => {
    const dateValue = orderLike?.manualCreatedAt || orderLike?.createdAt;
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return 0;
    return parsed.getTime();
};

const sortOrdersByDisplayDateDesc = <T extends { manualCreatedAt?: Date | null; createdAt?: Date | null }>(orders: T[]) => {
    return [...orders].sort((a, b) => getOrderSortTimestamp(b) - getOrderSortTimestamp(a));
};
