# تقرير النظام المفصّل — SKYNOVA CRM

> تقرير توثيقي مبني على الكود الفعلي للمشروع (وليس على الوصف النظري).
> تاريخ الإعداد: 2026-07-27

---

## 1. نظرة عامة

**SKYNOVA CRM** نظام إدارة علاقات عملاء وموارد مؤسسة (CRM/ERP) متكامل، مبني بـ Next.js 14 (App Router). يشمل:

- إدارة مستخدمين متعددي الأدوار مع صلاحيات دقيقة.
- دورة حياة الطلبات كاملة (تجزئة وجملة) مع تأثير فوري على المخزون.
- مخزون متعدد المستودعات عبر دولتين (تركيا وسوريا).
- أهداف مبيعات ورواتب وعمولات للموظفين.
- عملاء تجزئة وعملاء جملة (مندوبين) مع زيارات ميدانية وGPS.
- مرتجعات، كفالة، دفعات وأقساط، نقاط ولاء، مهام ومواعيد.
- منصة تسويق بالعمولة (أفلييت) كاملة مع صفحات هبوط عامة.
- حملات تسويقية عبر WhatsApp Cloud API والبريد الإلكتروني.
- باركود Code39: توليد، طباعة ملصقات، ومسح بكاميرا الجهاز.
- نسخ احتياطي واستعادة لقاعدة البيانات من داخل لوحة التحكم.

الواجهة عربية بالكامل (RTL)، والمسمّيات البرمجية إنجليزية.

---

## 2. التقنيات المستخدمة

| الطبقة | التقنية |
|---|---|
| الإطار | Next.js 14.2.35 (App Router) |
| اللغة | TypeScript 5 (وضع strict) |
| الواجهة | React 18 + Tailwind CSS 3.4 |
| قاعدة البيانات | PostgreSQL عبر Prisma 7.3 (محوّل `@prisma/adapter-pg`) |
| المصادقة | JWT (`jose`) + `bcryptjs` + كوكي HTTP-only باسم `skynova` |
| إدارة الحالة | Zustand |
| النماذج | React Hook Form + Zod |
| الرسوم البيانية | Recharts + Tremor |
| PDF/طباعة | jspdf, jspdf-autotable, html2canvas, react-to-print |
| الباركود | توليد Code39 SVG بدون مكتبات + مسح بالكاميرا عبر `html5-qrcode` |
| PWA | `@ducanh2912/next-pwa` |
| تخزين الصور | `@vercel/blob` |
| المهام المجدولة | `node-cron` (تجميد الأهداف الشهرية) |
| البريد | Resend |
| واتساب | WhatsApp Cloud API (Meta Graph) |

---

## 3. المصادقة والأدوار والصلاحيات

### 3.1 المصادقة

- تسجيل الدخول عبر `/api/users/login` — يُصدر JWT موقّعاً بـ HS256 (مدته 30 يوماً) ويخزّنه في كوكي HTTP-only باسم `skynova`.
- `middleware.ts` يوجّه غير المسجّلين من `/dashboard/*` إلى `/` والعكس (يفحص وجود الكوكي فقط؛ التحقق الحقيقي يتم داخل Server Actions وAPI Routes).
- كلمات المرور مشفّرة بـ `bcryptjs`.
- **انتحال الصلاحية (Impersonation):** الأدمن يستطيع تصفّح النظام كأي مستخدم عبر `?asUser=<id>` (يُخزَّن في `sessionStorage` بمفتاح `skynova_as_user_id`)، والإنهاء عبر `?asUser=me`.

### 3.2 الأدوار (`accountType`)

`ADMIN` (يتجاوز كل الفحوص) — `MANAGER` — `STAFF` — `AFFILIATE` (مسوّق بالعمولة).

### 3.3 مفاتيح الصلاحيات الكاملة (~60 مفتاحاً)

تُدار من صفحة `/dashboard/permissions` وتُسند لكل مستخدم عبر دور (`roleName`):

| الموديول | المفاتيح |
|---|---|
| المنتجات | `viewProducts` `addProducts` `editProducts` `deleteProducts` |
| التصنيفات | `viewCategories` `addCategories` `editCategories` `deleteCategories` |
| الطلبات | `viewOrders` `addOrders` `editOrders` `deleteOrders` |
| طلبات الجملة | `viewWholesaleOrders` `addWholesaleOrders` `editWholesaleOrders` `deleteWholesaleOrders` |
| العملاء | `viewCustomers` `addCustomers` `editCustomers` `deleteCustomers` |
| عملاء الجملة (المندوبين) | `viewWholesaleCustomers` `addWholesaleCustomers` `editWholesaleCustomers` `deleteWholesaleCustomers` |
| المرتجعات | `viewReturns` `addReturns` `editReturns` `deleteReturns` |
| الكفالة | `viewWarranty` `addWarranty` `editWarranty` `deleteWarranty` |
| الموظفون | `viewEmployees` `addEmployees` `editEmployees` `deleteEmployees` |
| التقارير | `viewReports` `addReports` `editReports` `deleteReports` |
| الصفحات (CMS) | `viewPages` `addPages` `editPages` `deletePages` |
| التسويق | `viewMarketing` `addMarketing` `editMarketing` `deleteMarketing` |
| مدفوعات العملاء | `viewCustomerPayments` `addCustomerPayments` `deleteCustomerPayments` (بلا تعديل) |
| المهام | `viewTasks` `addTasks` `editTasks` `deleteTasks` |
| الصلاحيات | `viewPermissions` `addPermissions` `editPermissions` `deletePermissions` |
| التحليلات | `viewAnalytics` (عرض فقط) |
| نقاط الولاء | `viewLoyalty` `editLoyalty` |
| الإشعارات | `viewNotifications` |
| تتبع الشحنات | `viewTracking` `editTracking` |
| النسخ الاحتياطي | `viewBackups` `manageBackups` |

ملاحظة تطبيقية: صفحة مرتجعات المندوبين (`/dashboard/rep-returns`) تمنح العرض لمن يملك `viewOrders` أو `viewWholesaleCustomers` أو `viewReturns`، والإنشاء لمن يملك `addReturns` أو `viewWholesaleCustomers` — أي أن صلاحية عرض المندوبين تمنح إذن إنشاء مرتجع.

---

## 4. دليل الصفحات

### 4.1 لوحة التحكم (كلها تحت `/dashboard` ومحمية بالجلسة)

**الرئيسية**
| الصفحة | المسار | الوظيفة |
|---|---|---|
| لوحة التحكم | `/dashboard` | ملخص نشاط الموظف، تتبّع أهداف المبيعات (إنشاء/تعديل للأدمن)، ولوحة أفلييت للمسوّقين |
| التحليلات | `/dashboard/analytics` | رسوم بيانية شاملة (مبيعات حسب الحالة/المدينة/الزمن، أفضل المنتجات، مخزون منخفض، تقارير موظفين، مناطق الجملة) مع تصدير PDF |

**المخزون والمنتجات**
| الصفحة | المسار | الوظيفة |
|---|---|---|
| الأقسام | `/dashboard/categories` | إدارة فئات المنتجات مع صورة وخيار الإظهار في المتجر |
| المستودعات والدول | `/dashboard/inventories` | إدارة المستودعات/الدول/المدن وحركات المخزون (توريد/صرف/تحويل/جرد) مع مسح باركود |
| المنتجات | `/dashboard/products` | إدارة المنتجات: صور، مخزون وسعر لكل مستودع، باركود، SEO، أسعار أفلييت، صفحة هبوط، تصدير Excel |
| ملصقات الباركود | `/dashboard/barcode-labels` | طباعة/تنزيل ملصقات Code39 بمقاسين (50×30 و70×40 مم) — غير مدرجة في القائمة الجانبية |

**المبيعات والطلبات**
| الصفحة | المسار | الوظيفة |
|---|---|---|
| الطلبات | `/dashboard/orders` | إدارة الطلبات كاملة: بطاقات حالات، استيراد/تصدير Excel، PDF ومشاركة واتساب، تعيين شركة شحن، تحديث حالة مع تأثير فوري على المخزون |
| طلبات الجملة | `/dashboard/wholesale-orders` | طلبات الجملة للمندوبين: بنود (منتج/كمية/سعر/خصم)، حالات، تصدير Excel/PDF |
| الكفالة | `/dashboard/warranty` | سجلات كفالة بثلاثة أنواع (تبديل/صيانة/تالف) مربوطة بمستودع وكمية |
| شركات الشحن | `/dashboard/shipping` | (أدمن) شركات الشحن مع ملخص طلبات ومبالغ كل شركة |
| تتبع الشحنات | `/dashboard/tracking` | تحديث رقم التتبع وحالته (6 حالات من PENDING إلى RETURNED) ورابط التتبع |

**المالية المتقدمة**
| الصفحة | المسار | الوظيفة |
|---|---|---|
| المرتجعات | `/dashboard/returns` | مرتجعات طلبات التجزئة مع سبب الإرجاع والمستودع المستقبل للمخزون |
| الفواتير المستحقة | `/dashboard/customer-payments` | دفعات العملاء (نقدي/حوالة/تقسيط/شيك) والمتأخرون بالسداد |
| كشف حساب عميل | `/dashboard/customer-payments/[id]/statement` | كشف تفصيلي: إجمالي الفواتير والمدفوع والمتبقي |
| نقاط الولاء | `/dashboard/loyalty` | قواعد النقاط (كسب/استبدال/حد أدنى) وسجل الحركات ونقاط مكافأة يدوية |

**العملاء والمندوبون**
| الصفحة | المسار | الوظيفة |
|---|---|---|
| العملاء | `/dashboard/customers` | CRM كامل: مراحل البيع، إسناد لموظفين، إنشاء طلب من بطاقة العميل، استيراد/تصدير، واتساب وبريد |
| المندوبون | `/dashboard/wholesale-customers` | عملاء الجملة: بيانات النشاط، إسناد مندوب، زيارات ومتابعات، إنشاء طلب جملة من الملف |
| المهام والمواعيد | `/dashboard/tasks` | مهام متابعة (زيارة/اتصال/توصيل/اجتماع) مع مسؤول وتاريخ استحقاق |
| مرتجعات المندوبين | `/dashboard/rep-returns` | مرتجعات طلبات الجملة بصلاحيات مفصّلة (انظر §3.3) |

**التسويق**
| الصفحة | المسار | الوظيفة |
|---|---|---|
| الحملات الإعلانية | `/dashboard/marketing/campaigns` | حملات (بريد/واتساب/SMS/محتوى) بمراحل مسودة→مكتملة، وإطلاق فعلي عبر WhatsApp Cloud API |
| تحليلات التسويق | `/dashboard/marketing/analytics` | مقاييس المُرسل/المفتوح/النقرات/التحويلات |

**الموارد البشرية**
| الصفحة | المسار | الوظيفة |
|---|---|---|
| المستخدمون | `/dashboard/users` | إدارة الموظفين: أدوار وصلاحيات، راتب وعمولة، أهداف مبيعات، إسناد مدير، تقرير PDF |
| رواتب الموظفين | `/dashboard/employee-salaries` | (أدمن) كشف رواتب شهري مع عمولات الأهداف وتعديل يدوي لشهر محدد |
| الأدوار والصلاحيات | `/dashboard/permissions` | إدارة الأدوار وتعيين صلاحيات CRUD لكل موديول |

**الإعدادات والنظام**
| الصفحة | المسار | الوظيفة |
|---|---|---|
| الإشعارات | `/dashboard/notifications` | إشعارات (مخزون منخفض، تغيّر حالة، تذكير مهمة) مع توليد تلقائي |
| الإعدادات العامة | `/dashboard/settings` | (أدمن) الموقع والعملة وسعر الصرف والشعار، مفاتيح Resend وواتساب، وإدارة النسخ الاحتياطي |
| التعليقات | `/dashboard/comments` | (أدمن) تقييمات المنتجات وحذفها |
| سلايدر الرئيسية | `/dashboard/hero-slides` | (أدمن) شرائح سلايدر المتجر |
| العروض | `/dashboard/offers` | (أدمن) عروض بعدّاد تنازلي وتاريخ بداية/نهاية |
| خصومات العروض | `/dashboard/offer-discounts` | (أدمن) خصم نسبة/مبلغ على منتج/فئة/مستودع |
| الصفحات | `/dashboard/pages` | صفحات CMS ثابتة بمحتوى غني وSEO تُعرض عبر `/[slug]` |
| سفراء skynova | `/dashboard/affiliate` | (أدمن) روابط أفلييت ونِسَب عمولة وحالات العمولات |
| مستخدمو الأفلييت | `/dashboard/affiliate/users` | (أدمن) إنشاء حسابات مسوّقين والموافقة عليها وتحويل العمولات للمحافظ |
| تحويلات المحفظة | `/dashboard/affiliate/wallet-transfers` | (أدمن) تحويلات مالية لمحافظ المسوّقين بحالات |

### 4.2 الصفحات العامة (بدون تسجيل دخول)

| المسار | الوظيفة |
|---|---|
| `/` | تسجيل الدخول |
| `/[slug]` | عرض صفحات CMS المنشورة (SSG مع SEO) |
| `/product/[slug]` | صفحة هبوط عامة للمنتج تدعم `?ref=` لتتبع الأفلييت |
| `/ref/[code]` | رابط إحالة أفلييت يعرض صفحة المنتج مع كود التتبع |
| `/ad/[id]` | صفحة هبوط إعلانية مع تتبع زيارات (`AdPageVisit`) |

---

## 5. قاعدة البيانات

**49 موديلاً** و~15 enum في `prisma/schema.prisma`:

- **المستخدمون والأهداف:** `User` (علاقة مدير/مرؤوسين ذاتية)، `Permission`، `UserTarget`، `TargetProduct`، `UserActivityTarget` (أهداف نشاط بمكافآت وجزاءات)، `EmployeeSalaryAdjustment`.
- **المنتجات والمخزون:** `Category`، `Product`، `ProductImage`، `ProductStock` (رصيد منتج×مستودع فريد مع سعر وخصم)، `StockMovement` (IN/OUT/RETURN)، `Warehouse`، `Country`، `City`، `ProductWholesalePriceTier` (شرائح أسعار جملة حسب الكمية)، `ProductLandingPage`، `AdPageVisit`، `Review`.
- **التجزئة:** `Customer` (نقاط ولاء)، `Order`، `OrderItem` (يحمل `affiliateLinkId`)، `OrderReturn`، `OrderReturnItem`، `CustomerPayment`، `shipping`، `TrakingCompany`، `Message`، `Warranty`.
- **الجملة:** `WholesaleCustomer` (حالة زيارات وGPS)، `WholesaleVisit` (نتيجة/صور/صوت/GPS)، `WholesaleOrder`، `WholesaleOrderItem`، `WholesaleOrderReturn`، `WholesaleOrderReturnItem`.
- **الأفلييت والتسويق:** `AffiliateLink` (عدّادات نقرات/تحويلات)، `Commission`، `AffiliateWalletTransfer`، `Page`، `HeroSlide`، `Offer`، `OfferDiscount`، `Campaign`، `GeneralSetting` (عملات وصناديق نقد بثلاث عملات ومفاتيح API).
- **أخرى:** `LoyaltyRule`، `LoyaltyTransaction`، `Notification`، `Task` (مع GPS)، `BackupLog`، `Expense` (يقرأ حالياً في التحليلات فقط — لا صفحة إدارة له).

**آلية المخزون المركزية:** الدالة `applyOrderStockChange` في `server/order.ts` — حالات البيع/التسليم تنقص المخزون، والإلغاء/الإرجاع يعيده، مع تسجيل `StockMovement` لكل حركة. الكفالة والمرتجعات والنقل بين المستودعات تعمل بنفس المنطق داخل معاملات (`$transaction`).

---

## 6. طبقة السيرفر

### 6.1 Server Actions — 32 ملفاً في `server/`

أبرزها:

| الملف | الوظيفة |
|---|---|
| `user.ts` (~1400 سطر) | المصادقة وإدارة المستخدمين والأهداف وإسناد المديرين |
| `order.ts` | منطق الطلبات وتعديل المخزون المركزي |
| `analytics.ts` (~2200 سطر) | كل تقارير التحليلات (مبيعات، منتجات، موظفون، أهداف) |
| `affiliate.ts` (~1200 سطر) | لوحتا الأدمن والمسوّق، العمولات، المحفظة والتحويلات |
| `wholesale-order.ts` / `wholesale-customer.ts` | طلبات الجملة وعملاؤها والزيارات الميدانية |
| `rep-return.ts` / `return.ts` | مرتجعات الجملة ومرتجعات التجزئة |
| `warranty.ts` | الكفالة مع خصم/إرجاع مخزون وطلب استبدال مرتبط |
| `marketing.ts` + `email.ts` | الحملات وإرسال البريد عبر Resend مع تتبع الفتح/النقر |
| `loyalty.ts` | نقاط الولاء (كسب تلقائي من الطلبات، استبدال، مكافآت، انتهاء) |
| `notification.ts` | الإشعارات ومولّداتها التلقائية |
| `task.ts` / `tracking.ts` | المهام (مع GPS) وتتبع الشحنات |
| `customer-payment.ts` | الدفعات وكشوف الحساب والمدينون |
| `backup.ts` | نسخ احتياطي/استعادة عبر `pg_dump` |
| `general-settings.ts` | الإعدادات العامة (عملات، واتساب، بريد) |
| `image.ts` | رفع الصور عبر Vercel Blob |
| `move.ts` | نقل المخزون بين المستودعات بمعاملة واحدة |
| `employee-salaries.ts` | تعديلات الرواتب الشهرية |

(إضافة إلى: `product.ts`, `category.ts`, `warehouse.ts`, `country.ts`, `city.ts`, `shipping.ts`, `offer.ts`, `page.ts`, `hero-slide.ts`, `review.ts`, `customer.ts`)

### 6.2 API Routes — 15 مساراً في `app/api/`

- **المصادقة:** `users/login`، `users/logout`، `users/get` (يرفض حسابات أفلييت غير المعتمدة)، `users/profile`، `users`، `users/impersonate/[id]`.
- **الصلاحيات:** `permissions`، `permissions/[id]`.
- **التتبع العام:** `ad/track` (زيارات الإعلانات)، `affiliate/track` (نقرات الأفلييت + كوكي 30 يوماً)، `affiliate/orders` (إنشاء طلب عام من صفحة هبوط)، `marketing/track/open` (بكسل فتح البريد)، `marketing/track/click` (نقرات الحملات).
- **أخرى:** `orders/share-whatsapp` (إرسال فاتورة PDF عبر واتساب)، `settings/data-transfer` (تصدير/استيراد كامل قاعدة البيانات مرتّبة حسب العلاقات).

---

## 7. الميزات الخاصة

- **منصة الأفلييت:** روابط بصيغة `/ref/<code>` تعرض صفحة هبوط للمنتج وتزرع كوكي `affiliate-code` لمدة 30 يوماً. العمولات تتحول تلقائياً إلى مدفوعة عند تسليم الطلب، مع محفظة وتحويلات مالية واعتماد للمسوّقين.
- **حملات واتساب:** عبر WhatsApp Cloud API — قالب معتمد (مع اسم العميل كمتغير) أو نص حر (ضمن نافذة 24 ساعة من Meta). الإعدادات من `GeneralSetting` أولاً ثم متغيرات البيئة.
- **الباركود:** توليد Code39 كـ SVG خالص (`lib/barcode.ts`)، طباعة ملصقات بدقة 300 DPI، ومسح بالكاميرا (`html5-qrcode`) بدقة عالية ومسح مستمر لجمع عدة منتجات.
- **تسعير الإعلانات المتدرج:** شرائح خصم حسب الكمية (`lib/ad-pricing.ts`) تُطبَّق في صفحات الهبوط و`api/affiliate/orders`.
- **المهام المجدولة:** مهمة `node-cron` شهرية (اليوم الأول 00:00 UTC) لتجميد أهداف المبيعات النشطة.
- **النسخ الاحتياطي:** إنشاء (`pg_dump` بصيغة custom أو plain) واستعادة ورفع وحذف — محمي بصلاحيات `manageBackups`/`viewBackups`.

---

## 8. ملاحظات أمنية وتقنية (مهمة)

1. **مفتاح JWT ثابت في الكود:** `"secret"` في `lib/auth.ts` — يجب نقله إلى متغير بيئة `JWT_SECRET` قبل أي تشغيل إنتاجي حقيقي.
2. **تعارض مدة الجلسة:** التوكن مدته 30 يوماً لكن الكوكي ينتهي بعد 30 ساعة.
3. **`middleware.ts` لا يفك تشفير التوكن** — يفحص وجوده فقط؛ الحماية الفعلية في Server Actions (وهي مطبّقة فعلاً عبر `getCurrentSessionUser` + فحوص صلاحيات).
4. **ملفات النسخ الاحتياطي تُخزَّن تحت `public/uploads/backups`** — أي قابلة للتحميل عبر رابط مباشر؛ يُنصح بنقلها خارج `public/`.
5. **صلاحية عرض تمنح إذن إنشاء:** في مرتجعات المندوبين، `viewWholesaleCustomers` تكفي لإنشاء مرتجع (في الصفحة والسيرفر معاً).
6. **صفحة المصاريف فارغة:** موديل `Expense` موجود ويظهر في التحليلات، لكن لا توجد صفحة CRUD له (`app/dashboard/expenses/` بلا `page.tsx`).
7. لا توجد حزمة اختبارات معدّة في المشروع؛ الفحص المتاح هو `npm run lint` و`tsc --noEmit`.

---

## 9. أوامر التشغيل

```bash
npm install          # تثبيت الحزم
npm run dev          # تشغيل التطوير (المنفذ 4000)
npm run build        # بناء الإنتاج
npm run start        # تشغيل الإنتاج
npm run lint         # فحص ESLint
npx prisma generate  # توليد عميل Prisma (إلى generated/prisma)
npx prisma migrate deploy  # تطبيق الهجرات
```

الاتصال بقاعدة البيانات عبر `DATABASE_URL` في `.env`، وملف `prisma.config.ts` للصيغة الجديدة من إعدادات Prisma.

---

*انتهى التقرير — أُعدّ آلياً من تحليل الكود المصدري الفعلي للمشروع.*
