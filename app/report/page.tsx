import type { Metadata } from 'next';
import {
    ShoppingCart, Warehouse, Users, Users2, Wallet, Megaphone, Share2,
    BarChart3, ShieldCheck, ScanBarcode, RefreshCcw, BadgeCheck, Truck,
    HeartHandshake, ClipboardList, BellRing, DatabaseBackup, Globe,
    FileText, Lock, Smartphone, CheckCircle2,
} from 'lucide-react';
import { PrintReportButton } from './PrintReportButton';

export const metadata: Metadata = {
    title: 'تقرير نظام SKYNOVA CRM',
    description: 'تقرير تعريفي شامل بإمكانيات نظام SKYNOVA CRM لإدارة المبيعات والمخزون والعملاء والتسويق',
    robots: { index: false, follow: false },
};

/* ───────── مكوّنات عرض صغيرة ───────── */

function Section({ id, icon: Icon, title, subtitle, children }: {
    id: string; icon: any; title: string; subtitle?: string; children: React.ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-8">
            <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                    <Icon size={22} />
                </span>
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">{title}</h2>
                    {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

function FeatureCard({ icon: Icon, title, points, tone }: {
    icon: any; title: string; points: string[]; tone: string;
}) {
    return (
        <div className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <span className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                <Icon size={20} />
            </span>
            <h3 className="mb-3 text-base font-black text-slate-800 dark:text-white">{title}</h3>
            <ul className="space-y-2">
                {points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        <CheckCircle2 size={15} className="mt-1 shrink-0 text-emerald-500" />
                        {point}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur">
            <div className="text-2xl font-black text-white md:text-3xl">{value}</div>
            <div className="mt-1 text-[11px] font-bold text-blue-100 md:text-xs">{label}</div>
        </div>
    );
}

function PageGuideGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-white">
                <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
                {title}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
        </div>
    );
}

function PageGuideCard({ title, path, points, how }: {
    title: string; path: string; points: string[]; how: string;
}) {
    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-base font-black text-slate-800 dark:text-white">{title}</h4>
                <code className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400" dir="ltr">{path}</code>
            </div>
            <ul className="mb-4 space-y-1.5">
                {points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        <CheckCircle2 size={14} className="mt-1 shrink-0 text-blue-500" />
                        {point}
                    </li>
                ))}
            </ul>
            <p className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-200">آلية العمل: </strong>{how}
            </p>
        </div>
    );
}

/* ───────── الصفحة ───────── */

export default function SystemReportPage() {
    return (
        <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">

            {/* ═══ الترويسة ═══ */}
            <header className="relative overflow-hidden bg-gradient-to-bl from-blue-700 via-indigo-700 to-violet-800">
                <div className="pointer-events-none absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="relative mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
                    <img src="/skynova-light.png" alt="SKYNOVA" className="mx-auto mb-6 h-16 object-contain md:h-20" />
                    <h1 className="text-3xl font-black text-white md:text-5xl">نظام SKYNOVA CRM</h1>
                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-blue-100 md:text-lg">
                        منظومة متكاملة لإدارة المبيعات والمخزون والعملاء والتسويق —
                        تجربة عربية كاملة تعمل على جميع الأجهزة، وتغنيك عن عشرات الأدوات المتفرقة
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <PrintReportButton />
                        <a href="#features"
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 transition-all hover:bg-blue-50 print:hidden">
                            استعراض الإمكانيات
                        </a>
                    </div>
                    <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
                        <Stat value="+35" label="شاشة إدارية" />
                        <Stat value="+60" label="صلاحية دقيقة" />
                        <Stat value="4" label="أدوار مستخدمين" />
                        <Stat value="24/7" label="عمل متواصل" />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl space-y-16 px-6 py-14">

                {/* ═══ نبذة ═══ */}
                <Section id="about" icon={FileText} title="ما هو النظام؟" subtitle="نبذة تعريفية">
                    <div className="rounded-3xl border border-slate-100 bg-white p-6 leading-loose text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:p-8">
                        <p>
                            <strong className="text-slate-800 dark:text-white">SKYNOVA CRM</strong> هو نظام إدارة علاقات عملاء وموارد مؤسسة (CRM/ERP)
                            مصمم لشركات التجارة والتوزيع. يغطي دورة البيع كاملة: من إدارة المنتجات والمخزون عبر مستودعات متعددة ودولتين،
                            إلى طلبات التجزئة والجملة، والمرتجعات والكفالة، والتحصيل والأقساط، وحوافز الموظفين ورواتبهم —
                            وصولاً إلى منصة تسويق بالعمولة (أفلييت) وحملات واتساب وبريد إلكتروني مدمجة.
                        </p>
                        <p className="mt-4">
                            يعمل النظام بالكامل باللغة العربية وبالاتجاه RTL، ويدعم الوضع الليلي، ويعمل كتطبيق جوال (PWA)
                            يمكن تثبيته على الشاشة الرئيسية، مع دعم مدمج للباركود توليداً وطباعةً ومسحاً بكاميرا الجهاز.
                        </p>
                    </div>
                </Section>

                {/* ═══ الوحدات ═══ */}
                <Section id="features" icon={ShoppingCart} title="الوحدات الرئيسية" subtitle="كل ما تحتاجه إدارة المبيعات في مكان واحد">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        <FeatureCard icon={ShoppingCart} title="المبيعات والطلبات" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
                            points={[
                                'إنشاء وتعديل الطلبات مع بطاقات حالات مرئية',
                                'تحديث حالة الطلب ينعكس فوراً على المخزون',
                                'تصدير Excel وPDF ومشاركة الفاتورة عبر واتساب',
                                'تعيين شركة الشحن وتتبع الشحنة بست حالات',
                            ]} />
                        <FeatureCard icon={Warehouse} title="المخزون والمستودعات" tone="bg-amber-50 text-amber-600 dark:bg-amber-950/50"
                            points={[
                                'مستودعات متعددة عبر دول ومدن متعددة',
                                'حركات مخزون موثقة: توريد وصرف وتحويل وجرد',
                                'سعر وخصم مستقل لكل منتج في كل مستودع',
                                'تنبيهات تلقائية عند انخفاض المخزون',
                            ]} />
                        <FeatureCard icon={Users} title="إدارة العملاء (CRM)" tone="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
                            points={[
                                'مراحل بيع متدرجة من فرصة جديدة حتى تم البيع',
                                'إسناد العملاء للموظفين ومتابعة التواصلات',
                                'إنشاء طلب مباشرة من بطاقة العميل',
                                'استيراد وتصدير Excel ورسائل واتساب وبريد',
                            ]} />
                        <FeatureCard icon={Users2} title="الجملة والمندوبون" tone="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
                            points={[
                                'ملفات عملاء جملة مع مواقع GPS وزيارات ميدانية',
                                'طلبات جملة بشرائح أسعار حسب الكمية',
                                'مرتجعات مندوبين بصلاحيات ونطاق رؤية محدد',
                                'مهام ومواعيد متابعة لكل مندوب',
                            ]} />
                        <FeatureCard icon={Wallet} title="المالية والتحصيل" tone="bg-rose-50 text-rose-600 dark:bg-rose-950/50"
                            points={[
                                'دفعات وأقساط: نقدي وحوالة وتقسيط وشيك',
                                'كشف حساب تفصيلي لكل عميل مع المتبقي',
                                'صناديق نقد بثلاث عملات وسعر صرف محدث',
                                'تقارير المتأخرين في السداد',
                            ]} />
                        <FeatureCard icon={BarChart3} title="التحليلات والتقارير" tone="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50"
                            points={[
                                'رسوم بيانية للمبيعات حسب الحالة والمدينة والزمن',
                                'أفضل المنتجات والعملاء وتقارير أداء الموظفين',
                                'تتبع أهداف المبيعات الشهرية لكل موظف',
                                'تصدير التقارير بصيغة PDF',
                            ]} />
                        <FeatureCard icon={Megaphone} title="التسويق والحملات" tone="bg-pink-50 text-pink-600 dark:bg-pink-950/50"
                            points={[
                                'حملات واتساب عبر WhatsApp Cloud API الرسمي',
                                'حملات بريد إلكتروني مع تتبع الفتح والنقر',
                                'استهداف شرائح: تجزئة أو جملة أو مخصص',
                                'قياس التحويلات لكل حملة',
                            ]} />
                        <FeatureCard icon={Share2} title="منصة الأفلييت (سفراء)" tone="bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50"
                            points={[
                                'روابط تسويق خاصة بكل مسوّق مع صفحة هبوط',
                                'عمولات تلقائية تُعتمد عند تسليم الطلب',
                                'محفظة مالية وتحويلات للمسوّقين',
                                'لوحة متابعة مستقلة لكل مسوّق',
                            ]} />
                        <FeatureCard icon={BadgeCheck} title="الموارد البشرية" tone="bg-teal-50 text-teal-600 dark:bg-teal-950/50"
                            points={[
                                'أربعة أدوار: مدير ومسؤول وموظف ومسوّق',
                                'أهداف مبيعات شهرية بمكافآت وجزاءات',
                                'كشف رواتب شهري بالعمولات تلقائياً',
                                'إمكانية معاينة النظام بعين أي موظف',
                            ]} />
                    </div>
                </Section>

                {/* ═══ شرح صفحات النظام ═══ */}
                <Section id="pages-guide" icon={ClipboardList} title="شرح صفحات النظام" subtitle="ماذا تفعل كل صفحة وكيف تعمل">
                    <div className="space-y-10">
                        <PageGuideGroup title="الرئيسية والمبيعات">
                            <PageGuideCard title="لوحة التحكم" path="/dashboard"
                                points={[
                                    'ملخص نشاطك مع العملاء (رسائل، طلبات، عملاء جدد) مع فلتر زمني',
                                    'تقدم أهداف المبيعات (التاركت) لكل موظف مع نسب الإنجاز والمكافآت',
                                    'إنشاء وتعديل وحذف أهداف الموظفين (للأدمن)',
                                    'قسم خاص بأداء الأفلييت لمن لديه حساب مسوّق',
                                ]}
                                how="تجلب البيانات من GetEmployeeActivitySummary وGetUserTargetProgress (server/analytics) وأكشنز الأهداف من server/user حسب المستخدم الحالي." />
                            <PageGuideCard title="إدارة الطلبات" path="/dashboard/orders"
                                points={[
                                    'جدول الطلبات مع بطاقات حالات وفلاتر (بحث، مدينة، مستودع، شركة شحن، شهر)',
                                    'إنشاء وتعديل الطلبات مع المنتجات والخصومات وطرق الدفع',
                                    'تغيير الحالة ينعكس فوراً على المخزون (حجز/استرجاع)',
                                    'تصدير واستيراد Excel ومشاركة الفاتورة PDF عبر واتساب',
                                ]}
                                how="تعمل عبر server/order (createOrder, updateOrder, updateStaus) مع هوك useOrderData للجلب وuseOrderFilters للفلترة، والمخزون يُعدّل داخل معاملة واحدة مع الطلب." />
                            <PageGuideCard title="إدارة العملاء (CRM)" path="/dashboard/customers"
                                points={[
                                    'عرض العملاء بجدول أو بطاقات مع فلاتر حالة وجنس وفترة وبحث',
                                    'مراحل بيع متدرجة: فرصة جديدة، مهتم، تم البيع...',
                                    'إسناد العملاء للموظفين وإنشاء طلب من بطاقة العميل',
                                    'استيراد/تصدير Excel وإرسال واتساب أو بريد مباشر',
                                ]}
                                how="تجلب القائمة عبر getCustomerList من server/customer، وغير الأدمن يرى فقط العملاء المسندين إليه. الإيميل عبر sendEmailToRecipient والحملات من server/marketing." />
                            <PageGuideCard title="العملاء المكتملون" path="/dashboard/customers-complated"
                                points={[
                                    'نفس صفحة العملاء لكن مقيّدة على حالة "تم البيع" فقط',
                                    'إدارة كاملة: تعديل، ربط موظفين، إنشاء طلب جديد',
                                    'فتح محادثة رسائل مع العميل',
                                ]}
                                how="نفس بنية صفحة العملاء مع حالة مثبتة FORCE_STATUS = تم البيع عند الجلب من server/customer." />
                            <PageGuideCard title="عملاء الجملة والمندوبون" path="/dashboard/wholesale-customers"
                                points={[
                                    'ملفات عملاء جملة (صيدلية، محل...) مع موقع GPS وخريطة',
                                    'تسجيل زيارات المندوبين بنتيجة وسبب رفض وموعد متابعة',
                                    'إحصائيات: العملاء، زيارات اليوم، الفرص الساخنة، مبيعات الشهر',
                                    'إنشاء طلب جملة من ملف العميل وإرسال حملات',
                                ]}
                                how="تعمل عبر server/wholesale-customer مع خريطة OpenStreetMap وGeolocation API، والدول والمدن تُجلب ديناميكياً من getCountriesWithCities." />
                            <PageGuideCard title="طلبات الجملة" path="/dashboard/wholesale-orders"
                                points={[
                                    'إنشاء وتعديل طلبات الجملة بتسعير تلقائي حسب شرائح الكمية',
                                    'جدول مع بطاقات حالات وفلاتر وتغيير حالة مباشر',
                                    'تصدير Excel وتوليد PDF لكل طلب',
                                    'فتح مودال إنشاء لعميل محدد عبر ?customerId=',
                                ]}
                                how="تعمل عبر server/wholesale-order مع شرائح أسعار لكل منتج/مستودع، والتصدير عبر wholesaleOrderExport." />
                            <PageGuideCard title="مرتجعات المندوبين" path="/dashboard/rep-returns"
                                points={[
                                    'جدول مرتجعات طلبات الجملة مع السبب والمبلغ المسترد',
                                    'إنشاء مرتجع بتحديد كميات الأصناف والسبب',
                                ]}
                                how="تجلب عبر getRepReturns/getRepOrders من server/rep-return والإنشاء عبر createRepReturn." />
                            <PageGuideCard title="إدارة المرتجعات" path="/dashboard/returns"
                                points={[
                                    'جدول مرتجعات الطلبات العادية مع بحث',
                                    'إنشاء مرتجع بتحديد الكميات والسبب والمستودع',
                                    'حذف مرتجع بصلاحية خاصة',
                                ]}
                                how="تعمل عبر server/return (getOrderReturns, createOrderReturn, deleteOrderReturn) وتُعاد الكميات للمستودع المختار." />
                            <PageGuideCard title="إدارة الكفالة" path="/dashboard/warranty"
                                points={[
                                    'ثلاثة جداول: تبديل، صيانة، تالف',
                                    'إضافة حركة كفالة بالمنتج والمستودع والكمية والأجور',
                                    'التبديل ينشئ طلباً مرتبطاً برقم ظاهر',
                                ]}
                                how="تجلب كل البيانات دفعة واحدة عبر getWarrantyData من server/warranty، وكل حركة تعدّل المخزون وتسجّل StockMovement (OUT/RETURN)." />
                            <PageGuideCard title="الفواتير والدفعات" path="/dashboard/customer-payments"
                                points={[
                                    'بطاقات العملاء المتأخرين بالسداد مع إجمالي الدين',
                                    'تسجيل دفعة (نقدي/حوالة/تقسيط/شيك) مرتبطة بفاتورة',
                                    'كشف حساب تفصيلي لكل عميل في صفحة مستقلة',
                                ]}
                                how="تعمل عبر server/customer-payment (getCustomerPayments, getOverdueCustomers, createCustomerPayment)، وكشف الحساب على مسار فرعي statement." />
                            <PageGuideCard title="شركات الشحن" path="/dashboard/shipping"
                                points={[
                                    'بطاقات شركات الشحن مع السعر وعدد الطلبات',
                                    'إضافة وتعديل وحذف شركة (اسم + سعر)',
                                    'مودال تفاصيل: إجماليات وملخص حالات وجدول الطلبات',
                                ]}
                                how="تجلب عبر getshippingWithOrders من server/shipping (كل شركة مع طلباتها وإجمالياتها)." />
                            <PageGuideCard title="تتبع الشحنات" path="/dashboard/tracking"
                                points={[
                                    'جدول الطلبات مع رقم التتبع وحالة الشحنة (6 حالات)',
                                    'تحديث رقم التتبع والحالة ورابط المتابعة',
                                    'فتح رابط التتبع الخارجي مباشرة',
                                ]}
                                how="تعمل عبر server/tracking (getOrdersWithTracking, updateOrderTracking) مع ترجمة الحالات من lib/utils." />
                        </PageGuideGroup>

                        <PageGuideGroup title="المنتجات والمخزون">
                            <PageGuideCard title="إدارة المنتجات" path="/dashboard/products"
                                points={[
                                    'عرض بنمطين (بطاقات/جدول) مع بحث ومسح باركود بالكاميرا',
                                    'إضافة وتعديل منتج بصور متعددة ووصف غني وباركود تلقائي',
                                    'سعر وكمية مستقلة لكل منتج في كل مستودع',
                                    'تفعيل/تعطيل وإظهار في الإعلانات وصفحة هبوط لكل منتج',
                                ]}
                                how="تجلب عبر getProduct وgetWarehouse، والحفظ عبر saveProductWithFiles مع رفع الصور إلى Vercel Blob، والأزرار مقيدة بصلاحيات المنتجات." />
                            <PageGuideCard title="إدارة الفئات" path="/dashboard/categories"
                                points={[
                                    'بطاقات الفئات مع الصورة وعدد المنتجات وحالة الظهور',
                                    'إضافة وتعديل فئة بصورة وخيار إظهار في المتجر',
                                    'حذف مع تأكيد وصلاحيات مستقلة',
                                ]}
                                how="تعمل عبر server/category (getallcategory, createcategory, updatecategory, deletecategory) بنماذج DynamicForm + Zod." />
                            <PageGuideCard title="المستودعات والبلدان والمدن" path="/dashboard/inventories"
                                points={[
                                    'إدارة البلدان والمدن والمستودعات وربطها ببعضها',
                                    'عرض مخزون وكميات كل مستودع',
                                    'حركات مخزون موثقة: توريد، صرف، تحويل، جرد',
                                    'مسح باركود لإضافة المنتجات لبنود الحركة',
                                ]}
                                how="تجمع server/country وserver/city وserver/warehouse وserver/move في شاشة واحدة، وكل حركة تُسجّل عبر createMovementAction وتعدّل الكميات فوراً." />
                            <PageGuideCard title="طباعة ملصقات الباركود" path="/dashboard/barcode-labels"
                                points={[
                                    'البحث عن منتج وإضافته لقائمة الملصقات',
                                    'عدد نسخ لكل منتج وحجمان للملصق (صغير/كبير)',
                                    'طباعة مباشرة أو تنزيل PNG بدقة 300 DPI',
                                ]}
                                how="صفحة عميل بالكامل: الباركود Code39 يُولّد محلياً من lib/barcode والسعر يُنسّق بعملة الموقع، بلا أي كتابة على الخادم." />
                            <PageGuideCard title="نقاط الولاء" path="/dashboard/loyalty"
                                points={[
                                    'قواعد كسب واستبدال النقاط (نقاط/عملة، قيمة النقطة)',
                                    'سجل حركات النقاط (كسب، استبدال، مكافأة)',
                                    'استبدال نقاط عميل بخصم أو إضافة مكافأة يدوية',
                                ]}
                                how="تعمل عبر server/loyalty، والكسب التلقائي يحدث في الخادم عند إنشاء الطلبات حسب القاعدة المفعّلة." />
                            <PageGuideCard title="إدارة العروض" path="/dashboard/offers"
                                points={[
                                    'جدول العروض مع العنوان والزر وفترة الصلاحية',
                                    'إضافة عرض بصورة وعد تنازلي وترتيب ظهور',
                                ]}
                                how="تعمل عبر server/offer (getOffers, createOffer, updateOffer, deleteOffer) ومتاحة للأدمن فقط." />
                            <PageGuideCard title="قواعد خصومات العروض" path="/dashboard/offer-discounts"
                                points={[
                                    'ربط خصم (نسبة/مبلغ) بعرض ومنتج أو تصنيف',
                                    'حدود: أقصى خصم، أدنى طلب، حد استخدام، صلاحية',
                                    'استهداف هرمي: تصنيف ← مستودع ← منتج',
                                ]}
                                how="تجلب القواعد وبيانات النموذج من server/offer (getOfferDiscounts, getOfferDiscountFormMeta) وتُدار للأدمن فقط." />
                            <PageGuideCard title="سلايدر الرئيسية" path="/dashboard/hero-slides"
                                points={[
                                    'إدارة سلايدات الصفحة الرئيسية للمتجر',
                                    'صورة وعنوان وزر وترتيب وتفعيل لكل سلايد',
                                ]}
                                how="تعمل عبر server/hero-slide مع رفع الصور، والسلايدات النشطة تظهر في واجهة المتجر العامة." />
                            <PageGuideCard title="الصفحات الثابتة" path="/dashboard/pages"
                                points={[
                                    'إنشاء صفحات مثل: من نحن، سياسة الخصوصية',
                                    'محرر نصوص غني وحقول SEO ورابط slug تلقائي',
                                    'نشر أو مسودة لكل صفحة',
                                ]}
                                how="تعمل عبر server/page، والصفحات المنشورة تُعرض للزوار على المسار /[slug]." />
                            <PageGuideCard title="إدارة التعليقات" path="/dashboard/comments"
                                points={[
                                    'جدول مراجعات المنتجات مع التقييم والنص',
                                    'حذف التعليقات المسيئة (للأدمن فقط)',
                                ]}
                                how="تجلب المراجعات من server/review (getReviews) والحذف عبر deleteReview؛ المحتوى يأتي من المتجر العام." />
                        </PageGuideGroup>
                        <PageGuideGroup title="الإدارة والنظام">
                            <PageGuideCard title="الموظفون والأهداف" path="/dashboard/users"
                                points={[
                                    'جدول الموظفين مع أدوارهم وإضافة وتعديل وحذف',
                                    'إسناد موظف مسؤول لكل موظف (نطاق الرؤية الهرمي)',
                                    'أهداف مبيعات ونشاط لكل موظف مع تقرير إنجاز مفصّل',
                                    'تصدير تقرير أداء الموظف PDF ومعاينة النظام بعينه (انتحال)',
                                ]}
                                how="تعمل عبر server/user (إدارة المستخدمين والأهداف والانتحال) وGetUserTargetProgress من server/analytics لتقارير الإنجاز والعمولات." />
                            <PageGuideCard title="الصلاحيات" path="/dashboard/permissions"
                                points={[
                                    'إنشاء أدوار مخصصة بأسماء حرة (مثل: مستودع، مبيعات)',
                                    'أكثر من 60 صلاحية دقيقة: عرض/إضافة/تعديل/حذف لكل موديول',
                                    'ربط كل دور بالموظفين وتُفرض على الواجهة والخادم',
                                ]}
                                how="تُخزَّن الصلاحيات في نموذج Permission وتُفحص عبر hasPermission/isAdmin من lib/utils في كل server action وصفحة." />
                            <PageGuideCard title="رواتب الموظفين" path="/dashboard/employee-salaries"
                                points={[
                                    'كشف رواتب شهري لكل موظف: أساسي + عمولات + مكافآت − جزاءات',
                                    'احتساب تلقائي من أداء المبيعات وأهداف الشهر',
                                    'اعتماد ودفع الرواتب وتوثيق حالة كل كشف',
                                ]}
                                how="تعمل عبر server/employee-salaries مع بيانات الأداء من server/analytics، وتُجمَّد الأهداف شهرياً بمهمة cron (lib/cron)." />
                            <PageGuideCard title="المهام والمواعيد" path="/dashboard/tasks"
                                points={[
                                    'مهام لكل موظف: زيارة، اتصال، اجتماع مع تاريخ وتذكير',
                                    'متابعة حالة الإنجاز وربط المهمة بعميل',
                                ]}
                                how="تعمل عبر server/task وتظهر التذكيرات ضمن نظام الإشعارات." />
                            <PageGuideCard title="الإشعارات" path="/dashboard/notifications"
                                points={[
                                    'كل تنبيهات النظام: تغيّر حالات الطلبات، مهام، مخزون منخفض',
                                    'تحديد كمقروء وحذف فردي أو جماعي',
                                ]}
                                how="تعمل عبر server/notification — تُنشأ الإشعارات تلقائياً من الأحداث (مثل createOrderStatusChangeNotification عند تغيّر حالة طلب)." />
                            <PageGuideCard title="الإعدادات" path="/dashboard/settings"
                                points={[
                                    'عملة الموقع وسعر صرفها مقابل الدولار وصندوق النقد',
                                    'إعدادات واتساب Cloud API والبريد والمفاتيح',
                                    'نسخ احتياطي واستعادة قاعدة البيانات',
                                    'نقل البيانات بين البيئات',
                                ]}
                                how="تعمل عبر server/general-settings (upsertGeneralSettings) وserver/backup؛ العملة وسعر الصرف يقودان عرض الأسعار في كل النظام." />
                            <PageGuideCard title="الأفلييت (المسوّقون)" path="/dashboard/affiliate"
                                points={[
                                    'إدارة حسابات المسوّقين وروابط الإحالة الخاصة بهم',
                                    'العمولات: اعتماد عند التسليم وإلغاء عند الإرجاع',
                                    'محافظ مالية وتحويلات للمسوّقين',
                                ]}
                                how="تعمل عبر server/affiliate — ربط الطلب بالمسوّق يتم عبر كوكي affiliate-code عند إنشاء الطلب من رابط الإحالة." />
                            <PageGuideCard title="الحملات التسويقية" path="/dashboard/marketing/campaigns"
                                points={[
                                    'حملات واتساب (قوالب معتمدة أو نص حر) وبريد إلكتروني',
                                    'استهداف شرائح: كل العملاء، الجملة، المندوبون، أو مخصص',
                                    'جدولة الحملة وتتبع الإرسال والتحويلات',
                                ]}
                                how="تعمل عبر server/marketing — الإرسال الفعلي عبر WhatsApp Cloud API (lib/whatsapp) وResend للبريد." />
                            <PageGuideCard title="تحليلات التسويق" path="/dashboard/marketing/analytics"
                                points={[
                                    'أداء الحملات: معدلات الإرسال والفتح والتحويل',
                                    'مقارنة الحملات وقياس عائد كل قناة',
                                ]}
                                how="تجمع إحصاءاتها من بيانات الحملات والتحويلات في server/marketing." />
                        </PageGuideGroup>
                    </div>
                </Section>

                {/* ═══ صفحة التحليلات بالتفصيل ═══ */}
                <Section id="analytics-guide" icon={BarChart3} title="صفحة التحليلات بالتفصيل" subtitle="كل بطاقة ورسم بياني في الصفحة وما تعنيه">
                    <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-6 leading-loose text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        <p>
                            صفحة <strong className="text-slate-800 dark:text-white">التحليلات</strong> (<code dir="ltr">/dashboard/analytics</code>) هي مركز الأرقام في النظام.
                            تجمع كل مؤشرات الأداء في شاشة واحدة، مع فلاتر عليا تتحكم بكل الأقسام دفعة واحدة:
                            <strong> الفترة الزمنية</strong> (اليوم، الأسبوع، الشهر الحالي/الماضي، أو نطاق مخصص بتاريخين)
                            و<strong>المستودع</strong> (قائمة ديناميكية بكل المستودعات الفعلية — اختيار مستودع يقيّد كل الأرقام بطلباته).
                            كل المبالغ محسوبة بالدولار من عناصر الطلبات مباشرة (السعر بعد الخصم × الكمية)، وتُعرض بعملة الموقع حسب الإعدادات.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <PageGuideCard title="المبيعات حسب الحالة" path="#analytics-guide"
                            points={[
                                'بطاقات لكل حالة طلب (جديد، مرسل، مسلّم، ملغي، مرتجع...)',
                                'عدد الطلبات وإجمالي المبلغ لكل حالة',
                                'ملخص الإيراد (المبيعات الفعلية) مقابل المفقود (ملغي + مرتجع)',
                                'الضغط على أي بطاقة يعرض طلباتها بالتفصيل',
                            ]}
                            how="عبر GetSalesByStatusAction: تجميع الطلبات حسب الحالة ضمن الفترة والمستودع المختارين، والمبلغ يُحسب من عناصر كل طلب بالدولار." />
                        <PageGuideCard title="الخط الزمني للمبيعات" path="#analytics-guide"
                            points={[
                                'رسم بياني شهري للمبيعات عبر الزمن',
                                'يميّز بين المبيعات المحتسبة وغير المحتسبة كإيراد',
                            ]}
                            how="عبر GetSalesTimelineAction: تجميع الطلبات شهرياً باستخدام التاريخ الفعلي للطلب (اليدوي إن وُجد وإلا تاريخ الإنشاء)." />
                        <PageGuideCard title="توزيع الطلبات حسب مدينة المستودع" path="#analytics-guide"
                            points={[
                                'رسم دائري بنسبة كل مدينة من إجمالي المبيعات',
                                'مفتاح ألوان بجانب الرسم: اسم المدينة وعدد الطلبات والمبلغ',
                            ]}
                            how="عبر GetSalesByCity: تجميع حسب مدينة المستودع المرتبطة بكل طلب (مدينة المستودع الفعلية من قاعدة البيانات)." />
                        <PageGuideCard title="الطلبات حسب مدينة العميل" path="#analytics-guide"
                            points={[
                                'عدد الطلبات وإجماليها حسب مدينة العميل كما كُتبت في الطلب',
                            ]}
                            how="عبر GetOrdersByCity: تجميع حسب حقل المدينة النصي في الطلب نفسه (وجهة التوصيل)." />
                        <PageGuideCard title="أفضل المنتجات مبيعاً" path="#analytics-guide"
                            points={[
                                'ترتيب المنتجات حسب الكمية المباعة في الفترة',
                            ]}
                            how="عبر GetBestSellingProducts: جمع كميات عناصر الطلبات لكل منتج وترتيبها تنازلياً." />
                        <PageGuideCard title="رؤى المنتجات" path="#analytics-guide"
                            points={[
                                'تحليل شامل لكل منتج: إيراد، خصومات، تكاليف موزعة، صافي ربح',
                                'عمولات الأفلييت وزيارات صفحات الإعلانات لكل منتج',
                                'أرقام الكفالة (تالف/تبديل/صيانة) مؤثرة على التكلفة',
                            ]}
                            how="عبر GetProductInsightsAction: أعقد تحليل في النظام — يوزّع تكاليف الشحن والعمولات على عناصر الطلبات ويخصمها من الإيراد لإخراج صافي ربح كل منتج." />
                        <PageGuideCard title="المخزون المنخفض" path="#analytics-guide"
                            points={[
                                'المنتجات التي قاربت على النفاد مع الكمية المتبقية والمستودع',
                            ]}
                            how="عبر GetLowStockProducts: فحص كميات المخزون في كل المستودعات مقابل حد التنبيه." />
                        <PageGuideCard title="حالة الكفالة" path="#analytics-guide"
                            points={[
                                'بطاقات لأنواع الكفالة الثلاثة (تالف، تبديل، صيانة) مع الأعداد',
                                'الضغط على أي بطاقة يعرض المنتجات والتفاصيل',
                            ]}
                            how="عبر GetWarrantyStatusProducts: تجميع سجلات الكفالة حسب النوع والمنتج والمستودع." />
                        <PageGuideCard title="أفضل الموظفين مبيعاً" path="#analytics-guide"
                            points={[
                                'ترتيب الموظفين حسب مبلغ المبيعات في الفترة',
                                'عرض تفصيلي لطلبات كل موظف وعناصرها',
                            ]}
                            how="عبر GetTopSellingUsersByPermission: جمع مبالغ الطلبات (من عناصرها بالدولار) لكل موظف." />
                        <PageGuideCard title="تقرير الموظفين والعملاء" path="#analytics-guide"
                            points={[
                                'أعداد العملاء والطلبات لكل موظف بفترة (يوم/أسبوع/شهر/مخصص)',
                                'تصدير التقرير كاملاً بصيغة PDF',
                            ]}
                            how="عبر GetEmployeeCustomerReport: إحصاءات لكل موظف، والتصدير يتم من المتصفح عبر jsPDF." />
                        <PageGuideCard title="المناطق النشطة لعملاء الجملة" path="#analytics-guide"
                            points={[
                                'توزيع عملاء الجملة والزيارات حسب المدينة والمنطقة',
                            ]}
                            how="عبر GetWholesaleActiveRegions: تجميع عملاء الجملة وزياراتهم جغرافياً." />
                        <PageGuideCard title="تحليل صفحات الإعلانات" path="#analytics-guide"
                            points={[
                                'زيارات وأداء صفحات هبوط المنتجات الإعلانية',
                                'ظاهر للأدمن فقط',
                            ]}
                            how="قسم مستقل (AdPagesAnalyticsSection) يتبع زيارات صفحات /ad الإعلانية ويربطها بالمنتجات." />
                    </div>
                </Section>

                {/* ═══ ميزات بارزة ═══ */}
                <Section id="highlights" icon={ShieldCheck} title="ميزات بارزة" subtitle="تفاصيل تصنع الفرق">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { icon: ScanBarcode, title: 'باركود مدمج', desc: 'توليد Code39 وطباعة ملصقات ومسح بكاميرا الجوال أو اللابتوب' },
                            { icon: RefreshCcw, title: 'مرتجعات وكفالة', desc: 'مرتجعات بأسباب موثقة وكفالة (تبديل/صيانة/تالف) مرتبطة بالمخزون' },
                            { icon: HeartHandshake, title: 'نقاط ولاء', desc: 'قواعد كسب واستبدال مرنة ومكافآت يدوية للعملاء المميزين' },
                            { icon: Truck, title: 'تتبع الشحنات', desc: 'أرقام تتبع وحالات وروابط متابعة وشركات شحن متعددة' },
                            { icon: ClipboardList, title: 'مهام ومواعيد', desc: 'زيارات واتصالات واجتماعات مع تذكيرات تلقائية' },
                            { icon: BellRing, title: 'إشعارات ذكية', desc: 'تنبيهات مخزون منخفض وتغيّر حالات الطلبات والمهام' },
                            { icon: DatabaseBackup, title: 'نسخ احتياطي', desc: 'نسخ واستعادة قاعدة البيانات من داخل لوحة التحكم' },
                            { icon: Globe, title: 'متجر وصفحات عامة', desc: 'صفحات هبوط للمنتجات وصفحات تعريفية وسلايدر وعروض' },
                        ].map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <Icon size={22} className="mb-3 text-indigo-500" />
                                <h3 className="mb-1 text-sm font-black text-slate-800 dark:text-white">{title}</h3>
                                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ═══ الصلاحيات ═══ */}
                <Section id="permissions" icon={Lock} title="نظام الصلاحيات" subtitle="تحكم دقيق بما يراه كل مستخدم وما يفعله">
                    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 md:p-8">
                            <div>
                                <h3 className="mb-3 font-black text-slate-800 dark:text-white">أربعة أدوار</h3>
                                <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                                    <li className="flex items-center gap-2"><span className="rounded-lg bg-red-50 px-2 py-1 text-xs font-black text-red-600 dark:bg-red-950/50">مدير ADMIN</span> تحكم كامل بكل شيء</li>
                                    <li className="flex items-center gap-2"><span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-black text-blue-600 dark:bg-blue-950/50">مسؤول MANAGER</span> صلاحيات موسعة حسب الحاجة</li>
                                    <li className="flex items-center gap-2"><span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-600 dark:bg-emerald-950/50">موظف STAFF</span> صلاحيات محددة بدقة</li>
                                    <li className="flex items-center gap-2"><span className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-black text-violet-600 dark:bg-violet-950/50">مسوّق AFFILIATE</span> لوحة أفلييت فقط</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="mb-3 font-black text-slate-800 dark:text-white">أكثر من 60 صلاحية دقيقة</h3>
                                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                    لكل موديول أربع صلاحيات مستقلة (عرض / إضافة / تعديل / حذف): المنتجات، الطلبات، طلبات الجملة،
                                    العملاء، المندوبون، المرتجعات، الكفالة، الموظفون، التسويق، المدفوعات، المهام، التتبع،
                                    النسخ الاحتياطي وغيرها — وتُدار من شاشة واحدة وتُفرض على الواجهة والخادم معاً.
                                </p>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* ═══ التقنيات ═══ */}
                <Section id="tech" icon={Smartphone} title="البنية التقنية" subtitle="تقنيات حديثة وأداء عالٍ">
                    <div className="flex flex-wrap gap-2">
                        {[
                            'Next.js 14', 'React 18', 'TypeScript', 'Tailwind CSS', 'PostgreSQL', 'Prisma ORM',
                            'PWA (تطبيق جوال)', 'WhatsApp Cloud API', 'Resend Email', 'Vercel Blob',
                            'Recharts', 'jsPDF', 'JWT + bcrypt', 'html5-qrcode', 'الوضع الليلي', 'RTL كامل',
                        ].map((tech) => (
                            <span key={tech} className="rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
                                {tech}
                            </span>
                        ))}
                    </div>
                </Section>

            </main>

            {/* ═══ التذييل ═══ */}
            <footer className="border-t border-slate-100 bg-white py-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <img src="/skynova-dark.png" alt="SKYNOVA" className="mx-auto mb-3 h-10 object-contain dark:hidden" />
                <img src="/skynova-light.png" alt="SKYNOVA" className="mx-auto mb-3 hidden h-10 object-contain dark:block" />
                <p className="text-xs text-slate-400">نظام SKYNOVA CRM — جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
            </footer>

            {/* أنماط الطباعة */}
            <style>{`
                @media print {
                    header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    section { break-inside: avoid-page; }
                }
            `}</style>
        </div>
    );
}
