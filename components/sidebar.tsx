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
  HelpCircle,
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
  Briefcase,
  MessageCircle,
  Settings2,
  CircleDollarSign,
  Globe,
  PanelsTopLeft,
  Sparkles,
  Download,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";

type MenuItem = {
  icon: any;
  label: string;
  href?: string;
  children?: MenuItem[];
};

type MenuGroup = {
  group: string;
  icon: any;
  colorClass: string;
  items: MenuItem[];
  collapsible?: boolean;
};

export const Sidebar = ({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean; setIsCollapsed: (val: boolean) => void }) => {
  const pathname = usePathname();
  const { user } = useAuth()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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
    if (item.href) {
      return pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
    }
    return item.children?.some(isItemActive) ?? false;
  };

  const isItemExpanded = (item: MenuItem) => {
    if (!item.children?.length) return false;
    return expandedItems[item.label] ?? isItemActive(item);
  };

  const toggleItem = (label: string) => {
    setExpandedItems((current) => ({
      ...current,
      [label]: !(current[label] ?? false),
    }));
  };

  const isGroupExpanded = (group: MenuGroup) => {
    if (!group.collapsible) return true;
    return expandedGroups[group.group] ?? false;
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [groupName]: !(current[groupName] ?? false),
    }));
  };

  const menuGroups: MenuGroup[] = user ? [
    {
      group: "الرئيسية",
      icon: LayoutGrid,
      colorClass: "text-blue-600",
      collapsible: false,
      items: [
        { icon: Home, label: "لوحة التحكم", href: "/dashboard" },
        (user && hasAnyPermission(user, ["viewAnalytics"])) &&
        { icon: BarChart2, label: "التحليلات", href: "/dashboard/analytics" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      group: "إدارة المخزون والمنتجات",
      icon: Package,
      colorClass: "text-amber-600",
      collapsible: false,
      items: [
        (user && hasAnyPermission(user, ["viewCategories", "addCategories", "editCategories", "deleteCategories"])) &&
        { icon: Receipt, label: "الأقسام", href: "/dashboard/categories" },
        (user && hasAnyPermission(user, ["viewCategories", "addCategories", "editCategories", "deleteCategories"])) &&
        { icon: Warehouse, label: "المستودعات والدول", href: "/dashboard/inventories" },
        (user && hasAnyPermission(user, ["viewProducts", "addProducts", "editProducts", "deleteProducts"])) &&
        { icon: Box, label: "المنتجات", href: "/dashboard/products" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      group: "المبيعات والطلبات",
      icon: Store,
      colorClass: "text-emerald-600",
      collapsible: false,
      items: [
        (user && hasAnyPermission(user, ["viewOrders", "addOrders", "editOrders", "deleteOrders"])) &&
        { icon: FileText, label: "الطلبات", href: "/dashboard/orders" },
        (user && hasAnyPermission(user, ["viewWholesaleOrders", "addWholesaleOrders", "editWholesaleOrders", "deleteWholesaleOrders"])) &&
        { icon: FileText, label: "طلبات الجملة", href: "/dashboard/wholesale-orders" },
        (user && hasPermission(user, "viewWarranty")) &&
        { icon: ShieldCheck, label: "الكفالة", href: "/dashboard/warranty" },
        (user && isAdmin(user)) &&
        { icon: Truck, label: "شركات الشحن", href: "/dashboard/shipping" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      group: "المبيعات والمالية المتقدمة",
      icon: CircleDollarSign,
      colorClass: "text-rose-600",
      collapsible: true,
      items: [
        (user && hasAnyPermission(user, ["viewSuppliers", "addSuppliers", "editSuppliers", "deleteSuppliers"])) &&
        { icon: Store, label: "الموردين", href: "/dashboard/suppliers" },
        (user && hasAnyPermission(user, ["viewPurchaseInvoices", "addPurchaseInvoices", "editPurchaseInvoices", "deletePurchaseInvoices"])) &&
        { icon: Receipt, label: "فواتير الشراء", href: "/dashboard/purchase-invoices" },
        (user && hasAnyPermission(user, ["viewCoupons", "addCoupons", "editCoupons", "deleteCoupons"])) &&
        { icon: BadgePercent, label: "الكوبونات", href: "/dashboard/coupons" },
        (user && hasAnyPermission(user, ["viewReturns", "addReturns", "editReturns", "deleteReturns"])) &&
        { icon: ArrowRightLeft, label: "المرتجعات", href: "/dashboard/returns" },
        (user && hasAnyPermission(user, ["viewCustomerPayments", "addCustomerPayments"])) &&
        { icon: CircleDollarSign, label: "الفواتير المستحقة", href: "/dashboard/customer-payments" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      group: "العملاء والمندوبين",
      icon: Users,
      colorClass: "text-purple-600",
      collapsible: false,
      items: [
        (user && hasAnyPermission(user, ["viewCustomers", "addCustomers", "editCustomers", "deleteCustomers"])) &&
        { icon: Users, label: "العملاء", href: "/dashboard/customers" },
        (user && hasAnyPermission(user, ["viewWholesaleCustomers", "addWholesaleCustomers", "editWholesaleCustomers", "deleteWholesaleCustomers"])) &&
        { icon: Users2, label: "المندوبين", href: "/dashboard/wholesale-customers" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      group: "التسويق",
      icon: Megaphone,
      colorClass: "text-rose-600",
      collapsible: true,
      items: [
        (user && hasAnyPermission(user, ["viewMarketing", "addMarketing", "editMarketing", "deleteMarketing"])) &&
        { icon: Megaphone, label: "الحملات الإعلانية", href: "/dashboard/marketing/campaigns" },
        (user && hasAnyPermission(user, ["viewMarketing", "addMarketing", "editMarketing", "deleteMarketing"])) &&
        { icon: BarChart2, label: "تحليلات التسويق", href: "/dashboard/marketing/analytics" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      group: "الموارد البشرية",
      icon: Briefcase,
      colorClass: "text-cyan-600",
      collapsible: true,
      items: [
        (user && hasAnyPermission(user, ["viewEmployees", "addEmployees", "editEmployees", "deleteEmployees"])) &&
        { icon: Users, label: "المستخدمين", href: "/dashboard/users" },
        (user && isAdmin(user)) &&
        { icon: CircleDollarSign, label: "رواتب الموظفين", href: "/dashboard/employee-salaries" },
        (user && hasAnyPermission(user, ["viewPermissions", "addPermissions", "editPermissions", "deletePermissions"])) &&
        { icon: ShieldCheck, label: "الأدوار والصلاحيات", href: "/dashboard/permissions" },
      ].filter(Boolean) as MenuItem[]
    },
    {
      group: "الإعدادات والنظام",
      icon: Settings,
      colorClass: "text-slate-600",
      collapsible: true,
      items: [
        {
          icon: Settings2,
          label: "الإعدادات",
          children: [
            (user && isAdmin(user)) &&
            { icon: Settings, label: "الإعدادات العامة", href: "/dashboard/settings" },
            (user && isAdmin(user)) &&
            { icon: MessageCircle, label: "التعليقات", href: "/dashboard/comments" },
            (user && isAdmin(user)) &&
            { icon: ImageIcon, label: "سلايدر الرئيسية", href: "/dashboard/hero-slides" },
            (user && isAdmin(user)) &&
            { icon: Ticket, label: "العروض", href: "/dashboard/offers" },
            (user && isAdmin(user)) &&
            { icon: BadgePercent, label: "خصومات العروض", href: "/dashboard/offer-discounts" },
          ].filter(Boolean) as MenuItem[]
        },
        {
          icon: PanelsTopLeft,
          label: "صفحات الموقع",
          children: [
            (user && hasAnyPermission(user, ["viewPages", "addPages", "editPages", "deletePages"])) &&
            { icon: FileText, label: "الصفحات", href: "/dashboard/pages" },
          ].filter(Boolean) as MenuItem[]
        },
        {
          icon: Globe,
          label: "سفراء skynova",
          children: [
            (user && isAdmin(user)) &&
            { icon: Ticket, label: "سفراء skynova", href: "/dashboard/affiliate" },
            (user && isAdmin(user)) &&
            { icon: Users2, label: "مستخدمو سفراء skynova", href: "/dashboard/affiliate/users" },
            (user && isAdmin(user)) &&
            { icon: ArrowRightLeft, label: "تحويلات المحفظة", href: "/dashboard/affiliate/wallet-transfers" },
          ].filter(Boolean) as MenuItem[]
        },
      ].filter(Boolean)
        .filter((item) => item.children ? item.children.length > 0 : true)
    },
  ].filter(group => group.items.length > 0) : [];

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
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 custom-scrollbar no-scrollbar space-y-5">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                {group.collapsible ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.group)}
                    className={`flex flex-1 items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-all duration-300 ${isCollapsed ? "md:opacity-0" : "opacity-100"}`}
                  >
                    <group.icon size={14} className={group.colorClass} />
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {group.group}
                    </span>
                    <ChevronDown size={14} className={`mr-auto text-slate-400 transition-transform duration-300 ${isGroupExpanded(group) ? "rotate-180" : ""}`} />
                  </button>
                ) : (
                  <div className={`flex items-center gap-2 px-3 py-2 transition-opacity duration-300 ${isCollapsed ? "md:opacity-0" : "opacity-100"}`}>
                    <group.icon size={14} className={group.colorClass} />
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {group.group}
                    </span>
                  </div>
                )}
              </div>

              <div className={`space-y-1 ${group.collapsible && !isGroupExpanded(group) ? "hidden" : ""}`}>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const isExpanded = isItemExpanded(item);
                  const hasChildren = item.children && item.children.length > 0;

                  if (hasChildren) {
                    return (
                      <div key={item.label} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => toggleItem(item.label)}
                          className={`
                              relative flex w-full items-center gap-3 h-11 px-3 rounded-xl transition-all duration-300 group
                              ${isItemActive(item)
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"}
                            `}
                        >
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isItemActive(item) ? "bg-blue-100 dark:bg-blue-900/40" : "bg-slate-100 dark:bg-slate-800"}`}>
                            <item.icon size={18} className={isItemActive(item) ? "text-blue-600" : "text-slate-500 dark:text-slate-400"} />
                          </div>
                          <span className={`font-bold text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "md:opacity-0 md:translate-x-10" : "opacity-100"}`}>
                            {item.label}
                          </span>
                          {!isCollapsed && (
                            <ChevronDown size={16} className={`mr-auto text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                          )}
                        </button>

                        {!isCollapsed && isExpanded && (
                          <div className="mr-4 space-y-1 border-r-2 border-blue-100 dark:border-blue-900/30 pr-3">
                            {item.children?.map((child: MenuItem) => {
                              const isChildActive = isItemActive(child);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href!}
                                  onClick={() => window.innerWidth < 768 && setIsCollapsed(true)}
                                  className={`
                                      flex items-center gap-3 h-10 rounded-xl px-3 text-sm font-bold transition-all duration-300
                                      ${isChildActive
                                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"}
                                    `}
                                >
                                  <child.icon size={16} className="shrink-0" />
                                  <span>{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href!}
                      onClick={() => window.innerWidth < 768 && setIsCollapsed(true)}
                      className={`
                          relative flex items-center gap-3 h-11 px-3 rounded-xl transition-all duration-300 group
                          ${isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"}
                        `}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isActive ? "bg-blue-500/30 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"}`}>
                        <item.icon size={18} />
                      </div>

                      <span className={`font-bold text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "md:opacity-0 md:translate-x-10" : "opacity-100"}`}>
                        {item.label}
                      </span>

                      {isActive && (
                        <span className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-400 rounded-r-full" />
                      )}

                      {isCollapsed && (
                        <div className="hidden md:block absolute right-full mr-4 px-3 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none shadow-2xl whitespace-nowrap">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
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
