// WhatsApp Cloud API helpers (Meta Graph API)
// المستخدم في الحملات التسويقية الجماعية ومشاركة الفواتير
// الأولوية للقيم المخزنة في صفحة الإعدادات (GeneralSetting) ثم متغيرات البيئة:
// WHATSAPP_CLOUD_API_TOKEN (أو WHATSAPP_TOKEN), WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_VERSION (اختياري)

import { prisma } from "@/lib/prisma";

type WhatsAppConfig = {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
};

export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  let settings: {
    whatsappCloudApiToken: string | null;
    whatsappPhoneNumberId: string | null;
    whatsappApiVersion: string | null;
  } | null = null;

  try {
    settings = await prisma.generalSetting.findFirst({
      orderBy: { id: "asc" },
      select: {
        whatsappCloudApiToken: true,
        whatsappPhoneNumberId: true,
        whatsappApiVersion: true,
      },
    });
  } catch (error) {
    console.error("getWhatsAppConfig settings error:", error);
  }

  const token = settings?.whatsappCloudApiToken || process.env.WHATSAPP_CLOUD_API_TOKEN || process.env.WHATSAPP_TOKEN;
  const phoneNumberId = settings?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = settings?.whatsappApiVersion || process.env.WHATSAPP_API_VERSION || "v21.0";

  if (!token || !phoneNumberId) return null;
  return { token, phoneNumberId, apiVersion };
}

/**
 * تطبيع رقم الهاتف لصيغة واتساب الدولية (أرقام فقط بدون +)
 * إذا كان الرقم محلياً ووُجد رمز الدولة يُضاف الرمز بعد حذف الصفر البادئ
 */
export function normalizeWhatsAppPhone(phone: string | null | undefined, countryCode?: string | null): string | null {
  if (!phone) return null;

  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;

  const code = countryCode ? String(countryCode).replace(/\D/g, "") : "";

  if (code) {
    if (digits.startsWith("0")) {
      digits = code + digits.replace(/^0+/, "");
    } else if (!digits.startsWith(code) && digits.length <= 10) {
      digits = code + digits;
    }
  }

  // رقم واتساب صالح دولياً لا يقل عن 8 أرقام
  if (digits.length < 8) return null;
  return digits;
}

async function postWhatsAppMessage(config: WhatsAppConfig, payload: Record<string, any>) {
  const res = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      ...payload,
    }),
  });

  if (!res.ok) {
    const details = await res.text();
    let message = "فشل إرسال الرسالة عبر واتساب";
    try {
      const parsed = JSON.parse(details);
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      // الاحتفاظ بالرسالة الافتراضية
    }
    throw new Error(message);
  }

  return res.json();
}

/**
 * إرسال رسالة نصية حرة — تصل فقط ضمن نافذة 24 ساعة بعد آخر رسالة من العميل
 */
export async function sendWhatsAppTextMessage(to: string, text: string) {
  const config = await getWhatsAppConfig();
  if (!config) {
    throw new Error("WhatsApp Cloud API غير مهيأ. أضف بيانات الاتصال من صفحة الإعدادات أو عبر WHATSAPP_CLOUD_API_TOKEN و WHATSAPP_PHONE_NUMBER_ID");
  }

  return postWhatsAppMessage(config, {
    to,
    type: "text",
    text: { preview_url: true, body: text },
  });
}

/**
 * إرسال رسالة قالب معتمد — مطلوب للرسائل الجماعية خارج نافذة 24 ساعة
 */
export async function sendWhatsAppTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string = "ar",
  bodyParams: string[] = []
) {
  const config = await getWhatsAppConfig();
  if (!config) {
    throw new Error("WhatsApp Cloud API غير مهيأ. أضف بيانات الاتصال من صفحة الإعدادات أو عبر WHATSAPP_CLOUD_API_TOKEN و WHATSAPP_PHONE_NUMBER_ID");
  }

  const components =
    bodyParams.length > 0
      ? [
          {
            type: "body",
            parameters: bodyParams.map((value) => ({ type: "text", text: value })),
          },
        ]
      : undefined;

  return postWhatsAppMessage(config, {
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode || "ar" },
      ...(components ? { components } : {}),
    },
  });
}
