"use server";

import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { isValidEmail } from "@/lib/email";

export async function getEmailSettings() {
  try {
    const data = await prisma.generalSetting.findFirst({
      orderBy: { id: "asc" },
      select: {
        resendFromEmail: true,
        resendApiKey: true,
        nextPublicAppUrl: true,
        siteName: true,
      },
    });

    return {
      success: true,
      data: {
        resendFromEmail: data?.resendFromEmail || process.env.RESEND_FROM_EMAIL || "",
        resendApiKey: data?.resendApiKey || process.env.RESEND_API_KEY || "",
        nextPublicAppUrl: data?.nextPublicAppUrl || process.env.NEXT_PUBLIC_APP_URL || "",
        siteName: data?.siteName || "Skynova",
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
        siteName: "Skynova",
      },
    };
  }
}

export async function sendEmailToRecipient(input: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const settings = await getEmailSettings();
    const { resendFromEmail, resendApiKey, nextPublicAppUrl, siteName } = settings.data;

    if (!resendApiKey) {
      return { success: false, error: "مفتاح Resend API غير مضبوط" };
    }
    if (!resendFromEmail) {
      return { success: false, error: "عنوان المرسل (From Email) غير مضبوط" };
    }
    if (!isValidEmail(input.to)) {
      return { success: false, error: "عنوان البريد المستلم غير صالح" };
    }

    const resend = new Resend(resendApiKey);
    const from = resendFromEmail.includes(siteName)
      ? resendFromEmail
      : `${siteName} <${resendFromEmail}>`;

    const htmlWithBaseUrl = input.html.replace(
      /\{\{BASE_URL\}\}/g,
      nextPublicAppUrl.replace(/\/$/, "") || ""
    );

    const result = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: htmlWithBaseUrl,
    });

    if (result.error) {
      throw new Error(result.error.message || "Resend: فشل إرسال البريد");
    }

    return { success: true };
  } catch (error: any) {
    console.error("sendEmailToRecipient error:", error);
    return { success: false, error: error?.message || "فشل إرسال البريد" };
  }
}
