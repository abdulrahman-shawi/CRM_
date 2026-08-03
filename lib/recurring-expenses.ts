import "server-only";

import { prisma } from "@/lib/prisma";

// المصاريف المتكررة (isRecurring): يومية تُخصم مع كل بداية يوم، وشهرية مع كل بداية شهر.
// تُطبَّق بشكل كسول عند فتح صفحة المصاريف (getExpenses) وأيضاً عبر lib/cron.ts،
// لذلك يجب أن تبقى idempotent عبر lastRecurringAppliedAt.

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// عدد الفترات المستحقة منذ base حتى now (بتوقيت UTC)
function elapsedPeriods(type: "DAILY" | "MONTHLY", base: Date, now: Date): number {
  if (type === "MONTHLY") {
    return (
      (now.getUTCFullYear() * 12 + now.getUTCMonth()) -
      (base.getUTCFullYear() * 12 + base.getUTCMonth())
    );
  }
  return Math.floor((startOfUtcDay(now) - startOfUtcDay(base)) / 86_400_000);
}

export async function applyRecurringExpenses(): Promise<{ applied: number; totalDeducted: number }> {
  const recurring = await prisma.expense.findMany({
    where: { isRecurring: true, type: { in: ["DAILY", "MONTHLY"] } },
    select: { id: true, type: true, amount: true, createdAt: true, lastRecurringAppliedAt: true },
  });

  const now = new Date();
  let applied = 0;
  let totalDeducted = 0;

  for (const expense of recurring) {
    const base = expense.lastRecurringAppliedAt ?? expense.createdAt;
    const periods = elapsedPeriods(expense.type as "DAILY" | "MONTHLY", base, now);
    if (periods <= 0) continue;

    const deduction = Number((expense.amount * periods).toFixed(2));

    await prisma.$transaction(async (tx) => {
      const settings = await tx.generalSetting.findFirst({
        orderBy: { id: "asc" },
        select: { id: true, cashboxUsd: true },
      });
      const next = Number(((settings?.cashboxUsd ?? 0) - deduction).toFixed(2));
      if (settings) {
        await tx.generalSetting.update({ where: { id: settings.id }, data: { cashboxUsd: next } });
      } else {
        await tx.generalSetting.create({ data: { cashboxUsd: next } });
      }

      await tx.expense.update({
        where: { id: expense.id },
        data: { lastRecurringAppliedAt: now },
      });
    });

    applied += 1;
    totalDeducted += deduction;
  }

  return { applied, totalDeducted: Number(totalDeducted.toFixed(2)) };
}
