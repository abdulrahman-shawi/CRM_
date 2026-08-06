'use server';

import { prisma } from "@/lib/prisma";
import { put, del } from '@vercel/blob';
import { revalidatePath } from "next/cache";

type GeneralSettingsInput = {
  siteName?: string;
  siteTitle?: string;
  siteDescription?: string;
  companyEmail?: string;
  companyPhone?: string;
  siteCurrency?: string;
  usdToTryRate?: number | string;
  cashboxUsd?: number | string;
  logo?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  topBannerText?: string;
  primaryColor?: string;
  secondaryColor?: string;
  resendFromEmail?: string;
  resendApiKey?: string;
  nextPublicAppUrl?: string;
  whatsappCloudApiToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappApiVersion?: string;
};

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^a-z0-9.]/gi, '_')
    .toLowerCase();
}

async function uploadSingleFile(file: File, folder: string) {
  const fileName = `${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const blob = await put(fileName, file, {
    access: 'public',
  });
  return blob.url;
}

export async function getEmailSettings() {
  try {
    const data = await prisma.generalSetting.findFirst({
      orderBy: { id: "asc" },
      select: {
        resendFromEmail: true,
        resendApiKey: true,
        nextPublicAppUrl: true,
      },
    });

    return {
      success: true,
      data: {
        resendFromEmail: data?.resendFromEmail || process.env.RESEND_FROM_EMAIL || "",
        resendApiKey: data?.resendApiKey || process.env.RESEND_API_KEY || "",
        nextPublicAppUrl: data?.nextPublicAppUrl || process.env.NEXT_PUBLIC_APP_URL || "",
      },
    };
  } catch (error) {
    console.error("getEmailSettings error:", error);
    return {
      success: true,
      data: {
        resendFromEmail: process.env.RESEND_FROM_EMAIL || "",
        resendApiKey: process.env.RESEND_API_KEY || "",
        nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || "",
      },
    };
  }
}

export async function getGeneralSettings() {
  try {
    const data = await prisma.generalSetting.findFirst({
      orderBy: { id: "asc" }
    });

    return { success: true, data };
  } catch (error) {
    console.error("getGeneralSettings error:", error);
    return { success: false, error: "فشل في جلب الإعدادات العامة" };
  }
}

export async function upsertGeneralSettings(formData: FormData) {
  try {
    const existing = await prisma.generalSetting.findFirst({
      orderBy: { id: "asc" },
      select: { id: true, logo: true, favicon: true }
    });

    const siteName = String(formData.get('siteName') || '').trim() || null;
    const siteTitle = String(formData.get('siteTitle') || '').trim() || null;
    const siteDescription = String(formData.get('siteDescription') || '').trim() || null;
    const companyEmail = String(formData.get('companyEmail') || '').trim() || null;
    const companyPhone = String(formData.get('companyPhone') || '').trim() || null;
    const siteCurrency = String(formData.get('siteCurrency') || 'USD').trim() || 'USD';
    const usdToTryRate = Number(formData.get('usdToTryRate') || 0);
    const cashboxUsd = Number(formData.get('cashboxUsd') || 0);
    const facebookUrl = String(formData.get('facebookUrl') || '').trim() || null;
    const instagramUrl = String(formData.get('instagramUrl') || '').trim() || null;
    const topBannerText = String(formData.get('topBannerText') || '').trim() || null;
    const primaryColor = String(formData.get('primaryColor') || '#10b981').trim() || '#10b981';
    const secondaryColor = String(formData.get('secondaryColor') || '#0f766e').trim() || '#0f766e';
    const resendFromEmail = String(formData.get('resendFromEmail') || '').trim() || null;
    const resendApiKey = String(formData.get('resendApiKey') || '').trim() || null;
    const nextPublicAppUrl = String(formData.get('nextPublicAppUrl') || '').trim() || null;
    const whatsappCloudApiToken = String(formData.get('whatsappCloudApiToken') || '').trim() || null;
    const whatsappPhoneNumberId = String(formData.get('whatsappPhoneNumberId') || '').trim() || null;
    const whatsappApiVersion = String(formData.get('whatsappApiVersion') || '').trim() || null;

    let logoUrl: string | undefined;
    const logoFile = formData.get('logo');
    if (logoFile instanceof File && logoFile.size > 0) {
      logoUrl = await uploadSingleFile(logoFile, 'logos');

      if (existing?.logo) {
        try { await del(existing.logo); } catch (e) { console.error(e); }
      }
    } else {
      const logoText = formData.get('logo') as string | null;
      if (logoText && logoText.startsWith('http')) {
        logoUrl = logoText;
      }
    }

    let faviconUrl: string | undefined;
    const faviconFile = formData.get('favicon');
    if (faviconFile instanceof File && faviconFile.size > 0) {
      faviconUrl = await uploadSingleFile(faviconFile, 'favicons');

      if (existing?.favicon) {
        try { await del(existing.favicon); } catch (e) { console.error(e); }
      }
    } else {
      const faviconText = formData.get('favicon') as string | null;
      if (faviconText && faviconText.startsWith('http')) {
        faviconUrl = faviconText;
      }
    }

    const data: any = {
      siteName,
      siteTitle,
      siteDescription,
      companyEmail,
      companyPhone,
      siteCurrency,
      usdToTryRate,
      cashboxUsd,
      facebookUrl,
      instagramUrl,
      topBannerText,
      primaryColor,
      secondaryColor,
      resendFromEmail,
      resendApiKey,
      nextPublicAppUrl,
      whatsappCloudApiToken,
      whatsappPhoneNumberId,
      whatsappApiVersion,
      ...(logoUrl ? { logo: logoUrl } : {}),
      ...(faviconUrl ? { favicon: faviconUrl } : {}),
    };

    const saved = existing
      ? await prisma.generalSetting.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.generalSetting.create({
          data,
        });

    revalidatePath('/dashboard/settings');
    // تحديث الكاش على مستوى الـ layout حتى تنعكس تغييرات metadata (العنوان/الوصف) فورًا
    revalidatePath('/', 'layout');
    return { success: true, data: saved };
  } catch (error) {
    console.error("upsertGeneralSettings error:", error);
    return { success: false, error: "فشل في حفظ الإعدادات العامة" };
  }
}
