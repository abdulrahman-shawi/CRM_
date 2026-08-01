"use client";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission, hasPermission, isAdmin } from "@/lib/utils";
import {
  Home,
  BarChart2,
  Users,
  Settings,
  ChevronRight,
  ChevronLeft,
  Receipt,
  Box,
  FileText,
  ShieldCheck,
  LogOut,
  Users2,
  Warehouse,
  Truck,
  Megaphone,
  ImageIcon,
  BadgePercent,
  Ticket,
  ChevronDown,
  ArrowRightLeft,
  LayoutGrid,
  Package,
  Store,
  MessageCircle,
  CircleDollarSign,
  Globe,
  PanelsTopLeft,
  Sparkles,
  Download,
  Award,
  Bell,
  MapPin,
  ClipboardList,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";

type MenuItem = {
  icon: any;
  label: string;
  href: string;
};

type SidebarEntry =
  | { type: "section"; label: string; icon: any; items: MenuItem[] }
  | { type: "link"; icon: any; label: string; href: string };

export const Sidebar = ({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean; setIsCollapsed: (val: boolean) => void }) => {
  const pathname = usePathname();
  const { user } = useAuth()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const isAppleOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      !!(navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    setIsIOS(isAppleOS);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      toast.error("لا يمكن تثبيت التطبيق في الوقت الحالي");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      toast.success("تم تثبيت التطبيق بنجاح!");
      setCanInstall(false);
      setDeferredPrompt(null);
    } else {
      toast.error("تم إلغاء التثبيت");
    }
  };

  const handleIOSInstall = () => {
    toast.custom((t) => (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg max-w-xs text-right">
        <p className="font-bold text-slate-900 dark:text-white mb-2">تثبيت على iPhone</p>
        <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside mb-3">
          <li>اضغط على زر المشاركة <span className="inline-block">⬆️</span></li>
          <li>اختر &quot;أضف إلى شاشتك الرئيسية&quot;</li>
          <li>اضغط &quot;إضافة&quot;</li>
        </ol>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          حسناً
        </button>
      </div>
    ), { duration: 5000, position: "top-center" });
  };

  const isItemActive = (item: MenuItem): boolean => {
    return pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
  };

  const isSectionActive = (items: MenuItem[]) => items.some(isItemActive);

  const isSectionExpanded = (label: string, items: MenuItem[]) => {
    return expandedSections[label] ?? isSectionActive(items);
  };

  const toggleSection = (label: string) => {
    setExpandedSections((current) => ({
      ...current,
      [label]: !(current[label] ?? false),
    }));
  };

  const entries: SidebarEntry[] = user ? ([
    {
      type: "section",
      label: "الرئيسية",
      icon: Home,
      items: [
        { icon: LayoutGrid, label: "لوحة التحكم", href: "/dashboard" },
        hasAnyPermission(user, ["viewAnalytics"]) &&
        { icon: BarChart2, label: "التحليلات", href: "/dashboard/analytics" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      type: "section",
      label: "الأقسام الرئيسية",
      icon: Package,
      items: [
        hasAnyPermission(user, ["viewCategories", "addCategories", "editCategories", "deleteCategories"]) &&
        { icon: Receipt, label: "الأقسام", href: "/dashboard/categories" },
        hasAnyPermission(user, ["viewProducts", "addProducts", "editProducts", "deleteProducts"]) &&
        { icon: Box, label: "المنتجات", href: "/dashboard/products" },
        hasAnyPermission(user, ["viewCategories", "addCategories", "editCategories", "deleteCategories"]) &&
        { icon: Warehouse, label: "المستودعات والدول", href: "/dashboard/inventories" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      type: "section",
      label: "المبيعات والطلبات",
      icon: Store,
      items: [
        hasAnyPermission(user, ["viewOrders", "addOrders", "editOrders", "deleteOrders"]) &&
        { icon: FileText, label: "الطلبات", href: "/dashboard/orders" },
        hasAnyPermission(user, ["viewWholesaleOrders", "addWholesaleOrders", "editWholesaleOrders", "deleteWholesaleOrders"]) &&
        { icon: FileText, label: "طلبات الجملة", href: "/dashboard/wholesale-orders" },
        hasAnyPermission(user, ["viewReturns", "addReturns", "editReturns", "deleteReturns"]) &&
        { icon: ArrowRightLeft, label: "المرتجعات", href: "/dashboard/returns" },
        hasAnyPermission(user, ["viewOrders", "viewWholesaleCustomers", "viewReturns", "addReturns"]) &&
        { icon: ArrowRightLeft, label: "مرتجعات المندوبين", href: "/dashboard/rep-returns" },
        hasPermission(user, "viewWarranty") &&
        { icon: ShieldCheck, label: "الكفالة", href: "/dashboard/warranty" },
        isAdmin(user) &&
        { icon: Truck, label: "شركات الشحن", href: "/dashboard/shipping" },
        hasAnyPermission(user, ["viewTracking", "editTracking"]) &&
        { icon: MapPin, label: "تتبع الشحنات", href: "/dashboard/tracking" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      type: "section",
      label: "العملاء والمندوبين",
      icon: Users,
      items: [
        hasAnyPermission(user, ["viewCustomers", "addCustomers", "editCustomers", "deleteCustomers"]) &&
        { icon: Users, label: "العملاء", href: "/dashboard/customers" },
        hasAnyPermission(user, ["viewWholesaleCustomers", "addWholesaleCustomers", "editWholesaleCustomers", "deleteWholesaleCustomers"]) &&
        { icon: Users2, label: "المندوبين", href: "/dashboard/wholesale-customers" },
        hasAnyPermission(user, ["viewTasks", "addTasks", "editTasks", "deleteTasks"]) &&
        { icon: ClipboardList, label: "المهام والمواعيد", href: "/dashboard/tasks" },
        hasAnyPermission(user, ["viewLoyalty", "editLoyalty"]) &&
        { icon: Award, label: "نقاط الولاء", href: "/dashboard/loyalty" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      type: "section",
      label: "المالية",
      icon: Wallet,
      items: [
        hasAnyPermission(user, ["viewCustomerPayments", "addCustomerPayments"]) &&
        { icon: CircleDollarSign, label: "الفواتير المستحقة", href: "/dashboard/customer-payments" },
        hasAnyPermission(user, ["viewExpenses", "addExpenses", "editExpenses", "deleteExpenses"]) &&
        { icon: Wallet, label: "المصاريف", href: "/dashboard/expenses" },
        isAdmin(user) &&
        { icon: ArrowRightLeft, label: "تحويلات المحفظة", href: "/dashboard/affiliate/wallet-transfers" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      type: "section",
      label: "التسويق",
      icon: Megaphone,
      items: [
        hasAnyPermission(user, ["viewMarketing", "addMarketing", "editMarketing", "deleteMarketing"]) &&
        { icon: Megaphone, label: "الحملات الإعلانية", href: "/dashboard/marketing/campaigns" },
        hasAnyPermission(user, ["viewMarketing", "addMarketing", "editMarketing", "deleteMarketing"]) &&
        { icon: BarChart2, label: "تحليلات التسويق", href: "/dashboard/marketing/analytics" },
        isAdmin(user) &&
        { icon: Ticket, label: "العروض", href: "/dashboard/offers" },
        isAdmin(user) &&
        { icon: BadgePercent, label: "خصومات العروض", href: "/dashboard/offer-discounts" },
        isAdmin(user) &&
        { icon: ImageIcon, label: "سلايدر الرئيسية", href: "/dashboard/hero-slides" },
        isAdmin(user) &&
        { icon: MessageCircle, label: "التعليقات", href: "/dashboard/comments" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      type: "section",
      label: "المستخدمين والأدوار",
      icon: Users2,
      items: [
        hasAnyPermission(user, ["viewEmployees", "addEmployees", "editEmployees", "deleteEmployees"]) &&
        { icon: Users, label: "المستخدمين", href: "/dashboard/users" },
        isAdmin(user) &&
        { icon: CircleDollarSign, label: "رواتب الموظفين", href: "/dashboard/employee-salaries" },
        hasAnyPermission(user, ["viewPermissions", "addPermissions", "editPermissions", "deletePermissions"]) &&
        { icon: ShieldCheck, label: "الأدوار والصلاحيات", href: "/dashboard/permissions" },
      ].filter(Boolean) as MenuItem[]
    },
    // ─── روابط مباشرة بدون dropdown ───
    hasPermission(user, "viewNotifications") &&
    { type: "link", icon: Bell, label: "الإشعارات", href: "/dashboard/notifications" },
    isAdmin(user) &&
    { type: "link", icon: Settings, label: "الإعدادات", href: "/dashboard/settings" },
    hasAnyPermission(user, ["viewPages", "addPages", "editPages", "deletePages"]) &&
    { type: "link", icon: PanelsTopLeft, label: "صفحات الموقع", href: "/dashboard/pages" },
    isAdmin(user) &&
    { type: "link", icon: Globe, label: "سفراء skynova", href: "/dashboard/affiliate" },
  ].filter(Boolean) as SidebarEntry[])
    .filter((entry) => entry.type === "link" || entry.items.length > 0) : [];

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/users/logout', {
        method: 'POST',
      });

      if (response.ok) {
        window.location.href = "/";
        toast.success("نراك قريباً!");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء محاولة تسجيل الخروج");
    }
  };

  const renderLink = (icon: any, label: string, href: string) => {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
    const Icon = icon;
    return (
      <Link
        key={href}
        href={href}
        onClick={() => window.innerWidth < 768 && setIsCollapsed(true)}
        className={`
            relative flex items-center gap-3 h-11 px-3 rounded-xl transition-all duration-300 group
            ${isActive
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"}
          `}
      >
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isActive ? "bg-blue-500/30 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"}`}>
          <Icon size={18} />
        </div>

        <span className={`font-bold text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "md:opacity-0 md:translate-x-10" : "opacity-100"}`}>
          {label}
        </span>

        {isActive && (
          <span className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-400 rounded-r-full" />
        )}

        {isCollapsed && (
          <div className="hidden md:block absolute right-full mr-4 px-3 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none shadow-2xl whitespace-nowrap">
            {label}
          </div>
        )}
      </Link>
    );
  };

  return (
    <aside className={`
        fixed md:sticky top-0 right-0 h-screen z-[70] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800
        flex flex-col shadow-2xl md:shadow-none
        ${isCollapsed
        ? "w-[280px] translate-x-full md:translate-x-0 md:w-[88px]"
        : "w-[280px] translate-x-0"}
      `}>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute ${isCollapsed ? "left-[11px] md:-left-4" : "-left-4"} top-10 flex h-7 w-7 items-center justify-center bg-blue-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform z-[80]`}
      >
        {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <div className="h-20 flex items-center px-6 mb-2 border-b border-slate-100 dark:border-slate-900">
        <div className="flex items-center gap-3 min-w-max">
          <div className="h-11 w-11 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
            <Sparkles size={22} className="text-white" />
          </div>
          <div className={`transition-all duration-300 ${isCollapsed ? "md:opacity-0 md:translate-x-4" : "opacity-100"}`}>
            <h1 className="font-black text-lg tracking-tight text-slate-800 dark:text-white">Skynova</h1>
            <p className="text-[10px] text-blue-500 font-bold uppercase">إدارة متكاملة</p>
          </div>
        </div>
      </div>

      {user && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 custom-scrollbar no-scrollbar space-y-1">
          {entries.map((entry) => {
            if (entry.type === "link") {
              return renderLink(entry.icon, entry.label, entry.href);
            }

            const isExpanded = isSectionExpanded(entry.label, entry.items);
            const isActive = isSectionActive(entry.items);

            return (
              <div key={entry.label} className="space-y-1">
                <button
                  type="button"
                  onClick={() => isCollapsed ? setIsCollapsed(false) : toggleSection(entry.label)}
                  className={`
                      relative flex w-full items-center gap-3 h-11 px-3 rounded-xl transition-all duration-300 group
                      ${isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"}
                    `}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isActive ? "bg-blue-100 dark:bg-blue-900/40" : "bg-slate-100 dark:bg-slate-800"}`}>
                    <entry.icon size={18} className={isActive ? "text-blue-600" : "text-slate-500 dark:text-slate-400"} />
                  </div>
                  <span className={`font-bold text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "md:opacity-0 md:translate-x-10" : "opacity-100"}`}>
                    {entry.label}
                  </span>
                  {!isCollapsed && (
                    <ChevronDown size={16} className={`mr-auto text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                  )}
                  {isCollapsed && (
                    <div className="hidden md:block absolute right-full mr-4 px-3 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none shadow-2xl whitespace-nowrap">
                      {entry.label}
                    </div>
                  )}
                </button>

                {!isCollapsed && isExpanded && (
                  <div className="mr-4 space-y-1 border-r-2 border-blue-100 dark:border-blue-900/30 pr-3">
                    {entry.items.map((item) => {
                      const isChildActive = isItemActive(item);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => window.innerWidth < 768 && setIsCollapsed(true)}
                          className={`
                              flex items-center gap-3 h-10 rounded-xl px-3 text-sm font-bold transition-all duration-300
                              ${isChildActive
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"}
                            `}
                        >
                          <item.icon size={16} className="shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="p-3 mt-auto border-t border-slate-100 dark:border-slate-900 space-y-3">
        {(canInstall || isIOS) && (
          <button
            onClick={isIOS ? handleIOSInstall : handleInstallApp}
            className={`w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-bold text-sm ${isCollapsed ? "md:h-10 md:w-10 md:mx-auto md:p-0" : "px-3"}`}
            title={isIOS ? "تثبيت التطبيق على iPhone" : "تثبيت التطبيق على الجهاز"}
          >
            <Download size={18} />
            {!isCollapsed && <span className="text-left w-full">{isIOS ? "تثبيت على iPhone" : "تنزيل التطبيق"}</span>}
          </button>
        )}

        <div className={`p-3 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 transition-all ${isCollapsed ? "md:p-2" : "p-3"}`}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 border-2 border-white dark:border-slate-800 shadow-sm text-white font-bold text-sm">
              {user?.username?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className={`transition-all duration-300 ${isCollapsed ? "md:hidden" : "block"}`}>
              <p className="text-xs font-black text-slate-800 dark:text-white truncate">{user?.username}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate">{user?.email}</p>
            </div>
          </div>

          <button onClick={handleLogout} className={`mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-white dark:bg-slate-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border border-slate-200 dark:border-slate-800 ${isCollapsed ? "md:h-10 md:w-10 md:mx-auto md:p-0" : "px-3"}`}>
            <LogOut size={18} />
            {!isCollapsed && <span className="font-bold text-xs text-left w-full">خروج</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
