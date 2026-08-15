import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [productsCount, ordersCount, customersCount, categoriesCount] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.customer.count(),
    prisma.category.count(),
  ]);

  const cards = [
    { title: "المنتجات", value: productsCount, href: "/dashboard/products" },
    { title: "الطلبات", value: ordersCount, href: "/dashboard/orders" },
    { title: "العملاء", value: customersCount, href: "/dashboard/customers" },
    { title: "الأقسام", value: categoriesCount, href: "/dashboard/categories" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">لوحة التحكم</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-muted-foreground">{card.title}</p>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
