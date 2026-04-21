# OWASEEL — Brand Guidelines | دليل الهوية البصرية

> **OWASEEL / أو وصل** — منصة توصيل أسطوانات الغاز في مسقط، عُمان.

---

## 1. Brand Name | الاسم التجاري

| Language | Name |
|----------|------|
| English  | **OWASEEL** |
| Arabic   | **أو وصل** |

The name "أو وصل" is a colloquial Omani Arabic phrase meaning **"it will arrive"** — a promise of reliable, on-time delivery. The English transliteration **OWASEEL** is used in all digital interfaces, domain names, and marketing materials.

---

## 2. Logo Mark | الشعار

The brand mark is a **flame icon (🔥)** representing the gas product and the energy of fast delivery.

- Primary logo: `🔥 OWASEEL` (flame + wordmark, horizontal)
- Arabic variant: `🔥 أو وصل`
- Minimum clear space: 16px on all sides
- Do not rotate, distort, or recolor the flame icon

---

## 3. Color Palette | لوحة الألوان

| Role | Name | Hex | OKLCH |
|------|------|-----|-------|
| **Primary** | Gas Orange | `#F57C00` | `oklch(0.71 0.18 54)` |
| **Background** | Deep Black | `#161616` | `oklch(0.09 0 0)` |
| **Surface** | Dark Card | `#1F1F1F` | `oklch(0.13 0 0)` |
| **Text Primary** | White | `#FFFFFF` | `oklch(1 0 0)` |
| **Text Secondary** | Muted White | `rgba(255,255,255,0.5)` | — |
| **Success** | Emerald | — | `oklch(0.65 0.18 145)` |
| **Danger** | Red | — | `oklch(0.58 0.24 27)` |

### Usage Rules

- The **Gas Orange** (`#F57C00`) is the primary action color: CTA buttons, active states, brand wordmark accents, icon highlights.
- All page backgrounds must use **Deep Black** (`oklch(0.09 0 0)`) or a dark gradient derived from it.
- Never use light backgrounds on provider or admin screens — the app is **dark-theme only**.
- Avoid pure white backgrounds; use `oklch(0.13 0 0)` for card surfaces.

---

## 4. Typography | الخطوط

| Purpose | Font | Weight | Notes |
|---------|------|--------|-------|
| Arabic body & headings | **Cairo** | 400, 600, 700, 900 | Google Fonts CDN |
| Latin / numbers | **Inter** | 400, 600, 700 | Google Fonts CDN |

### Rules

- All UI text must be in **Arabic** (RTL) by default.
- Latin characters (OWASEEL wordmark, order IDs, prices) use Inter.
- Minimum body font size: **14px** (0.875rem).
- Minimum touch-target label size: **16px** (1rem).
- Font weight hierarchy: headings → 900/700, labels → 600, body → 400.

---

## 5. Iconography | الأيقونات

- Icon library: **Lucide React** (`lucide-react`)
- Icon size: **20px (w-5 h-5)** for inline icons, **24px (w-6 h-6)** for standalone
- Icon color: `text-orange-400` for primary actions, `text-white/50` for secondary
- Flame icon (`<Flame />`) is the brand icon — always rendered in orange

---

## 6. Spacing & Radius | المسافات والزوايا

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `1rem` (16px) | Default card radius |
| Card radius | `1.5rem` (24px) | Large cards, modals |
| Button radius | `9999px` | Pill-shaped CTA buttons |
| Touch target | `≥ 48px` | All interactive elements |
| Page padding | `20px` (px-5) | Mobile horizontal padding |
| Section gap | `16px` (gap-4) | Between cards/sections |

---

## 7. Component Patterns | أنماط المكونات

### CTA Button (Primary)
```
background: #F57C00 (oklch(0.71 0.18 54))
text: white, font-bold, text-lg
height: 56–64px
border-radius: 9999px
width: 100% (full-width on mobile)
```

### Card Surface
```
background: oklch(0.13 0 0)
border: 1px solid rgba(255,255,255,0.07)
border-radius: 1.5rem
padding: 16–20px
```

### Status Badges
- Delivered / تم التوصيل → `bg-emerald-500/20 text-emerald-300`
- Pending / قيد الانتظار → `bg-yellow-500/20 text-yellow-300`
- Cancelled / ملغي → `bg-red-500/20 text-red-300`
- Out for Delivery / جارٍ التوصيل → `bg-violet-500/20 text-violet-300`

---

## 8. Voice & Tone | الأسلوب والنبرة

| Principle | Description |
|-----------|-------------|
| **Reassuring** | The app promises delivery — use confident, positive language |
| **Concise** | Mobile-first: short labels, no filler text |
| **Local** | Omani Arabic dialect where natural (e.g., "أو وصل" not "سيتم التوصيل") |
| **Action-oriented** | CTAs use imperative verbs: "اطلب الآن", "تتبع طلبك", "قبول" |
| **Trustworthy** | Avoid hype; use factual trust signals (price, ETA, guarantee) |

### Sample Copy

| Context | Arabic | English (reference) |
|---------|--------|---------------------|
| Main CTA | 🔥 اطلب الغاز الآن | Order Gas Now |
| Price strip | ٣٫٣٠٠ ريال عُماني | 3.300 OMR |
| Trust badge | توصيل مضمون أو استرداد | Guaranteed or refund |
| ETA badge | خلال ٣٠ دقيقة | Within 30 minutes |
| Provider online | متاح الآن | Available now |
| Provider offline | غير متاح | Unavailable |

---

## 9. Routes & Entry Points | المسارات

| URL | Purpose |
|-----|---------|
| `/` | Customer home (main entry) |
| `/gas` | WhatsApp shareable alias → same as `/` |
| `/order/location` | Location picker |
| `/order/summary` | Order summary |
| `/payment` | Payment selection |
| `/order/:id/placed` | Order confirmation |
| `/order/:id/tracking` | Live tracking |
| `/provider/:id/login` | Provider PIN login |
| `/provider/:id` | Provider dashboard |
| `/provider/register` | Provider registration |
| `/admin` | Admin order panel |
| `/admin/providers` | Admin provider review |

---

## 10. Brand Don'ts | محظورات الهوية

- ❌ Do not use light/white backgrounds on provider or admin screens
- ❌ Do not use the old name "توصيل غاز مسقط" anywhere in the UI
- ❌ Do not use blue as a primary color (reserved for system/auth elements only)
- ❌ Do not display prices other than **3.300 OMR** (fixed price)
- ❌ Do not use the Nominatim/OpenStreetMap geocoder (use Google Maps via Manus proxy)
- ❌ Do not hardcode port numbers in server code
- ❌ Do not store file bytes in the database (use S3 storage)

---

*Document version: 1.0 — April 2026*
*Maintained by the OWASEEL development team.*
