# SKYNOVA CRM — Agent Guide

> This file is intended for AI coding agents. It describes the project architecture, conventions, and critical details you need before modifying code.

---

## Project Overview

**SKYNOVA CRM** is a full-stack CRM / e-commerce web application built with Next.js 14 (App Router). The current scope is intentionally reduced to: **Categories, Products, Orders, Customers, Settings**, plus the **e-commerce / affiliate platform** (landing pages, offers, hero slides, reviews, affiliate links & commissions). User & permission management is kept for login/access control.

Removed modules (do not reintroduce unless asked): warehouses/inventory/stock movements, shipping companies & tracking, loyalty points, expenses, employee salaries, customer payments, marketing campaigns, WhatsApp Cloud API, email sending, tasks, notifications, warranty, returns, wholesale (customers & orders), countries/cities management, analytics, backups, cron jobs.

The UI is primarily **Arabic** and rendered **RTL** (`dir="rtl"`). Most user-facing labels, toast messages, and inline comments are in Arabic. Code identifiers (variables, functions, filenames) remain in English.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14.2.35 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI Library | React 18 |
| Styling | Tailwind CSS 3.4.1 |
| Database | PostgreSQL |
| ORM | Prisma 7.3.0 (custom output: `generated/prisma`) |
| Auth | JWT (`jose`) + `bcryptjs` + HTTP-only cookie (`skynova`) |
| State Management | Zustand (minimal stores) |
| Forms | React Hook Form + Zod |
| Charts | Recharts + Tremor |
| PDF/Print | `jspdf`, `jspdf-autotable`, `html2canvas`, `react-to-print` |
| Barcode | Code39 SVG (`lib/barcode.ts`, `components/ui/barcode.tsx`), camera scanning via `html5-qrcode` (`components/ui/barcode-scanner.tsx`), label printing at `/dashboard/barcode-labels` |
| PWA | `@ducanh2912/next-pwa` |
| Image Storage | `@vercel/blob` |

---

## Project Structure

```
app/                    # Next.js App Router
  api/                  # API routes (login, users, permissions, settings, affiliate orders/track)
  ad/                   # Public ad landing pages
  ref/                  # Public affiliate referral pages
  product/              # Public product pages
  [slug]/               # Public CMS pages
  dashboard/            # Protected dashboard pages
    layout.tsx          # Dashboard shell (Sidebar + Navbar, RTL, ThemeProvider)
    page.tsx            # Main dashboard (simple counters)
    barcode-labels/
    categories/
    comments/
    customers/
    customers-complated/
    hero-slides/
    offer-discounts/
    offers/
    orders/
    pages/
    products/
    settings/
    affiliate/
  layout.tsx            # Root layout (fonts, AuthProvider, Toaster)
  page.tsx              # Login page (redirects to /dashboard if session exists)
  manifest.ts           # PWA manifest

server/                 # Server Actions (`'use server'`)
  user.ts               # Auth, user CRUD (getalluser getMe login logout createuser updateuser deleteuser)
  order.ts              # Order CRUD, affiliate attribution/commissions
  customer.ts
  product.ts            # Product queries, toggles, landing page, affiliate links, deleteProduct
  category.ts
  image.ts              # Product create/update with file uploads (price, affiliate fields, variants)
  general-settings.ts
  offer.ts
  page.ts
  hero-slide.ts
  affiliate.ts
  variants.ts           # Colors & Sizes CRUD, product variants (color/size + price)

components/             # React components
  pages/                # Page-specific sections (customers, affiliate, ...)
  shared/               # Reusable cross-page components (DataTable, DynamicForm, etc.)
  system/               # Toaster providers
  ui/                   # Low-level UI primitives (Button, Modal, Inputs, Cards)
  navbar.tsx
  sidebar.tsx

orders/                 # Order domain components & hooks
  OrderTable.tsx
  SearchAndFilter.tsx
  StatusCards.tsx
  ViewOrder.tsx
  ViewOrderCustomer.tsx
  orderHelpers.ts
  orderPdf.ts
  useOrderData.ts
  useOrderExport.ts
  useOrderFilters.ts
  useOrderForm.ts

lib/                    # Utilities & configuration
  auth.ts               # JWT encrypt/decrypt (uses hardcoded secret key)
  prisma.ts             # PrismaClient with pg adapter
  utils.ts              # cn() (Tailwind merge), permission helpers, phone formatter
  type.ts               # Shared TypeScript interfaces (User, Permission, NavItem)
  themeProvider.tsx     # Re-exports next-themes provider
  currency.ts           # Site currency settings hook/helpers
  affiliate.ts          # Affiliate/ad URL builders
  ad-pricing.ts         # Quantity discount pricing helpers
  barcode.ts

context/
  AuthContext.tsx       # React context: auth state, impersonation, refreshUser

store/
  customer.ts           # Zustand store for order cash/grand-total state

prisma/
  schema.prisma         # Full schema (see models below)
  migrations/           # Prisma migrations
```

---

## Build & Development Commands

```bash
# Install dependencies
npm install

# Dev server (runs on port 4000)
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

> **Note:** There is no test suite configured in this project. `npm run lint` maps to `next lint`.

---

## Database & Migrations

The project uses **PostgreSQL** via Prisma with the `@prisma/adapter-pg` adapter. The Prisma client is generated to `generated/prisma/`.

```bash
# Generate Prisma client
npx prisma generate

# Create a migration
npx prisma migrate dev --create-only

# Deploy migrations
npx prisma migrate deploy
```

Connection is configured via `DATABASE_URL` in `.env`. A `prisma.config.ts` file is also present for Prisma's new configuration format.

**Models (current):** `User`, `Permission`, `Category`, `Product` (has a direct `price` column), `Color`, `Size`, `ProductVariant`, `ProductImage`, `Customer`, `Order`, `OrderItem`, `GeneralSetting`, plus e-commerce models: `Page`, `HeroSlide`, `Review`, `ProductLandingPage`, `AdPageVisit`, `Offer`, `OfferDiscount`, `AffiliateLink`, `Commission`, `AffiliateWalletTransfer`.

**Enums:** `AccountType` (ADMIN/MANAGER/STAFF), `WalletTransferStatus`, `CommissionStatus`, `DiscountType`.

---

## Authentication & Authorization

- **Session:** JWT stored in an HTTP-only cookie named `skynova`. Expires in 30 days.
- **Middleware (`middleware.ts`):**
  - Redirects unauthenticated users from `/dashboard/*` to `/`.
  - Redirects authenticated users from `/` to `/dashboard`.
- **Roles:** `ADMIN`, `MANAGER`, `STAFF`.
- **Permissions:** Granular CRUD permissions per module (products, reports, orders, customers, categories, permissions, pages). Admins bypass all permission checks.
- **Impersonation:** Admins can impersonate other users via `?asUser=<id>` query param or session storage key `skynova_as_user_id`. Stop impersonation with `?asUser=me`.

### Security Considerations
- **JWT secret is hardcoded** in `lib/auth.ts` as `"secret"`. In production this should be moved to `process.env.JWT_SECRET`.
- No visible rate-limiting or CSRF token implementation.
- Passwords are hashed with `bcryptjs`.

---

## Code Style Guidelines

1. **TypeScript:** Strict mode enabled. Write types for all function inputs/outputs.
2. **Path Aliases:** Use `@/` for imports from the project root (e.g., `@/lib/prisma`, `@/components/ui/button`).
3. **Server vs Client:**
   - Default to **Server Components**.
   - Mark interactive components with `'use client'`.
   - Mark server-only data mutations with `'use server'`.
4. **Styling:** Tailwind CSS. Use `cn()` from `@/lib/utils` for conditional class merging.
5. **RTL:** Dashboard layout sets `dir="rtl"`. All forms, tables, and modals should remain RTL-aware.
6. **Language:** UI text and comments are mostly **Arabic**. Keep new user-facing text in Arabic to match the existing UX.
7. **Forms:** Use `DynamicForm` + `FormInput` / `select-form` + Zod schemas.
8. **Toast Feedback:** Use `react-hot-toast` with Arabic messages (`toast.success("...")`, `toast.error("...")`).

---

## Key Architectural Patterns

### Server Actions
Heavy business logic lives in `server/*.ts` files as async exported functions with `'use server'`. These are imported directly into Server Components or called from Client Components for mutations.

### API Routes
Lightweight API routes exist under `app/api/` for specific needs (login, logout, impersonation, user profile, affiliate order creation & tracking).

### Product Pricing
`Product.price` is the single sell price (per-warehouse stock pricing was removed with the inventory module). `Product.affiliatePrice` overrides it for affiliate/ad orders. `OrderItem.price` snapshots the unit price at order time.

### Product Variants (Colors & Sizes)
`Color` / `Size` / `ProductVariant` (`server/variants.ts`) hold per-product color/size combos, each with its own price, managed from `/dashboard/products` (`VariantsFields` in the product form). Order forms let the user pick a variant per item and choose a pricing mode: `sum` (product price + variant price), `product` (product price only), or `variant` (variant price only). The resulting unit price is snapshotted on `OrderItem.price`, and the optional `variantId` FK links the item to the variant.

### Affiliate & Commissions
Affiliate links (`AffiliateLink`) attribute orders via `applyAffiliateAttribution` in `server/order.ts`; commissions (`Commission`) are computed from `Product.affiliateCommissionRate`. Public order creation goes through `app/api/affiliate/orders/route.ts`.

---

## Deployment Notes

- The project includes PWA configuration (`next-pwa`) with service worker generation to `public/`.
- Vercel deployment is implied by the presence of `.vercel/` and `@vercel/blob` usage.

---

## Quick Checklist Before Editing

- [ ] Does the file need `'use client'` or `'use server'`?
- [ ] Are you using `@/` aliases instead of relative `../../` paths?
- [ ] Are permission checks applied for non-admin users (`hasPermission` / `isAdmin`)?
- [ ] Is user-facing text in Arabic?
- [ ] Did you verify the Prisma schema reflects any new fields?
- [ ] Did you run `npx prisma generate` after schema changes?
