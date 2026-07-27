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
                                'مستودعات متعددة عبر دولتين (تركيا وسوريا)',
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
