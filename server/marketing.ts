"use server";

import { decrypt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAnyPermission, hasPermission, isAdmin } from "@/lib/utils";
import { getTrackingBaseUrl, isValidEmail, sendCampaignEmail } from "@/lib/email";
import {
  getWhatsAppConfig,
  normalizeWhatsAppPhone,
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
} from "@/lib/whatsapp";
import { cookies } from "next/headers";

const CAMPAIGN_TYPES = ["EMAIL", "SOCIAL", "SMS", "CONTENT", "WHATSAPP"] as const;
const CAMPAIGN_STATUSES = ["DRAFT", "SCHEDULED", "RUNNING", "COMPLETED", "CANCELLED"] as const;
const CAMPAIGN_AUDIENCES = ["ALL_CUSTOMERS", "ALL_WHOLESALE", "ALL_REPS", "CUSTOM"] as const;
const METRIC_KEYS = ["sent", "opened", "clicked", "converted"] as const;

type CampaignType = (typeof CAMPAIGN_TYPES)[number];
type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number];
type MetricKey = (typeof METRIC_KEYS)[number];

async function getCurrentSessionUser() {
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

function canViewMarketing(user: any) {
  if (!user) return false;
  return hasAnyPermission(user, ["viewMarketing", "addMarketing", "editMarketing", "deleteMarketing"]);
}

function canAddMarketing(user: any) {
  if (!user) return false;
  return isAdmin(user) || hasPermission(user, "addMarketing");
}

function canEditMarketing(user: any) {
  if (!user) return false;
  return isAdmin(user) || hasPermission(user, "editMarketing");
}

function canDeleteMarketing(user: any) {
  if (!user) return false;
  return isAdmin(user) || hasPermission(user, "deleteMarketing");
}

function parseOptionalDate(value: any) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function normalizeMetrics(value: any) {
  const base = { sent: 0, opened: 0, clicked: 0, converted: 0, _openedRecipients: [] as string[], _clickedRecipients: [] as string[] };
  if (!value || typeof value !== "object") return base;
  const metrics = value as Record<string, any>;
  return {
    sent: Math.max(0, Number(metrics.sent || 0)),
    opened: Math.max(0, Number(metrics.opened || 0)),
    clicked: Math.max(0, Number(metrics.clicked || 0)),
    converted: Math.max(0, Number(metrics.converted || 0)),
    _openedRecipients: Array.isArray(metrics._openedRecipients) ? metrics._openedRecipients : [],
    _clickedRecipients: Array.isArray(metrics._clickedRecipients) ? metrics._clickedRecipients : [],
  };
}

function parseTargetIds(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }
  return [];
}

function parseCampaignType(value: any): CampaignType | null {
  const normalized = String(value || "").toUpperCase() as CampaignType;
  return CAMPAIGN_TYPES.includes(normalized) ? normalized : null;
}

function parseCampaignStatus(value: any): CampaignStatus | null {
  const normalized = String(value || "").toUpperCase() as CampaignStatus;
  return CAMPAIGN_STATUSES.includes(normalized) ? normalized : null;
}

function parseCampaignAudience(value: any): CampaignAudience | null {
  const normalized = String(value || "").toUpperCase() as CampaignAudience;
  return CAMPAIGN_AUDIENCES.includes(normalized) ? normalized : null;
}

async function resolveCustomRecipients(ids: string[]) {
  const recipients: { id: string; email: string; name: string | null; type: "customer" | "wholesale" }[] = [];
  const seen = new Set<string>();

  for (const rawId of ids) {
    const id = rawId.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
    if (customer?.email && isValidEmail(customer.email)) {
      recipients.push({ id: customer.id, email: customer.email, name: customer.name, type: "customer" });
      continue;
    }

    const wholesale = await prisma.wholesaleCustomer.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
    if (wholesale?.email && isValidEmail(wholesale.email)) {
      recipients.push({ id: wholesale.id, email: wholesale.email, name: wholesale.name, type: "wholesale" });
    }
  }

  return recipients;
}

async function getCampaignRecipientsForPickerInternal() {
  const [customers, wholesale] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, email: true, name: true },
    }),
    prisma.wholesaleCustomer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, email: true, name: true },
    }),
  ]);

  return {
    customers: customers.map((c) => ({ id: c.id, email: c.email, name: c.name, type: "customer" as const })),
    wholesale: wholesale.map((c) => ({ id: c.id, email: c.email, name: c.name, type: "wholesale" as const })),
  };
}

async function getCampaignRecipients(audience: CampaignAudience, targetIds: any) {
  // كل العملاء = العملاء العاديين + عملاء الجملة (مع إزالة التكرار حسب البريد)
  if (audience === "ALL_CUSTOMERS") {
    const [customers, wholesale] = await Promise.all([
      prisma.customer.findMany({
        where: { email: { not: null } },
        select: { id: true, email: true, name: true },
      }),
      prisma.wholesaleCustomer.findMany({
        where: { email: { not: null } },
        select: { id: true, email: true, name: true },
      }),
    ]);

    const recipients: { id: string; email: string; name: string | null; type: "customer" | "wholesale" }[] = [];
    const seenEmails = new Set<string>();

    for (const c of customers) {
      if (!c.email || !isValidEmail(c.email)) continue;
      const key = c.email.toLowerCase();
      if (seenEmails.has(key)) continue;
      seenEmails.add(key);
      recipients.push({ id: c.id, email: c.email, name: c.name, type: "customer" });
    }
    for (const w of wholesale) {
      if (!w.email || !isValidEmail(w.email)) continue;
      const key = w.email.toLowerCase();
      if (seenEmails.has(key)) continue;
      seenEmails.add(key);
      recipients.push({ id: w.id, email: w.email, name: w.name, type: "wholesale" });
    }
    return recipients;
  }

  if (audience === "ALL_WHOLESALE") {
    const wholesale = await prisma.wholesaleCustomer.findMany({
      where: { email: { not: null } },
      select: { id: true, email: true, name: true },
    });
    return wholesale
      .filter((c): c is typeof c & { email: string } => c.email !== null && isValidEmail(c.email))
      .map((c) => ({ id: c.id, email: c.email, name: c.name, type: "wholesale" as const }));
  }

  // ALL_REPS (يظهر في الواجهة باسم "العملاء") = العملاء العاديين من صفحة العملاء
  if (audience === "ALL_REPS") {
    const customers = await prisma.customer.findMany({
      where: { email: { not: null } },
      select: { id: true, email: true, name: true },
    });
    return customers
      .filter((c): c is typeof c & { email: string } => c.email !== null && isValidEmail(c.email))
      .map((c) => ({ id: c.id, email: c.email, name: c.name, type: "customer" as const }));
  }

  return resolveCustomRecipients(parseTargetIds(targetIds));
}

type WhatsAppRecipient = { id: string; phone: string; name: string | null; type: "customer" | "wholesale" };

async function resolveCustomWhatsAppRecipients(ids: string[]) {
  const recipients: WhatsAppRecipient[] = [];
  const seen = new Set<string>();

  for (const rawId of ids) {
    const id = rawId.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, phone: true, countryCode: true, name: true },
    });
    if (customer) {
      const phone = normalizeWhatsAppPhone(customer.phone?.[0], customer.countryCode);
      if (phone) {
        recipients.push({ id: customer.id, phone, name: customer.name, type: "customer" });
        continue;
      }
    }

    const wholesale = await prisma.wholesaleCustomer.findUnique({
      where: { id },
      select: { id: true, phone: true, whatsappPhone: true, name: true },
    });
    if (wholesale) {
      const phone = normalizeWhatsAppPhone(wholesale.whatsappPhone || wholesale.phone?.[0]);
      if (phone) {
        recipients.push({ id: wholesale.id, phone, name: wholesale.name, type: "wholesale" });
      }
    }
  }

  return recipients;
}

async function getWhatsAppCampaignRecipients(audience: CampaignAudience, targetIds: any) {
  // كل العملاء = العملاء العاديين + عملاء الجملة (مع إزالة التكرار حسب رقم الهاتف)
  if (audience === "ALL_CUSTOMERS") {
    const [customers, wholesale] = await Promise.all([
      prisma.customer.findMany({
        where: { phone: { isEmpty: false } },
        select: { id: true, phone: true, countryCode: true, name: true },
      }),
      prisma.wholesaleCustomer.findMany({
        select: { id: true, phone: true, whatsappPhone: true, name: true },
      }),
    ]);

    const recipients: WhatsAppRecipient[] = [];
    const seenPhones = new Set<string>();

    for (const customer of customers) {
      const phone = normalizeWhatsAppPhone(customer.phone?.[0], customer.countryCode);
      if (!phone || seenPhones.has(phone)) continue;
      seenPhones.add(phone);
      recipients.push({ id: customer.id, phone, name: customer.name, type: "customer" });
    }
    for (const customer of wholesale) {
      const phone = normalizeWhatsAppPhone(customer.whatsappPhone || customer.phone?.[0]);
      if (!phone || seenPhones.has(phone)) continue;
      seenPhones.add(phone);
      recipients.push({ id: customer.id, phone, name: customer.name, type: "wholesale" });
    }
    return recipients;
  }

  if (audience === "ALL_WHOLESALE") {
    const wholesale = await prisma.wholesaleCustomer.findMany({
      select: { id: true, phone: true, whatsappPhone: true, name: true },
    });
    const recipients: WhatsAppRecipient[] = [];
    for (const customer of wholesale) {
      const phone = normalizeWhatsAppPhone(customer.whatsappPhone || customer.phone?.[0]);
      if (phone) recipients.push({ id: customer.id, phone, name: customer.name, type: "wholesale" });
    }
    return recipients;
  }

  // ALL_REPS (يظهر في الواجهة باسم "العملاء") = العملاء العاديين من صفحة العملاء
  if (audience === "ALL_REPS") {
    const customers = await prisma.customer.findMany({
      where: { phone: { isEmpty: false } },
      select: { id: true, phone: true, countryCode: true, name: true },
    });
    const recipients: WhatsAppRecipient[] = [];
    for (const customer of customers) {
      const phone = normalizeWhatsAppPhone(customer.phone?.[0], customer.countryCode);
      if (phone) recipients.push({ id: customer.id, phone, name: customer.name, type: "customer" });
    }
    return recipients;
  }

  return resolveCustomWhatsAppRecipients(parseTargetIds(targetIds));
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const campaignSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  subject: true,
  content: true,
  channelDetails: true,
  audience: true,
  targetIds: true,
  scheduledAt: true,
  sentAt: true,
  metrics: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      username: true,
    },
  },
} as const;

export async function getCampaigns() {
  const currentUser = await getCurrentSessionUser();
  if (!canViewMarketing(currentUser)) {
    return { success: false, error: "غير مصرح لك بعرض الحملات التسويقية" };
  }

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    select: campaignSelect,
  });

  return { success: true, data: campaigns };
}

export async function getCampaignById(id: string | number) {
  const currentUser = await getCurrentSessionUser();
  if (!canViewMarketing(currentUser)) {
    return { success: false, error: "غير مصرح لك بعرض الحملات التسويقية" };
  }

  const campaignId = Number(id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return { success: false, error: "معرف الحملة غير صالح" };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: campaignSelect,
  });

  if (!campaign) {
    return { success: false, error: "الحملة غير موجودة" };
  }

  return { success: true, data: campaign };
}

export async function createCampaign(data: any) {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser || !canAddMarketing(currentUser)) {
      return { success: false, error: "لا تملك صلاحية إنشاء حملة تسويقية" };
    }

    const type = parseCampaignType(data?.type);
    if (!type) {
      return { success: false, error: "يرجى اختيار نوع الحملة" };
    }

    const title = String(data?.title || "").trim();
    if (!title) {
      return { success: false, error: "يرجى إدخال عنوان الحملة" };
    }

    const content = String(data?.content || "").trim();
    if (!content) {
      return { success: false, error: "يرجى إدخال محتوى الحملة" };
    }

    const audience = parseCampaignAudience(data?.audience) || "ALL_CUSTOMERS";
    const targetIds = audience === "CUSTOM" ? parseTargetIds(data?.targetIds) : [];
    const scheduledAt = parseOptionalDate(data?.scheduledAt);
    const status = parseCampaignStatus(data?.status) || "DRAFT";

    const campaign = await prisma.campaign.create({
      data: {
        title,
        type,
        status,
        subject: type === "EMAIL" ? String(data?.subject || "").trim() : null,
        content,
        channelDetails: data?.channelDetails || {},
        audience,
        targetIds,
        scheduledAt,
        metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 },
        createdById: currentUser.id,
      },
      select: campaignSelect,
    });

    return { success: true, data: campaign };
  } catch (error: any) {
    console.error("Create campaign error:", error);
    return { success: false, error: "فشل في إنشاء الحملة التسويقية" };
  }
}

export async function updateCampaign(id: string | number, data: any) {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser || !canEditMarketing(currentUser)) {
      return { success: false, error: "لا تملك صلاحية تعديل الحملة التسويقية" };
    }

    const campaignId = Number(id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return { success: false, error: "معرف الحملة غير صالح" };
    }

    const existing = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: "الحملة غير موجودة" };
    }

    const updateData: any = {};

    if (data?.title !== undefined) updateData.title = String(data.title).trim();
    if (data?.content !== undefined) updateData.content = String(data.content).trim();
    if (data?.channelDetails !== undefined) updateData.channelDetails = data.channelDetails;
    if (data?.scheduledAt !== undefined) updateData.scheduledAt = parseOptionalDate(data.scheduledAt);
    if (data?.targetIds !== undefined) {
      const audience = parseCampaignAudience(data?.audience) || "ALL_CUSTOMERS";
      updateData.targetIds = audience === "CUSTOM" ? parseTargetIds(data.targetIds) : [];
    }

    const type = parseCampaignType(data?.type);
    if (type) {
      updateData.type = type;
      updateData.subject = type === "EMAIL" ? String(data?.subject || "").trim() : null;
    } else if (data?.subject !== undefined) {
      updateData.subject = String(data.subject).trim();
    }

    const audience = parseCampaignAudience(data?.audience);
    if (audience) {
      updateData.audience = audience;
      if (audience !== "CUSTOM") updateData.targetIds = [];
    }

    const status = parseCampaignStatus(data?.status);
    if (status) updateData.status = status;

    if (data?.metrics !== undefined) {
      updateData.metrics = normalizeMetrics(data.metrics);
    }

    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
      select: campaignSelect,
    });

    return { success: true, data: campaign };
  } catch (error: any) {
    console.error("Update campaign error:", error);
    return { success: false, error: "فشل في تعديل الحملة التسويقية" };
  }
}

export async function deleteCampaign(id: string | number) {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser || !canDeleteMarketing(currentUser)) {
      return { success: false, error: "لا تملك صلاحية حذف الحملة التسويقية" };
    }

    const campaignId = Number(id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return { success: false, error: "معرف الحملة غير صالح" };
    }

    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Delete campaign error:", error);
    return { success: false, error: "فشل في حذف الحملة التسويقية" };
  }
}

export async function launchCampaign(id: string | number) {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser || !canEditMarketing(currentUser)) {
      return { success: false, error: "لا تملك صلاحية إطلاق الحملة التسويقية" };
    }

    const campaignId = Number(id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return { success: false, error: "معرف الحملة غير صالح" };
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, title: true, subject: true, content: true, type: true, status: true, scheduledAt: true, audience: true, targetIds: true, channelDetails: true },
    });

    if (!campaign) {
      return { success: false, error: "الحملة غير موجودة" };
    }

    const now = new Date();
    const scheduledAt = campaign.scheduledAt ? new Date(campaign.scheduledAt) : null;
    const nextStatus = scheduledAt && scheduledAt > now ? "SCHEDULED" : "RUNNING";

    let metrics = normalizeMetrics(null);
    let sentCount = 0;
    let sendError: string | null = null;

    if (campaign.type === "EMAIL" && nextStatus === "RUNNING") {
      const baseUrl = getTrackingBaseUrl();
      if (!baseUrl) {
        return { success: false, error: "NEXT_PUBLIC_APP_URL غير مضبوط في متغيرات البيئة" };
      }
      if (!process.env.RESEND_API_KEY) {
        return { success: false, error: "RESEND_API_KEY غير مضبوط في متغيرات البيئة" };
      }

      const recipients = await getCampaignRecipients(campaign.audience as CampaignAudience, campaign.targetIds);

      if (recipients.length === 0) {
        sendError = "لا يوجد مستلمون بريد إلكتروني صالحون لهذه الحملة";
      } else {
        const results = await Promise.allSettled(
          recipients.map((recipient) =>
            sendCampaignEmail(
              { id: campaign.id, title: campaign.title, subject: campaign.subject || campaign.title, content: campaign.content },
              recipient,
              baseUrl
            )
          )
        );

        sentCount = results.filter((r) => r.status === "fulfilled").length;
        const failures = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
        if (failures.length > 0) {
          console.error("Campaign email failures:", failures);
          const messages = failures
            .map((f, idx) => `${idx + 1}. ${f.reason?.message || "خطأ"}`)
            .join(" ");
          sendError = `فشل إرسال ${failures.length} رسائل من ${recipients.length}: ${messages}`;
        }
      }

      metrics.sent = sentCount;
      metrics.opened = 0;
      metrics.clicked = 0;
      metrics.converted = 0;
    }

    if (campaign.type === "WHATSAPP" && nextStatus === "RUNNING") {
      if (!(await getWhatsAppConfig())) {
        return { success: false, error: "WhatsApp Cloud API غير مهيأ. أضف بيانات الاتصال من صفحة الإعدادات أو عبر WHATSAPP_CLOUD_API_TOKEN و WHATSAPP_PHONE_NUMBER_ID" };
      }

      const channelDetails = (campaign.channelDetails || {}) as Record<string, any>;
      const templateName = String(channelDetails.templateName || "").trim();
      const templateLanguage = String(channelDetails.templateLanguage || "ar").trim() || "ar";

      const recipients = await getWhatsAppCampaignRecipients(campaign.audience as CampaignAudience, campaign.targetIds);

      if (recipients.length === 0) {
        sendError = "لا يوجد مستلمون بأرقام واتساب صالحة لهذه الحملة";
      } else {
        const failures: string[] = [];

        // إرسال تسلسلي مع تأخير بسيط لاحترام حدود المعدل في Meta
        for (const recipient of recipients) {
          try {
            const recipientName = recipient.name || "";
            if (templateName) {
              await sendWhatsAppTemplateMessage(recipient.phone, templateName, templateLanguage, [recipientName]);
            } else {
              const text = campaign.content.replace(/\{\{\s*name\s*\}\}/gi, recipientName);
              await sendWhatsAppTextMessage(recipient.phone, text);
            }
            sentCount += 1;
          } catch (error: any) {
            failures.push(`${recipient.name || recipient.phone}: ${error?.message || "خطأ"}`);
          }
          await delay(250);
        }

        if (failures.length > 0) {
          console.error("Campaign WhatsApp failures:", failures);
          sendError = `فشل إرسال ${failures.length} رسائل من ${recipients.length}: ${failures.slice(0, 5).join(" | ")}`;
        }
      }

      metrics.sent = sentCount;
      metrics.opened = 0;
      metrics.clicked = 0;
      metrics.converted = 0;
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: nextStatus,
        sentAt: nextStatus === "RUNNING" ? now : null,
        metrics,
      },
      select: campaignSelect,
    });

    if (sendError) {
      return { success: true, data: updated, warning: sendError };
    }

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Launch campaign error:", error);
    return { success: false, error: "فشل في إطلاق الحملة التسويقية" };
  }
}

export async function recordCampaignMetric(id: string | number, metricKey: MetricKey, delta: number) {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser || !canEditMarketing(currentUser)) {
      return { success: false, error: "لا تملك صلاحية تحديث مقاييس الحملة" };
    }

    const campaignId = Number(id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return { success: false, error: "معرف الحملة غير صالح" };
    }

    if (!METRIC_KEYS.includes(metricKey)) {
      return { success: false, error: "مقياس غير صالح" };
    }

    const deltaValue = Math.max(0, Math.round(Number(delta || 0)));
    if (deltaValue === 0) {
      return { success: true };
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { metrics: true },
    });

    if (!campaign) {
      return { success: false, error: "الحملة غير موجودة" };
    }

    const metrics = normalizeMetrics(campaign.metrics);
    metrics[metricKey] += deltaValue;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { metrics },
    });

    return { success: true, metrics };
  } catch (error: any) {
    console.error("Record campaign metric error:", error);
    return { success: false, error: "فشل في تحديث المقياس" };
  }
}

export async function getMarketingAnalytics() {
  const currentUser = await getCurrentSessionUser();
  if (!canViewMarketing(currentUser)) {
    return { success: false, error: "غير مصرح لك بعرض التحليلات" };
  }

  try {
    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        type: true,
        status: true,
        metrics: true,
        createdAt: true,
      },
    });

    const totals = campaigns.reduce(
      (acc, campaign) => {
        const metrics = normalizeMetrics(campaign.metrics);
        acc.total += 1;
        acc.sent += metrics.sent;
        acc.opened += metrics.opened;
        acc.clicked += metrics.clicked;
        acc.converted += metrics.converted;
        return acc;
      },
      { total: 0, sent: 0, opened: 0, clicked: 0, converted: 0 }
    );

    const byType = campaigns.reduce((acc: Record<string, number>, campaign) => {
      acc[campaign.type] = (acc[campaign.type] || 0) + 1;
      return acc;
    }, {});

    const byStatus = campaigns.reduce((acc: Record<string, number>, campaign) => {
      acc[campaign.status] = (acc[campaign.status] || 0) + 1;
      return acc;
    }, {});

    const topCampaigns = [...campaigns]
      .sort((a, b) => {
        const aMetrics = normalizeMetrics(a.metrics);
        const bMetrics = normalizeMetrics(b.metrics);
        return bMetrics.converted * 10 + bMetrics.clicked - (aMetrics.converted * 10 + aMetrics.clicked);
      })
      .slice(0, 5)
      .map((campaign) => ({
        id: campaign.id,
        title: "", // title is not selected in this query for performance
        type: campaign.type,
        status: campaign.status,
        metrics: normalizeMetrics(campaign.metrics),
      }));

    return { success: true, data: { totals, byType, byStatus, topCampaigns } };
  } catch (error: any) {
    console.error("Marketing analytics error:", error);
    return { success: false, error: "فشل في جلب التحليلات" };
  }
}

export async function getMarketingCampaignsByType(type: CampaignType) {
  return getCampaigns();
}

export async function getCampaignRecipientsForPicker() {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!canViewMarketing(currentUser)) {
      return { success: false, error: "غير مصرح لك بعرض الحملات التسويقية" };
    }

    const data = await getCampaignRecipientsForPickerInternal();
    return { success: true, data };
  } catch (error: any) {
    console.error("Get campaign recipients for picker error:", error);
    return { success: false, error: "فشل في جلب قائمة المستلمين" };
  }
}

