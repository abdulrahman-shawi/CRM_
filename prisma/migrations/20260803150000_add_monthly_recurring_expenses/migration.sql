-- AlterEnum
ALTER TYPE "ExpenseType" ADD VALUE 'MONTHLY';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastRecurringAppliedAt" TIMESTAMP(3);
