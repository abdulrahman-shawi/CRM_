'use server';

import { decrypt, encrypt } from "@/lib/auth";
import { isAffiliateAccount } from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs"; //

export async function getalluser() {
  const users = await prisma.user.findMany({
    include:{
      permission:true,
    }
  });

  return users;
}


export async function getMe() {
  try {
    const session = cookies().get("skynova")?.value;
    if (!session) return null;

    const decoded = await decrypt(session);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        accountType: true,
        phone: true,
        avatar: true,
      },
    });

    return user;
  } catch (err) {
    return null;
  }
}

export async function logout() {
  cookies().set("skynova", "", { expires: new Date(0), httpOnly: true });
  return { success: true };
}

export async function login(data: { name: string; password: string; }) {
  // 1. البحث عن المستخدم بالاسم فقط
  const user = await prisma.user.findFirst({
    where: { username: data.name },
  });

  // 2. التحقق من وجود المستخدم ومطابقة كلمة المرور المشفرة
  if (!user || !(await bcrypt.compare(data.password, user.password))) { //
    return { error: "خطأ في اسم المستخدم أو كلمة المرور" };
  }

  // 3. إكمال إجراءات الجلسة (JWT & Cookies)
  const expires = new Date(Date.now() + 30 * 60 * 60 * 1000);
  const session = await encrypt({ userId: user.id, username: user.username, email: user.email, expires });
  cookies().set("skynova", session, { expires, httpOnly: true });

  return { success: true };
}

export async function createuser(data: any) {
  try {
    const accountType = data.accountType;
    const isAffiliate = isAffiliateAccount(accountType, data.isAffiliate);
    // 1. تشفير كلمة المرور (Salt rounds = 10)
    const hashedPassword = await bcrypt.hash(data.password, 10); //

    // 2. إنشاء المستخدم في قاعدة البيانات
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword, // حفظ الكلمة المشفرة
        phone: data.phone || null,
        accountType,
        isAffiliate,
        affiliateApproved: false,
        affiliateRequestedAt: isAffiliate ? new Date() : null,
        affiliateApprovedAt: null,
        // الربط مع جدول الصلاحيات باستخدام المعرف (ID)
        permission: {
          connect: { id: data.permissions }
        }
      },
    });

    return { success: true, data: user };
  } catch (error: any) {
    console.error("Prisma Error:", error);

    // معالجة خطأ تكرار البريد الإلكتروني
    if (error.code === 'P2002') {
      return { success: false, error: "هذا البريد الإلكتروني مستخدم بالفعل" };
    }

    return { success: false, error: "فشل في إنشاء المستخدم، يرجى التحقق من المدخلات" };
  }
}

export async function updateuser(id: string, data: any) {
  try {
    const accountType = data.accountType;
    const isAffiliate = isAffiliateAccount(accountType, data.isAffiliate);
    const updateData: any = {
      username: data.username,
      email: data.email,
      phone: data.phone || null,
      ...(typeof data.avatar === "string" ? { avatar: data.avatar } : {}),
      accountType,
      isAffiliate,
      permission: {
        connect: { id: data.permissions }
      }
    };
    if (isAffiliate) {
      updateData.affiliateRequestedAt = data.affiliateRequestedAt ? new Date(data.affiliateRequestedAt) : new Date();
    } else {
      updateData.affiliateApproved = false;
      updateData.affiliateRequestedAt = null;
      updateData.affiliateApprovedAt = null;
    }
    // تحديث كلمة المرور فقط إذا تم توفير واحدة جديدة
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10); //
    }
    const user = await prisma.user.update({
      where: { id: id },
      data: updateData,
    });
    return { success: true, data: user };
  } catch (error: any) {
    console.error("Prisma Error:", error);
    return { success: false, error: "فشل في تحديث بيانات المستخدم" };
  }
}

export async function deleteuser(id: string) {
  try {
    await prisma.user.delete({ where: { id: id } });
    return { success: true };
  } catch (error) {
    return { success: false, error: "فشل في حذف المستخدم" };
  }
}
