import "server-only";
import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { applyRecurringExpenses } from "@/lib/recurring-expenses";

declare global {
  // eslint-disable-next-line no-var
  var __monthlyTargetCronStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __recurringExpensesCronStarted: boolean | undefined;
}

if (!global.__monthlyTargetCronStarted) {
  global.__monthlyTargetCronStarted = true;

  cron.schedule(
    "0 0 1 * *",
    async () => {
      try {
        await prisma.userTarget.updateMany({
          where: { isActive: true },
          data: { isActive: false, endedAt: new Date() },
        });
      } catch (error) {
        console.error("Monthly target freeze failed:", error);
      }
    },
    {
      timezone: "UTC",
    }
  );
}

// المصاريف المتكررة: فحص يومي بعد منتصف الليل UTC — يخصم اليومية كل يوم والشهرية مع بداية كل شهر.
// الدالة idempotent عبر lastRecurringAppliedAt، وتُستدعى أيضاً بشكل كسول من getExpenses.
if (!global.__recurringExpensesCronStarted) {
  global.__recurringExpensesCronStarted = true;

  cron.schedule(
    "5 0 * * *",
    async () => {
      try {
        await applyRecurringExpenses();
      } catch (error) {
        console.error("Recurring expenses cron failed:", error);
      }
    },
    {
      timezone: "UTC",
    }
  );
}
