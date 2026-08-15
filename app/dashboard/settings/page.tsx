"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { getGeneralSettings, upsertGeneralSettings } from "@/server/general-settings";
import { Button } from "@/components/ui/button";
import { MultiFileUpload, FileItem } from "@/components/ui/ImageUpload";

type FormState = {
  siteName: string;
  siteTitle: string;
  siteDescription: string;
  companyEmail: string;
  companyPhone: string;
  siteCurrency: string;
  usdToTryRate: string;
  logo: string;
  favicon: string;
  facebookUrl: string;
  instagramUrl: string;
  topBannerText: string;
  primaryColor: string;
  secondaryColor: string;
  nextPublicAppUrl: string;
};

const initialForm: FormState = {
  siteName: "",
  siteTitle: "",
  siteDescription: "",
  companyEmail: "",
  companyPhone: "",
  siteCurrency: "USD",
  usdToTryRate: "0",
  logo: "",
  favicon: "",
  facebookUrl: "",
  instagramUrl: "",
  topBannerText: "",
  primaryColor: "#10b981",
  secondaryColor: "#0f766e",
  nextPublicAppUrl: "",
};

const CURRENCIES = [
  { code: "USD", name: "الدولار الأمريكي" },
  { code: "SYP", name: "الليرة السورية" },
  { code: "EUR", name: "اليورو" },
  { code: "GBP", name: "الجنيه الإسترليني" },
  { code: "JPY", name: "الين الياباني" },
  { code: "CNY", name: "اليوان الصيني" },
  { code: "INR", name: "الروبية الهندية" },
  { code: "AUD", name: "الدولار الأسترالي" },
  { code: "CAD", name: "الدولار الكندي" },
  { code: "CHF", name: "الفرنك السويسري" },
  { code: "SEK", name: "الكرونة السويدية" },
  { code: "NZD", name: "الدولار النيوزيلندي" },
  { code: "SGD", name: "الدولار السنغافوري" },
  { code: "HKD", name: "الدولار الهونغ كونغي" },
  { code: "KRW", name: "الوون الكوري الجنوبي" },
  { code: "MXN", name: "البيزو المكسيكي" },
  { code: "BRL", name: "الريال البرازيلي" },
  { code: "RUB", name: "الروبل الروسي" },
  { code: "ZAR", name: "الراند الجنوب أفريقي" },
  { code: "AED", name: "الدرهم الإماراتي" },
  { code: "SAR", name: "الريال السعودي" },
  { code: "QAR", name: "الريال القطري" },
  { code: "KWD", name: "الدينار الكويتي" },
  { code: "BHD", name: "الدينار البحريني" },
  { code: "OMR", name: "الريال العماني" },
  { code: "JOD", name: "الدينار الأردني" },
  { code: "EGP", name: "الجنيه المصري" },
  { code: "LBP", name: "الليرة اللبنانية" },
  { code: "IQD", name: "الدينار العراقي" },
  { code: "TND", name: "الدينار التونسي" },
  { code: "MAD", name: "الدرهم المغربي" },
  { code: "DZD", name: "الدينار الجزائري" },
  { code: "LYD", name: "الدينار الليبي" },
  { code: "SDG", name: "الجنيه السوداني" },
  { code: "YER", name: "الريال اليمني" },
  { code: "AFN", name: "الأفغاني" },
  { code: "ALL", name: "الليك الألباني" },
  { code: "AMD", name: "الدرام الأرميني" },
  { code: "ANG", name: "الغيلدر الأنتيلي" },
  { code: "AOA", name: "الكوانزا الأنغولي" },
  { code: "ARS", name: "البيزو الأرجنتيني" },
  { code: "AWG", name: "الفلورن الأروبي" },
  { code: "AZN", name: "المانات الأذربيجاني" },
  { code: "BAM", name: "المارك البوسني" },
  { code: "BBD", name: "الدولار البربادوسي" },
  { code: "BDT", name: "التاكا البنغلاديشية" },
  { code: "BGN", name: "الليف البلغاري" },
  { code: "BIF", name: "الفرنك البوروندي" },
  { code: "BMD", name: "الدولار البرمودي" },
  { code: "BND", name: "الدولار البروني" },
  { code: "BOB", name: "البوليفيانو" },
  { code: "BSD", name: "الدولار البهامي" },
  { code: "BTN", name: "النولتوم البوتاني" },
  { code: "BWP", name: "البولا البوتسواني" },
  { code: "BYN", name: "الروبل البيلاروسي" },
  { code: "BZD", name: "الدولار البليزي" },
  { code: "CDF", name: "الفرنك الكونغولي" },
  { code: "CLP", name: "البيزو التشيلي" },
  { code: "COP", name: "البيزو الكولومبي" },
  { code: "CRC", name: "الكولون الكوستاريكي" },
  { code: "CUP", name: "البيزو الكوبي" },
  { code: "CVE", name: "الاسكودو الرأس الأخضري" },
  { code: "CZK", name: "الكورونا التشيكية" },
  { code: "DJF", name: "الفرنك الجيبوتي" },
  { code: "DKK", name: "الكرونة الدنماركية" },
  { code: "DOP", name: "البيزو الدومينيكاني" },
  { code: "ERN", name: "الناكفا الإريترية" },
  { code: "ETB", name: "البر الإثيوبي" },
  { code: "FJD", name: "الدولار الفيجي" },
  { code: "FKP", name: "الجنيه الفوكلاندي" },
  { code: "GEL", name: "اللاري الجورجي" },
  { code: "GHS", name: "السيدي الغاني" },
  { code: "GIP", name: "الجنيه الجبلطارى" },
  { code: "GMD", name: "الدالاسي الغامبي" },
  { code: "GNF", name: "الفرنك الغيني" },
  { code: "GTQ", name: "الكتزال الغواتيمالي" },
  { code: "GYD", name: "الدولار الغياني" },
  { code: "HNL", name: "اللمبيرا الهندوراسية" },
  { code: "HRK", name: "الكونا الكرواتية" },
  { code: "HTG", name: "الغورد الهايتي" },
  { code: "HUF", name: "الفورنت المجري" },
  { code: "IDR", name: "الروبية الإندونيسية" },
  { code: "ILS", name: "الشيكل الإسرائيلي" },
  { code: "IMP", name: "الجنيه الآيزلندي" },
  { code: "IRR", name: "الريال الإيراني" },
  { code: "ISK", name: "الكرونة الآيسلندية" },
  { code: "JMD", name: "الدولار الجامايكي" },
  { code: "KES", name: "الشيلينغ الكيني" },
  { code: "KGS", name: "السوم القيرغيزستاني" },
  { code: "KHR", name: "الرييل الكمبودي" },
  { code: "KID", name: "الدولار الكيريباتي" },
  { code: "KMF", name: "الفرنك القمري" },
  { code: "KYD", name: "الدولار الكايماني" },
  { code: "KZT", name: "التاينغ الكازاخستاني" },
  { code: "LAK", name: "الكيب اللاوي" },
  { code: "LKR", name: "الروبية السريلانكية" },
  { code: "LRD", name: "الدولار الليبيري" },
  { code: "LSL", name: "اللوتي الليسوتو" },
  { code: "MDL", name: "الليو المولدوفي" },
  { code: "MGA", name: "الأرياري المدغشقري" },
  { code: "MKD", name: "الدينار المقدوني" },
  { code: "MMK", name: "الكيات الميانماري" },
  { code: "MNT", name: "التوغريك المنغولي" },
  { code: "MOP", name: "الباتاكا المكاوية" },
  { code: "MRU", name: "الأوقية الموريتانية" },
  { code: "MUR", name: "الروبية الموريشيوسية" },
  { code: "MVR", name: "الروفيه المالديفية" },
  { code: "MWK", name: "الكواشا الملاوية" },
  { code: "MYR", name: "الرينغيت الماليزي" },
  { code: "MZN", name: "الميتيكال الموزمبيقي" },
  { code: "NAD", name: "الدولار الناميبي" },
  { code: "NGN", name: "النايرة النيجيرية" },
  { code: "NIO", name: "الكوردوبا النيكاراغوية" },
  { code: "NOK", name: "الكرونة النرويجية" },
  { code: "NPR", name: "الروبية النيبالية" },
  { code: "PAB", name: "البالبوا البانامي" },
  { code: "PEN", name: "السول البيروفي" },
  { code: "PGK", name: "الكينا البابوي" },
  { code: "PHP", name: "البيزو الفلبيني" },
  { code: "PKR", name: "الروبية الباكستانية" },
  { code: "PLN", name: "الزلوتي البولندي" },
  { code: "PYG", name: "الغواراني الباراغواياني" },
  { code: "RON", name: "الليو الروماني" },
  { code: "RSD", name: "الدينار الصربي" },
  { code: "RWF", name: "الفرنك الرواندي" },
  { code: "SBD", name: "الدولار الجزر السلمونية" },
  { code: "SCR", name: "الروبية السيشيلية" },
  { code: "SHP", name: "الجنيه سانت هيلينا" },
  { code: "SLE", name: "الليون السيراليوني" },
  { code: "SOS", name: "الشلن الصومالي" },
  { code: "SRD", name: "الدولار السورينامي" },
  { code: "SSP", name: "الجنيه الجنوب سوداني" },
  { code: "STN", name: "الدوبرا ساو تومي وبرينسيبي" },
  { code: "SZL", name: "الليلانغيني السوازيلندي" },
  { code: "THB", name: "الباخت التايلندي" },
  { code: "TJS", name: "السوموني الطاجيكستاني" },
  { code: "TMT", name: "المانات التركمانستاني" },
  { code: "TOP", name: "الباانغا التونغية" },
  { code: "TTD", name: "الدولار الترينيدادي" },
  { code: "TVD", name: "الدولار التوفالي" },
  { code: "TWD", name: "الدولار التايواني" },
  { code: "TZS", name: "الشلن التنزاني" },
  { code: "UAH", name: "الهريفنيا الأوكرانية" },
  { code: "UGX", name: "الشلن الأوغندي" },
  { code: "UYU", name: "البيزو الأوروغواياني" },
  { code: "UZS", name: "السوم الأوزبكستاني" },
  { code: "VES", name: "ال بوليفار" },
  { code: "VND", name: "الدونغ الفيتنامي" },
  { code: "VUV", name: "الفاتو الفانواتي" },
  { code: "WST", name: "التالا الساموي" },
  { code: "XAF", name: "الفرنك وسط أفريقيا" },
  { code: "XCD", name: "الدولار شرق الكاريبي" },
  { code: "XOF", name: "الفرنك غرب أفريقيا" },
  { code: "XPF", name: "الفرنك المحيط الهادئ" },
  { code: "ZMW", name: "الكواشا الزامبي" },
  { code: "ZWL", name: "الدولار الزيمبابوي" },
];

export default function GeneralSettingsPage() {
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [logoFiles, setLogoFiles] = React.useState<FileItem[]>([]);
  const [faviconFiles, setFaviconFiles] = React.useState<FileItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const res = await getGeneralSettings();

    if (!res.success) {
      toast.error("تعذر تحميل الإعدادات العامة");
      setLoading(false);
      return;
    }

    const data = res.data;
    if (data) {
      setForm({
        siteName: data.siteName || "",
        siteTitle: data.siteTitle || "",
        siteDescription: data.siteDescription || "",
        companyEmail: data.companyEmail || "",
        companyPhone: data.companyPhone || "",
        siteCurrency: data.siteCurrency || "USD",
        usdToTryRate: String(data.usdToTryRate ?? 0),
        logo: data.logo || "",
        favicon: data.favicon || "",
        facebookUrl: data.facebookUrl || "",
        instagramUrl: data.instagramUrl || "",
        topBannerText: data.topBannerText || "",
        primaryColor: data.primaryColor || "#10b981",
        secondaryColor: data.secondaryColor || "#0f766e",
        nextPublicAppUrl: data.nextPublicAppUrl || "",
      });

      if (data.logo) {
        setLogoFiles([{ url: data.logo, type: "image/*", name: "site-logo" }]);
      }
      if (data.favicon) {
        setFaviconFiles([{ url: data.favicon, type: "image/*", name: "site-favicon" }]);
      }
    }

    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    const loadingToast = toast.loading("جاري حفظ الإعدادات...");

    try {
      const formData = new FormData();
      formData.append("siteName", form.siteName);
      formData.append("siteTitle", form.siteTitle);
      formData.append("siteDescription", form.siteDescription);
      formData.append("companyEmail", form.companyEmail);
      formData.append("companyPhone", form.companyPhone);
      formData.append("siteCurrency", form.siteCurrency);
      formData.append("usdToTryRate", form.usdToTryRate);
      formData.append("facebookUrl", form.facebookUrl);
      formData.append("instagramUrl", form.instagramUrl);
      formData.append("topBannerText", form.topBannerText);
      formData.append("primaryColor", form.primaryColor);
      formData.append("secondaryColor", form.secondaryColor);
      formData.append("nextPublicAppUrl", form.nextPublicAppUrl);

      const logoFile = logoFiles[0]?.rawFile;
      if (logoFile instanceof File && logoFile.size > 0) {
        formData.append("logo", logoFile);
      } else if (form.logo && !logoFiles.length) {
        // تم مسح اللوجو
      } else if (form.logo) {
        formData.append("logo", form.logo);
      }

      const faviconFile = faviconFiles[0]?.rawFile;
      if (faviconFile instanceof File && faviconFile.size > 0) {
        formData.append("favicon", faviconFile);
      } else if (form.favicon && !faviconFiles.length) {
        // تم مسح الأيقونة
      } else if (form.favicon) {
        formData.append("favicon", form.favicon);
      }

      const res = await upsertGeneralSettings(formData);

      if (res.success) {
        toast.success("تم حفظ الإعدادات العامة بنجاح");
      } else {
        toast.error(res.error || "فشل في حفظ الإعدادات العامة");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      toast.dismiss(loadingToast);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">الإعدادات العامة</h1>
        <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">إعدادات أساسية للموقع والشركة</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">اسم الموقع</label>
          <input
            type="text"
            value={form.siteName}
            onChange={(e) => handleChange("siteName", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            placeholder="Skynova"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">عنوان الموقع (Metadata Title)</label>
          <input
            type="text"
            value={form.siteTitle}
            onChange={(e) => handleChange("siteTitle", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            placeholder="SKYNOVA CRM"
            disabled={loading}
          />
          <p className="text-xs text-slate-400">يظهر في تبويب المتصفح ونتائج البحث. إن تُرك فارغًا يُستخدم SKYNOVA CRM.</p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">وصف الموقع (Metadata Description)</label>
          <textarea
            value={form.siteDescription}
            onChange={(e) => handleChange("siteDescription", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            placeholder="SKYNOVA CRM"
            rows={2}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">إيميل الشركة</label>
          <input
            type="email"
            value={form.companyEmail}
            onChange={(e) => handleChange("companyEmail", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            placeholder="company@example.com"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">رقم هاتف الشركة</label>
          <input
            type="text"
            value={form.companyPhone}
            onChange={(e) => handleChange("companyPhone", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            placeholder="+963 946 975 244"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">عملة الموقع</label>
          <select
            value={form.siteCurrency}
            onChange={(e) => handleChange("siteCurrency", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            disabled={loading}
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">سعر صرف عملة الموقع بالدولار</label>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={form.usdToTryRate}
            onChange={(e) => handleChange("usdToTryRate", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            placeholder="0"
            disabled={loading}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">نص البانر العلوي</label>
          <input
            type="text"
            value={form.topBannerText}
            onChange={(e) => handleChange("topBannerText", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            placeholder="مثال: شحن مجاني للطلبات فوق 100$"
            disabled={loading}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">رابط التطبيق (NEXT_PUBLIC_APP_URL)</label>
          <input
            type="url"
            value={form.nextPublicAppUrl}
            onChange={(e) => handleChange("nextPublicAppUrl", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            placeholder="https://example.com"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">رابط فيسبوك</label>
          <input
            type="url"
            value={form.facebookUrl}
            onChange={(e) => handleChange("facebookUrl", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            placeholder="https://facebook.com/..."
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">رابط إنستغرام</label>
          <input
            type="url"
            value={form.instagramUrl}
            onChange={(e) => handleChange("instagramUrl", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            placeholder="https://instagram.com/..."
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">اللون الأساسي</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => handleChange("primaryColor", e.target.value)}
              className="h-10 w-14 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              disabled={loading}
            />
            <input
              type="text"
              value={form.primaryColor}
              onChange={(e) => handleChange("primaryColor", e.target.value)}
              className="flex-1 p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              placeholder="#10b981"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">اللون الثانوي</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.secondaryColor}
              onChange={(e) => handleChange("secondaryColor", e.target.value)}
              className="h-10 w-14 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              disabled={loading}
            />
            <input
              type="text"
              value={form.secondaryColor}
              onChange={(e) => handleChange("secondaryColor", e.target.value)}
              className="flex-1 p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              placeholder="#0f766e"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">لوجو الموقع</label>
          <MultiFileUpload
            label=""
            value={logoFiles}
            onChange={(files) => setLogoFiles(files.slice(0, 1))}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">أيقونة الموقع (Favicon)</label>
          <MultiFileUpload
            label=""
            value={faviconFiles}
            onChange={(files) => setFaviconFiles(files.slice(0, 1))}
          />
          <p className="text-xs text-slate-400">تظهر بجانب اسم الموقع في تبويب المتصفح. يُفضّل صورة مربعة (PNG أو ICO). قد يستغرق المتصفح بعض الوقت لتحديث الأيقونة بسبب الكاش.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </div>
    </div>
  );
}
