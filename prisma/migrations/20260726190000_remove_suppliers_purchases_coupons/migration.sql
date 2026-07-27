-- Remove Suppliers, Purchase Invoices and Coupons domains
ALTER TABLE "Order" DROP COLUMN IF EXISTS "couponId";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "costPrice";
ALTER TABLE "ProductStock" DROP COLUMN IF EXISTS "costPrice";
ALTER TABLE "Permission"
  DROP COLUMN IF EXISTS "viewSuppliers",
  DROP COLUMN IF EXISTS "addSuppliers",
  DROP COLUMN IF EXISTS "editSuppliers",
  DROP COLUMN IF EXISTS "deleteSuppliers",
  DROP COLUMN IF EXISTS "viewPurchaseInvoices",
  DROP COLUMN IF EXISTS "addPurchaseInvoices",
  DROP COLUMN IF EXISTS "editPurchaseInvoices",
  DROP COLUMN IF EXISTS "deletePurchaseInvoices",
  DROP COLUMN IF EXISTS "viewCoupons",
  DROP COLUMN IF EXISTS "addCoupons",
  DROP COLUMN IF EXISTS "editCoupons",
  DROP COLUMN IF EXISTS "deleteCoupons";
DROP TABLE IF EXISTS "purchase_invoice_items";
DROP TABLE IF EXISTS "purchase_invoices";
DROP TABLE IF EXISTS "product_suppliers";
DROP TABLE IF EXISTS "suppliers";
DROP TABLE IF EXISTS "coupons";
DROP TYPE IF EXISTS "CouponStatus";
