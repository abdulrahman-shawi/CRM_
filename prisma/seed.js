/* eslint-disable */
// Seed: إنشاء مستخدم أدمن مع صلاحية كاملة (كل القيم true)
// التشغيل: npx prisma db seed   أو   node prisma/seed.js
require("dotenv/config");
const bcrypt = require("bcryptjs");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, Prisma } = require("../generated/prisma");

const adapter = new PrismaPg({ connectionString: `${process.env.DATABASE_URL}` });
const prisma = new PrismaClient({ adapter });

// بيانات الأدمن — عدّلها حسب الحاجة
const ADMIN = {
  username: "admin",
  email: "admin@skynova.com",
  password: "admin123",
  phone: "0000000000",
};

async function main() {
  // 1) بناء كائن الصلاحية: كل الحقول من نوع Boolean = true
  const permissionModel = Prisma.dmmf.datamodel.models.find(
    (m) => m.name === "Permission"
  );
  const fullPermissions = {};
  for (const field of permissionModel.fields) {
    if (field.type === "Boolean") fullPermissions[field.name] = true;
  }

  // 2) إنشاء / تحديث صلاحية "أدمن - صلاحيات كاملة"
  let permission = await prisma.permission.findFirst({
    where: { roleName: "أدمن - صلاحيات كاملة" },
  });
  if (permission) {
    permission = await prisma.permission.update({
      where: { id: permission.id },
      data: fullPermissions,
    });
  } else {
    permission = await prisma.permission.create({
      data: { roleName: "أدمن - صلاحيات كاملة", ...fullPermissions },
    });
  }
  console.log(`✅ Permission جاهزة: ${permission.roleName} (${permission.id})`);

  // 3) إنشاء / تحديث مستخدم الأدمن وربطه بالصلاحية
  const hashedPassword = await bcrypt.hash(ADMIN.password, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: {
      username: ADMIN.username,
      phone: ADMIN.phone,
      jobTitle: ADMIN.jobTitle,
      accountType: "ADMIN",
      password: hashedPassword,
      permissionId: permission.id,
    },
    create: {
      username: ADMIN.username,
      email: ADMIN.email,
      phone: ADMIN.phone,
      jobTitle: ADMIN.jobTitle,
      accountType: "ADMIN",
      password: hashedPassword,
      permissionId: permission.id,
    },
  });
  console.log(`✅ Admin جاهز: ${admin.email} (${admin.id})`);
  console.log(`   تسجيل الدخول → email: ${ADMIN.email} / password: ${ADMIN.password}`);
}

main()
  .catch((e) => {
    console.error("❌ فشل الـ seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
