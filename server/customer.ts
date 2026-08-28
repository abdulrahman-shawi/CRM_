"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const parseOptionalDate = (value: any) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const customerOrderSelect = {
  id: true,
  orderNumber: true,
  finalAmount: true,
  status: true,
  createdAt: true,
  manualCreatedAt: true,
  user: {
    select: {
      id: true,
      username: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
    },
  },
  items: {
    select: {
      id: true,
      quantity: true,
      price: true,
      discount: true,
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

const customerBaseSelect = {
  id: true,
  name: true,
  phone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const customerListSelect = {
  ...customerBaseSelect,
  _count: {
    select: {
      orders: true,
    },
  },
} as const;

const customerDetailsSelect = {
  ...customerBaseSelect,
  orders: {
    orderBy: {
      createdAt: "desc",
    },
    select: customerOrderSelect,
  },
} as const;

export async function getCustomerList() {
  const res = await prisma.customer.findMany({
    orderBy: {
      createdAt: "desc"
    },
    select: customerListSelect,
  });

  return {
    success: true,
    data: res.map((customer) => ({
      ...customer,
      ordersCount: Number(customer._count?.orders || 0),
    })),
  };
}

export async function getCustomerDetails(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: customerDetailsSelect,
  });

  return { success: Boolean(customer), data: customer };
}

export async function getCustomer() {
  const res = await prisma.customer.findMany({
    orderBy: {
      createdAt: "desc"
    },
    select: {
      ...customerBaseSelect,
      orders: {
        orderBy: {
          createdAt: "desc",
        },
        select: customerOrderSelect,
      },
    }
  });
  return { success: true, data: res };
}

export async function createCustomerAction(data: any, id: string) {
  try {
    // التحقق يدويًا إذا كان الرقم موجودًا مسبقًا في أي مصفوفة
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        phone: {
          hasSome: data.phone // يبحث إذا كان أي رقم في المصفوفة المرسلة موجود مسبقاً
        }
      }
    });

    if (existingCustomer) {
      return { success: false, error: "عذراً، رقم الهاتف هذا مسجل لعميل آخر بالفعل" };
    }

    const existingName = await prisma.customer.findUnique({
      where: { name: data.name },
    });
    if (existingName) {
      return { success: false, error: "عذراً، اسم العميل مسجل مسبقاً" };
    }

    const createdAtFromImport = parseOptionalDate(data?.createdAt || data?.manualCreatedAt);

    const newCustomer = await prisma.customer.create({
      data: {
        name: data.name,
        status: "فرصة جديدة",
        phone: data.phone, // مصفوفة مثل ["05xxxx"]
        ...(createdAtFromImport ? { createdAt: createdAtFromImport } : {}),
      },
    });

    revalidatePath("/dashboard/customers");
    return { success: true, data: newCustomer };
  } catch (error: any) {
    console.error("Prisma Error:", error);
    return { success: false, error: "حدث خطأ أثناء حفظ البيانات" };
  }
}

export async function updateCustomer(data: any, customer: string) {
  try {
    if (data.name) {
      const existingName = await prisma.customer.findFirst({
        where: {
          name: data.name,
          id: { not: customer },
        },
      });
      if (existingName) {
        return { success: false, error: "عذراً، اسم العميل مسجل مسبقاً" };
      }
    }

    const res = await prisma.customer.update({
      where: {
        id: customer,
      },
      data: {
        name: data.name,
        phone: data.phone,
      },
    });

    return { success: true, data: res };
  } catch (error: any) {
    console.error("Update customer error:", error);
    return { success: false, error: error?.message || "حدث خطأ أثناء تحديث البيانات" };
  }
}

export async function UpdateStusa(customer: any, status: any) {
  const requestedStatus = String(status || "").trim();

  if (requestedStatus === "فرصة جديدة") {
    const ordersCount = await prisma.order.count({
      where: { customerId: customer }
    });

    if (ordersCount > 0) {
      const stusas = await prisma.customer.update({
        where: {
          id: customer
        },
        data: {
          status: "تم البيع"
        }
      });

      return {
        success: true,
        data: stusas,
        message: "لا يمكن تحويل العميل إلى فرصة جديدة لوجود طلبات، تم ضبط الحالة إلى تم البيع"
      };
    }
  }

  const stusas = await prisma.customer.update({
    where: {
      id: customer
    },
    data: {
      status: requestedStatus
    }
  })

  return { success: true, data: stusas }
}

export async function deleteCustomer(data: any) {
  try {
    // 1. تحقق أولاً مما إذا كان لدى العميل أي طلبات
    const customerWithOrders = await prisma.customer.findUnique({
      where: { id: data.id },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    });

    if (!customerWithOrders) {
      return { success: false, error: "العميل غير موجود" };
    }

    // 2. إذا كان عدد الطلبات أكبر من صفر، امنع الحذف
    if (customerWithOrders._count.orders > 0) {
      return {
        success: false,
        error: "لا يمكن حذف العميل لوجود طلبات مرتبطة به. يجب حذف الطلبات أولاً."
      };
    }

    // 3. إذا لم توجد طلبات، قم بعملية الحذف
    const res = await prisma.customer.delete({
      where: { id: data.id }
    });

    return { success: true, data: res };

  } catch (error) {
    console.error("Error during deletion:", error);
    return { success: false, error: "حدث خطأ أثناء محاولة الحذف" };
  }
}
