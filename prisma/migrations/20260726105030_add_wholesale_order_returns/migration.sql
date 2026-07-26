-- CreateTable
CREATE TABLE "wholesale_order_returns" (
    "id" TEXT NOT NULL,
    "wholesaleOrderId" INTEGER NOT NULL,
    "reason" "ReturnReason" NOT NULL DEFAULT 'OTHER',
    "reasonNotes" TEXT,
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "warehouseId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wholesale_order_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_order_return_items" (
    "id" TEXT NOT NULL,
    "wholesaleOrderReturnId" TEXT NOT NULL,
    "wholesaleOrderItemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wholesale_order_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wholesale_order_returns_wholesaleOrderId_idx" ON "wholesale_order_returns"("wholesaleOrderId");

-- CreateIndex
CREATE INDEX "wholesale_order_returns_warehouseId_idx" ON "wholesale_order_returns"("warehouseId");

-- CreateIndex
CREATE INDEX "wholesale_order_return_items_wholesaleOrderReturnId_idx" ON "wholesale_order_return_items"("wholesaleOrderReturnId");

-- CreateIndex
CREATE INDEX "wholesale_order_return_items_wholesaleOrderItemId_idx" ON "wholesale_order_return_items"("wholesaleOrderItemId");

-- CreateIndex
CREATE INDEX "wholesale_order_return_items_productId_idx" ON "wholesale_order_return_items"("productId");

-- AddForeignKey
ALTER TABLE "wholesale_order_returns" ADD CONSTRAINT "wholesale_order_returns_wholesaleOrderId_fkey" FOREIGN KEY ("wholesaleOrderId") REFERENCES "wholesale_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_order_returns" ADD CONSTRAINT "wholesale_order_returns_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_order_return_items" ADD CONSTRAINT "wholesale_order_return_items_wholesaleOrderReturnId_fkey" FOREIGN KEY ("wholesaleOrderReturnId") REFERENCES "wholesale_order_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_order_return_items" ADD CONSTRAINT "wholesale_order_return_items_wholesaleOrderItemId_fkey" FOREIGN KEY ("wholesaleOrderItemId") REFERENCES "wholesale_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_order_return_items" ADD CONSTRAINT "wholesale_order_return_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
