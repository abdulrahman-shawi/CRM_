import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { decrypt } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/utils";

const toArray = (value: unknown): any[] => (Array.isArray(value) ? value : []);

// أسماء الجداول كما تظهر في عميل Prisma (أول حرف صغير)
const delegateName = (modelName: string) =>
  modelName.charAt(0).toLowerCase() + modelName.slice(1);

const dmmfModels: any[] = (Prisma as any).dmmf?.datamodel?.models ?? [];

// ترتيب الجداول هرمياً: الجداول المُشار إليها (الآباء) قبل الجداول المرتبطة بها (الأبناء)
// حتى ينجح الحذف العكسي والإدخال بالترتيب دون كسر العلاقات Foreign Key.
// يُبنى الترتيب من علاقات قاعدة البيانات الفعلية (information_schema) وليس من افتراضات.
async function getSortedModels(): Promise<any[]> {
  const tableOf = (model: any) => model.dbName ?? model.name;
  const modelsByTable = new Map<string, any>(
    dmmfModels.map((model) => [tableOf(model), model])
  );

  const fkRows = await prisma.$queryRawUnsafe<Array<{ child: string; parent: string }>>(
    `SELECT kcu.table_name AS child, ccu.table_name AS parent
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.constraint_schema
     WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`
  );

  // خريطة الاعتماديات: الجدول الابن يعتمد على الجدول الأب
  const deps = new Map<string, Set<string>>();
  for (const row of fkRows) {
    if (!modelsByTable.has(row.child) || !modelsByTable.has(row.parent)) continue;
    if (row.child === row.parent) continue; // علاقة ذاتية (مثل User.parentId)
    if (!deps.has(row.child)) deps.set(row.child, new Set());
    deps.get(row.child)!.add(row.parent);
  }

  const sorted: any[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (model: any) => {
    const table = tableOf(model);
    if (visited.has(table) || visiting.has(table)) return;
    visiting.add(table);
    for (const dep of Array.from(deps.get(table) ?? new Set<string>())) {
      const depModel = modelsByTable.get(dep);
      if (depModel) visit(depModel);
    }
    visiting.delete(table);
    visited.add(table);
    sorted.push(model);
  };

  for (const model of dmmfModels) visit(model);
  return sorted;
}

// توافق مع ملفات التصدير القديمة التي كانت تستخدم أسماء جمع
const LEGACY_KEY_BY_DELEGATE: Record<string, string> = {
  country: "countries",
  permission: "permissions",
  user: "users",
  category: "categories",
  product: "products",
  productImage: "productImages",
  warehouse: "warehouses",
  productStock: "productStocks",
  stockMovement: "stockMovements",
  userTarget: "userTargets",
  targetProduct: "targetProducts",
  trakingCompany: "trackingCompanies",
  generalSetting: "generalSettings",
  customer: "customers",
  message: "messages",
  order: "orders",
  orderItem: "orderItems",
};

async function getSessionUser() {
  try {
    const session = cookies().get("skynova")?.value;
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

async function requireBackupAccess() {
  const user = await getSessionUser();
  if (!user || (!isAdmin(user) && !hasPermission(user, "manageBackups"))) return null;
  return user;
}

export async function GET() {
  try {
    const user = await requireBackupAccess();
    if (!user) {
      return NextResponse.json({ success: false, error: "غير مصرح لك بتصدير البيانات" }, { status: 403 });
    }

    const sortedModels = await getSortedModels();
    const data: Record<string, any[]> = {};

    for (const model of sortedModels) {
      const delegate = delegateName(model.name);
      data[delegate] = await (prisma as any)[delegate].findMany();
    }

    // روابط many-to-many الضمنية بين العملاء والمستخدمين
    const customerLinkRows = await prisma.customer.findMany({
      select: { id: true, users: { select: { id: true } } },
    });
    data.customerUserLinks = customerLinkRows.flatMap((row) =>
      row.users.map((user) => ({ customerId: row.id, userId: user.id }))
    );

    const payload = {
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      data,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Data export failed:", error);
    return NextResponse.json({ success: false, error: "فشل في تصدير البيانات" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireBackupAccess();
    if (!user) {
      return NextResponse.json({ success: false, error: "غير مصرح لك باستيراد البيانات" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const replaceExisting = String(formData.get("replace") ?? "true") !== "false";

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "ملف الاستيراد غير صالح" }, { status: 400 });
    }

    const text = await file.text();
    const parsed = JSON.parse(text);
    const data = parsed?.data ?? parsed;

    const sortedModels = await getSortedModels();

    await prisma.$transaction(
      async (tx) => {
        // حذف البيانات الحالية بترتيب عكسي (الأبناء قبل الآباء)
        if (replaceExisting) {
          for (const model of [...sortedModels].reverse()) {
            await (tx as any)[delegateName(model.name)].deleteMany();
          }
        }

        // إدخال البيانات بترتيب هرمي (الآباء قبل الأبناء)
        for (const model of sortedModels) {
          const delegate = delegateName(model.name);
          const legacyKey = LEGACY_KEY_BY_DELEGATE[delegate];
          const rows = toArray(data?.[delegate] ?? (legacyKey ? data?.[legacyKey] : undefined));
          if (!rows.length) continue;

          // المستخدمون المرتبطون بمدير (parentId) يجب أن يأتي المدير أولاً
          if (delegate === "user") {
            rows.sort((a, b) => (a?.parentId ? 1 : 0) - (b?.parentId ? 1 : 0));
          }

          await (tx as any)[delegate].createMany({ data: rows, skipDuplicates: true });
        }

        // إعادة ربط العملاء بالمستخدمين (علاقة many-to-many ضمنية)
        const customerUserLinks = toArray(data?.customerUserLinks);
        for (const link of customerUserLinks) {
          const customerId = String(link?.customerId || "");
          const userId = String(link?.userId || "");
          if (!customerId || !userId) continue;

          await tx.customer
            .update({
              where: { id: customerId },
              data: { users: { connect: { id: userId } } },
            })
            .catch(() => {});
        }

        // إعادة ضبط عدادات الترقيم التلقائي لكل الجداول
        for (const model of sortedModels) {
          const tableName = model.dbName ?? model.name;
          await tx.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tableName}"), 1), true) WHERE pg_get_serial_sequence('"${tableName}"', 'id') IS NOT NULL;`
          );
        }
      },
      { timeout: 120000, maxWait: 20000 }
    );

    return NextResponse.json({ success: true, message: "تم استيراد البيانات بنجاح" });
  } catch (error) {
    console.error("Data import failed:", error);
    return NextResponse.json({ success: false, error: "فشل في استيراد البيانات" }, { status: 500 });
  }
}
