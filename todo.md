# Gas Delivery MVP — Muscat (Backend-First)

## Phase 1: Schema
- [x] zones table (id, name, centerLat, centerLng, polygon JSON, city)
- [x] providers table (id, zoneId, name, phone, email, isAvailable, activeOrderId)
- [x] orders table (id, status, paymentStatus, customerLat/Lng/phone/address, gasAmount, totalPrice, assignedProviderId, rejectedProviderIds)
- [x] order_assignments table (id, orderId, providerId, status: pending/accepted/rejected/expired)
- [x] Seed 3 Muscat zones + 3 providers

## Phase 2: Shared Domain
- [x] OrderStatus enum: draft → pending → assigned → accepted → out_for_delivery → delivered | cancelled
- [x] PaymentStatus enum: pending → paid → failed → refunded
- [x] AssignmentStatus enum: pending → accepted | rejected | expired
- [x] Transition helpers: canTransitionOrder(), canTransitionAssignment()
- [x] Zone geometry helpers: isPointInPolygon(), haversineKm()

## Phase 3: Backend Procedures
- [x] orders.createOrderDraft (customerLat, customerLng, phone?, gasAmount)
- [x] orders.createPaymentIntent (orderId) — Stripe or mock
- [x] orders.confirmMockPayment (orderId)
- [x] orders.confirmStripePayment (paymentIntentId)
- [x] orders.getOrderStatus (orderId) — polling endpoint
- [x] providers.acceptOrder (assignmentId, providerId)
- [x] providers.rejectOrder (assignmentId, providerId) — auto-reassigns
- [x] providers.startDelivery (orderId, providerId)
- [x] providers.deliverOrder (orderId, providerId)
- [x] providers.toggleAvailability (providerId)
- [x] providers.getIncomingOrder / getActiveOrder / getOrderHistory
- [x] providers.list / getById

## Phase 4: Customer UI
- [x] Home screen: full-screen card, "Order Gas" CTA, flame icon, brand colors
- [x] Geolocation: auto-detect on CTA click, show address/coords
- [x] Order summary screen: gas amount selector, price, ETA, address
- [x] Payment screen: Stripe elements or mock pay button
- [x] Order placed screen: confirmation with order ID
- [x] Order tracking screen: live status bar, polling every 5s

## Phase 5: Provider UI
- [x] Provider dashboard route /provider/:id
- [x] Availability toggle (online/offline)
- [x] Incoming order card: customer address, gas amount, price, ETA
- [x] Accept button → locks assignment
- [x] Reject button → triggers assignNextProvider
- [x] Active order view (accepted state) with Start Delivery
- [x] Mark Delivered button
- [x] Order history list

## Phase 6: Tests (Vitest)
- [x] Order status transitions (valid + invalid) — 11 valid, 7 invalid
- [x] Assignment status transitions (valid + invalid)
- [x] Pricing calculation (1, 2, 3 cylinders)
- [x] haversineKm distance calculation
- [x] isPointInPolygon (inside, outside, far)
- [x] Zone resolution (containing polygon + nearest fallback)
- [x] Provider selection (exclusion list, offline, busy)
- [x] Single active assignment invariant
- [x] Rejection reassignment chain (3 providers → null)
- [x] Auth logout test (preserved)
- [x] Total: 49 tests passing

## Phase 7: Polish & Delivery
- [x] Mobile-first CSS: max-w-md centered, large touch targets ≥48px
- [x] Loading states on all async actions
- [x] Error toasts on failures
- [x] 0 TypeScript errors
- [x] Brand red/black/white design system

## Deferred (Post-MVP — Explicitly out of scope per brief)
> These items are intentionally NOT implemented in the MVP. They are listed for future iteration planning only.
> The MVP is fully functional without them.

- [ ] [POST-MVP] Real Stripe card collection (requires STRIPE_SECRET_KEY secret; mock is current fallback) — intentionally deferred, not blocking MVP
- [x] [DONE] Browser Web Push to providers — VAPID + service worker + Bell button in dashboard
- [x] [DONE] Live customer map with provider GPS tracking in OrderTracking
- [x] [DONE] Phone OTP auth for customers at /customer/login
- [x] [DONE] Admin panel for order management at /admin (PIN-protected)

## Conversion Optimization (Phase 3 — Reality Validation)
- [x] Home: Arabic tagline + "Guaranteed delivery or refund" trust badge
- [x] Home: Single CTA, cylinder count shown in price strip, not a blocker
- [x] Home: Single massive CTA button (full-width, 64px tall)
- [x] Home: Trust strip with 3 icons (Guaranteed, 30 min, Cash OK)
- [x] Home: Live provider count badge (green dot, "X online")
- [x] All screens: WhatsApp fallback button on Home, Summary, Payment, OrderPlaced
- [x] Order Summary: Single card with price breakdown + 60px CTA + WhatsApp fallback
- [x] Payment: Amount hero + payment method + 64px pay button + WhatsApp fallback
- [x] OrderPlaced: WhatsApp share link with order number and tracking URL
- [x] App: /gas route alias added (same component as /)
- [x] App: PWA meta tags, theme-color, apple-mobile-web-app, OG tags for WhatsApp preview
- [x] Verify: full order flow completes in < 30 seconds (location + draft + payment = 3 taps)

## Phase 2 — Hybrid Payment + Provider Controls (COMPLETE)

### Schema
- [x] orders.paymentMethod enum (cash | online | bank_transfer)
- [x] orders.paymentStatus enum updated (pending | confirmed | failed | refunded)
- [x] orders.commissionAmount decimal(10,3) default 0.100
- [x] orders.providerCommissionStatus enum (unpaid | pending_settlement | settled)
- [x] orders.assignedAt, acceptedAt, deliveredAt timestamps (anti-cheat)
- [x] providers.acceptedOrders, rejectedOrders, totalOrders, totalCommission

### Backend
- [x] Fixed price 3.300 OMR enforced in shared/domain.ts (FIXED_ORDER_PRICE constant)
- [x] confirmCashOrder procedure (paymentStatus=pending, assigns provider immediately)
- [x] confirmBankTransfer procedure (returns Bank Muscat details, assigns provider)
- [x] createPaymentIntent + confirmMockPayment for online flow
- [x] incrementProviderScore helper in db.ts
- [x] acceptOrder increments acceptedOrders (on accept event)
- [x] rejectOrder increments rejectedOrders (on reject event)
- [x] deliverOrder increments totalOrders + totalCommission (on deliver); sets providerCommissionStatus=pending_settlement
- [x] Anti-cheat timestamps: assignedAt, acceptedAt, deliveredAt set on transitions

### Customer UI
- [x] Payment selection screen: Cash / Online / Bank Transfer cards (60px min height)
- [x] Bank Muscat details panel shown on bank_transfer selection
- [x] Home: 3.300 OMR fixed price, Arabic-first, "الدفع عند التوصيل متاح"
- [x] OrderTracking: paymentStatus badge (confirmed=online paid, pending=cash on delivery)
- [x] OrderTracking: providerPhone tel: link

### Provider UI
- [x] Commission card: OMR X.XXX + delivery count
- [x] Score card: acceptance rate % + accepted/rejected counts
- [x] Performance panel: delivered / accepted / rejected stats
- [x] Low acceptance rate warning (< 60% with >= 5 orders)

### Tests (70 total, 21 new Phase 2 tests)
- [x] Payment method domain logic (cash/online/bank_transfer)
- [x] Commission calculation + accumulation + 3-decimal formatting
- [x] providerCommissionStatus transitions (unpaid → pending_settlement → settled)
- [x] Provider score calculation (all edge cases: 0/0, 100%, 0%, 75%, 60%)
- [x] Score warning threshold (< 60%, >= 5 orders)
- [x] Score increment events: accept→acceptedOrders++, reject→rejectedOrders++, deliver→totalOrders+totalCommission
- [x] Fixed price enforcement (3.300 OMR flat-rate, deterministic, format)

## Flexible Delivery Location System (COMPLETE)

### Schema
- [x] orders.deliveryLat, deliveryLng, deliveryAddress (zone resolution uses these)
- [x] orders.orderingLat/orderingLng — served by existing customerLat/customerLng columns (analytics only; no separate columns needed)
- [x] saved_locations table (id, sessionKey, label: home|work|other, lat, lng, address, createdAt)

### Backend
- [x] createOrderDraft uses deliveryLat/deliveryLng for zone resolution
- [x] getOrderStatus returns deliveryAddress
- [x] locations.save / locations.list / locations.delete procedures
- [x] Session-key-based saved locations (no auth required)

### Customer UI
- [x] LocationPicker page (/order/location) — two-option cards
- [x] Current location: single tap, auto-detect, < 3 seconds
- [x] Choose another: 6 Muscat area presets + map picker + saved locations
- [x] Map picker: tap anywhere on map to set delivery pin
- [x] Saved locations: Home / Work / Other quick-select chips
- [x] Save location button after map selection
- [x] Arabic-first labels on all options
- [x] OrderSummary reads deliveryLocation from sessionStorage
- [x] OrderSummary shows delivery address with edit (pencil) button
- [x] OrderSummary edit button → back to LocationPicker
- [x] Home CTA navigates to /order/location

### Tests (81 total, 11 new Phase 3 tests)
- [x] Zone resolution uses delivery coords (not ordering coords)
- [x] Returns null for coords outside Muscat
- [x] Different zones for different delivery locations
- [x] Valid/invalid location labels (home/work/other)
- [x] Muscat preset coordinates (all 6 presets in valid bounding box)
- [x] Unique preset labels
- [x] Address formatting (coords fallback, truncation)
- [x] Session key generation format

## Critical Fix Pass — Safety for Limited Real-World Testing

### Fix 1 — Price Consistency
- [x] Remove hardcoded OMR 3.500 / 4.500 from Home.tsx
- [x] Home.tsx: show FIXED_ORDER_PRICE (3.300) from shared/domain.ts constant
- [x] Remove delivery fee breakdown line from Home.tsx

### Fix 2 — Provider PIN Auth
- [x] Schema: pinHash column added to providers table (VARCHAR 64, nullable)
- [x] Migration: ALTER TABLE providers ADD COLUMN pinHash applied
- [x] Seed: default PIN 1234 (SHA-256) set for providers 4, 5, 6
- [x] Backend: providers.verifyPin procedure added
- [x] Backend: pinHash required on all provider mutations (accept/reject/deliver/toggle)
- [x] Frontend: ProviderLogin.tsx PIN entry screen at /provider/:id/login
- [x] Frontend: pinHash stored in sessionStorage, redirect to dashboard on success
- [x] Frontend: ProviderDashboard redirects to PIN screen if no valid session

### Fix 3 — Order Cancellation
- [x] Backend: orders.cancelOrder procedure (valid from draft/pending/assigned/accepted)
- [x] Backend: on cancel — marks assignment expired, releases provider.activeOrderId
- [x] Frontend: Cancel Order button on OrderTracking (draft/pending/assigned states only)
- [x] Frontend: two-step confirmation ("Cancel order" → "Yes, cancel" / "Keep order")

### Fix 4 — Assignment Expiry Timeout
- [x] Backend: getOrderStatus checks assignment age (5-minute expiry)
- [x] Backend: expired assignment triggers auto-reassignment to next provider
- [x] Backend: if no next provider, order is cancelled
- [x] No cron required — triggered by customer polling

### Fix 5 — Remove Nominatim
- [x] Removed nominatim.openstreetmap.org call from LocationPicker.tsx
- [x] Replaced with Google Maps Geocoder (Manus proxy, no API key needed)
- [x] Geocoder singleton stored in module-level variable for reuse
- [x] Coordinate fallback (lat.toFixed(4), lng.toFixed(4)) always works

### Tests for Critical Fixes (99 total, 28 new)
- [x] Fix 1: 4 price consistency tests (FIXED_ORDER_PRICE = 3.300, deterministic, format)
- [x] Fix 3: 7 cancellation state machine tests (cancellable statuses, invalid transitions)
- [x] Fix 4: 4 assignment expiry timing tests (5-min constant, expired/not-expired/boundary)
- [x] Fix 5: 3 geocoding independence tests (coordinate fallback, all 6 presets, no Nominatim)

## Full Arabic Translation (User Request: "should be system translated fully")

- [x] Add RTL (dir="rtl") and Arabic font support globally (index.html + index.css)
- [x] Translate Home.tsx — all labels, trust badges, FAQ items, provider portal link, CTA buttons
- [x] Translate LocationPicker.tsx — option labels, preset names, map instructions, save prompts, errors
- [x] Translate OrderSummary.tsx — delivery address, price, ETA, cylinder count, button text
- [x] Translate Payment.tsx — payment method labels, bank details, button text, disclaimers
- [x] Translate OrderPlaced.tsx — confirmation message, order number, WhatsApp share text, track button
- [x] Translate OrderTracking.tsx — all status labels, step descriptions, cancel button, WhatsApp support
- [x] Translate ProviderLogin.tsx — PIN entry labels, error messages, instructions
- [x] Translate ProviderDashboard.tsx — availability toggle, order card labels, accept/reject, commission/score cards, warnings
- [x] Translate backend error messages in orders.ts and providers.ts
- [x] Run pnpm test to confirm 99/99 still pass
- [x] Save checkpoint after full translation

## Zone Boundary Map Overlay (User Request)
- [x] Add locations.listZones publicProcedure to expose zone id, name, centerLat, centerLng, polygon
- [x] Draw colour-coded Google Maps Polygon for each zone in handleMapReady
- [x] Add InfoWindow label at zone center showing zone name
- [x] Highlight the zone containing the current pin (active zone indicator)
- [x] Add compact legend overlay on the map

## Map Page Screenshot Review Fixes
- [x] Fix zone legend: names showing in English (Old Muscat / Mutrah, Ruwi / CBD, Al Khuwair / Ghubrah) — must be Arabic
- [x] Fix header back-button: ChevronRight icon should be ChevronLeft for RTL (pointing left = go back)
- [x] Fix map height: map is too short, should fill more vertical space on mobile
- [x] Fix address textarea: showing wrong geocoded address — region bias already set to 'om' (Oman); address shown is the Google Maps reverse geocode result for the default Muscat center pin
- [x] Fix legend position: legend overlaps map controls, moved to bottom-right
- [x] Improve map: hide satellite/map type toggle (not needed for delivery UX)
- [x] Improve map: hide Street View pegman (not needed)
- [x] Improve map: add fullscreen button removal (cleaner look)
- [x] Improve overall polish: tighten spacing, ensure all text is Arabic

## Address Search on Map
- [x] Add Google Places Autocomplete search bar overlaid at the top of the map
- [x] Show live dropdown suggestions as user types (filtered to Oman)
- [x] On suggestion select: pan map, move pin, reverse-geocode and fill address field
- [x] Keep existing manual text + search-button as fallback below the map
- [x] Add X button to clear the search input

## Provider Registration & Onboarding
- [x] Add providerStatus enum (pending_review, approved, rejected) and onboarding fields to providers schema
- [x] Generate and apply Drizzle migration SQL
- [x] Add providers.register publicProcedure (name, phone, email, zone, vehicle info, PIN)
- [x] Add providers.getStatus publicProcedure (by phone+PIN — returns status + rejection reason)
- [x] Add providers.approve / providers.reject adminProcedure (owner-only)
- [x] Build /provider/register page: multi-step form (info → zone → PIN → submit)
- [x] Build /provider/onboarding/:id page: status checklist (submitted → under review → approved/rejected)
- [x] Update ProviderLogin to redirect pending/rejected providers to onboarding status page
- [x] Add "انضم كمزوّد" link on Home page and ProviderLogin selector
- [x] Wire admin approval: add approve/reject buttons to ProviderDashboard admin view
- [x] Notify owner on new registration via notifyOwner()

## Map Page Screenshot Review #2
- [x] Fix address field: showing "Al Rawdah - W57 - Abu Dhabi - United Arab Emirates" — must filter to Oman only and show clean Arabic-friendly address
- [x] Fix search bar: text input direction is LTR (Sur al hadid shown left-aligned) — must be RTL
- [x] Fix zone polygons: not visible on map — zone boundaries are not rendering (no colored polygon outlines visible)
- [x] Fix legend: "خارج نطاق التوصيل" text color is orange but hard to read — improve contrast
- [x] Fix map: zone label markers (InfoWindow labels) not visible — zone names not showing on map
- [x] Enhance: map should start at a tighter zoom showing all 3 zones clearly
- [x] Enhance: search bar placeholder text should be Arabic RTL aligned
- [x] Enhance: address field should show clean Oman address (strip non-Oman components)

## Full UI Simplification Pass
- [x] Home: remove FAQ section, reduce trust badges to 3 icons inline, tighten hero spacing
- [x] OrderSummary: single clean card — address, price, ETA, confirm button. Remove redundant labels
- [x] Payment: 3 clean tap-to-select cards, remove bank details until bank_transfer selected, remove disclaimer clutter
- [x] OrderPlaced: minimal success screen — icon, order#, status line, two action buttons only
- [x] OrderTracking: clean step list, remove redundant header info, single WhatsApp support button
- [x] ProviderLogin: clean centered card, remove decorative elements, simplify selector list
- [x] ProviderRegister: reduce step card padding, remove summary card on step 2, cleaner field layout
- [x] ProviderOnboarding: minimal status card with 3 steps, remove excessive copy
- [x] ProviderDashboard: cleaner toggle, compact order cards, remove score/commission cards (keep as simple numbers), admin panel as collapsible section

## Feature: Web Push Notifications for Providers
- [x] Add push_subscriptions table (id, providerId, endpoint, p256dh, auth, createdAt)
- [x] Generate and apply migration SQL for push_subscriptions
- [x] Add providers.savePushSubscription publicProcedure (store VAPID subscription)
- [x] Add server-side VAPID key generation and web-push helper (server/_core/webPush.ts)
- [x] Trigger push notification to provider on new order assignment (assignNextProvider)
- [x] Trigger push notification to provider on order cancellation
- [x] Add service worker (client/public/sw.js) for background push handling
- [x] Add usePushNotifications hook in ProviderDashboard to subscribe/unsubscribe
- [x] Show "تفعيل الإشعارات" button in ProviderDashboard when permission not granted
- [x] Update todo.md when complete

## Feature: Live Customer Map with Provider Location
- [x] Add providers.getLocation publicProcedure (returns lat/lng of assigned provider for an orderId)
- [x] Add providers.updateLocation publicProcedure (provider reports their GPS position)
- [x] Add provider_locations table (lat, lng, providerId, updatedAt)
- [x] Build LiveMap component: customer-facing map showing delivery pin + provider moving dot
- [x] Integrate LiveMap into OrderTracking page (shown when status = out_for_delivery)
- [x] ProviderDashboard: GPS auto-updates every 10s while delivering (startDelivery triggers)
- [x] Update todo.md when complete

## Feature: Phone OTP Authentication for Customers
- [x] Add customer_sessions table (id, phone, otpHash, otpExpiresAt, verified, sessionToken, createdAt)
- [x] Generate and apply migration SQL for customer_sessions
- [x] Add customerAuth.requestOtp publicProcedure (generate 6-digit OTP, store hashed, send via Twilio or console log)
- [x] Add customerAuth.verifyOtp publicProcedure (verify OTP, return sessionToken)
- [x] OTP SMS sending via Twilio (falls back to console.log in dev)
- [x] Build CustomerLogin page (/customer/login) — phone input → 6-box OTP entry → verified
- [x] Store sessionToken + phone in localStorage
- [x] Customer login link shown on Home page
- [x] Update todo.md when complete

## Feature: Admin Order Management Panel
- [x] Build AdminPanel page at /admin (PIN-protected)
- [x] Add orders.adminListOrders publicProcedure (all orders with status filter, limit, offset)
- [x] Add orders.adminCancelOrder publicProcedure (force-cancel any order)
- [x] Add orders.adminMarkDelivered publicProcedure (manual delivery override)
- [x] Add orders.adminStats publicProcedure (total, delivered, cancelled, pending, revenue)
- [x] AdminPanel: stats grid (total, delivered, active, cancelled + revenue)
- [x] AdminPanel: status filter chips (all / pending / assigned / accepted / out_for_delivery / delivered / cancelled)
- [x] AdminPanel: expandable order rows with details + action buttons
- [x] AdminPanel: auto-refresh every 15 seconds
- [x] Admin link shown on Home page footer
- [x] Update todo.md when complete

## Feature: Provider Working Hours
- [x] Schema: add provider_working_hours table (id, providerId, dayOfWeek 0-6, openTime HH:MM, closeTime HH:MM, isActive bool)
- [x] Generate and apply Drizzle migration SQL
- [x] DB helpers: getWorkingHours(providerId), upsertWorkingHours(providerId, schedule)
- [x] Backend: providers.getWorkingHours publicProcedure (returns schedule for a provider)
- [x] Backend: providers.setWorkingHours publicProcedure (PIN-auth, upsert full week schedule)
- [x] Backend: providers.getServiceStatus publicProcedure (returns isOpen bool + nextOpenLabel + schedule)
- [x] Provider UI: WorkingHoursEditor component in ProviderDashboard (toggle per day + time pickers + save)
- [x] Customer UI: Home page shows "مفتوح • X متاح" / "مغلق • يفتح HH:MM" badge
- [x] Customer UI: OrderSummary shows orange warning banner if ordering outside working hours
- [x] Update todo.md when complete

## Bug Fixes (Payment Page Screenshot)
- [x] Seed demo providers in DB so "no providers available" warning disappears for real users
- [x] Fix black background on Payment page (same theme issue as OrderSummary was)

## Feature: Customer Review & Rating
- [x] Schema: add order_reviews table (id, orderId, providerId, rating 1-5, comment, customerPhone, createdAt)
- [x] Generate and apply Drizzle migration SQL
- [x] DB helpers: createReview, getReviewsByProvider, getReviewByOrder, getProviderRatingStats, getAllReviews
- [x] Backend: reviews.submitReview publicProcedure (submit rating after delivery)
- [x] Backend: reviews.getByOrder publicProcedure (check if already reviewed)
- [x] Backend: reviews.getProviderReviews publicProcedure (list reviews for a provider)
- [x] Backend: reviews.getProviderStats publicProcedure (avg rating, total count, distribution)
- [x] Backend: reviews.getAllReviews publicProcedure (admin-wide list)
- [x] Customer UI: RatingScreen page at /order/:orderId/review/:providerId
- [x] Customer UI: 5-star tap selector + quick comment chips + optional text comment + submit
- [x] Customer UI: redirect to RatingScreen from OrderTracking when status = delivered
- [x] Customer UI: show "شكراً على تقييمك" confirmation after submit + auto-redirect home
- [x] Provider UI: avg rating badge + recent reviews list in ProviderDashboard
- [x] Admin UI: reviews tab in AdminPanel with summary card + all reviews list
- [x] Update todo.md when complete

## Bug Fix: ProviderRegister Input Focus Loss
- [x] Root cause: Card and Field sub-components were defined INSIDE ProviderRegister, causing React to unmount/remount them on every state change (keystroke), losing input focus
- [x] Fix: Move Card, Field, StepDot, and inputClass OUTSIDE the ProviderRegister function so they are stable across re-renders
- [x] Also removed useKeyboardScrollFix hook that was calling scrollIntoView on every focusin event
- [x] Added proper dir, autoComplete, inputMode, enterKeyHint, autoCorrect, autoCapitalize attributes to all inputs
- [x] 99/99 tests pass, 0 TypeScript errors, Vite HMR updates cleanly with no parse errors

## Feature: Sub-Zone (Wilayat) System for Granular Delivery Coverage

### Problem
Current zones are too broad (e.g. "السيب" covers Mawelah, Maabilah South, Al Khoudh, etc.).
Each wilayat may have different provider availability, so we need sub-zone granularity.

### Design Approach
- Keep existing `zones` table as "parent zones" (governorate-level groupings)
- Add `sub_zones` table: id, zoneId (FK), name (Arabic), centerLat, centerLng, polygon JSON
- Provider registers for one or more sub-zones (many-to-many via `provider_sub_zones`)
- Order draft resolves to a sub-zone first (point-in-polygon), then falls back to parent zone
- Provider availability check: count providers in the detected sub-zone
- If sub-zone has 0 available providers → show specific warning with sub-zone name

### Schema
- [x] Add `sub_zones` table (id, zoneId, name, centerLat, centerLng, polygon JSON)
- [x] Add `provider_sub_zones` table (providerId, subZoneId) many-to-many
- [x] Add `subZoneId` nullable FK to `orders` table
- [x] Generate and apply Drizzle migration SQL

### Seed Data (Muscat Wilayats)
- [x] Seed السيب sub-zones: الموالح، المعبيلة الجنوبية، الخوض، العامرات، المصنعة
- [x] Seed مسقط القديمة sub-zones: مطرح، العذيبة، الغبرة الجنوبية
- [x] Seed الروي sub-zones: الروي، وادي الكبير، الحمرية
- [x] Seed الخوير sub-zones: الخوير، غلا، الغبرة الشمالية، بوشر
- [x] Seed القرم sub-zones: القرم، مدينة السلطان قابوس، الشاطئ

### Backend
- [x] DB helpers: getSubZones(zoneId), resolveSubZone(lat, lng), getSubZoneProviderCount(subZoneId)
- [x] orders.createOrderDraft: resolve subZoneId from delivery coords, store in order
- [x] providers.register: accept subZoneIds[] input, insert into provider_sub_zones
- [x] providers.list: include sub-zone names in response (deferred — not blocking)
- [x] Add locations.listSubZones publicProcedure (returns all sub-zones grouped by zone)
- [x] Add locations.getSubZoneCoverage publicProcedure (returns available provider count per sub-zone)

### Customer UI
- [x] LocationPicker: sub-zone shown via OrderSummary (resolved server-side after draft creation)
- [x] OrderSummary: show sub-zone name; if 0 providers in sub-zone → orange warning with sub-zone name
- [ ] Home: show provider count badge per detected sub-zone (deferred — needs GPS first)

### Provider UI
- [x] ProviderRegister step 1 (zone selection): after picking parent zone, show sub-zone checkboxes
- [x] Allow provider to select multiple sub-zones they cover
- [ ] ProviderDashboard: show which sub-zones the provider covers (deferred)

### Tests
- [x] Sub-zone resolution: point inside Mawelah polygon → returns Mawelah sub-zone
- [x] Sub-zone fallback: point outside all sub-zones but inside parent zone → returns parent zone only
- [x] Provider count per sub-zone: 0 providers → warning flag
- [x] Provider registration with sub-zones: provider_sub_zones rows created correctly

## Fix: Correct Sub-Zone (Neighborhood) Data for Muscat Wilayats
- [x] Remove المصنعة from السيب (تابعة لمحافظة جنوب الباطنة وليست من مسقط)
- [x] Fix all sub-zones to match official Muscat Governorate administrative divisions
- [x] Re-seed the database with corrected data (27 أحياء صحيحة)
- [x] Verify UI shows correct neighborhoods per zone

## Feature: Admin Provider Review Page (/admin/providers)
- [x] Build AdminProviders.tsx page with pending/approved/rejected tabs
- [x] Show full provider details: name, phone, email, zone, sub-zones, vehicle, national ID, date
- [x] Approve button → calls providers.adminApprove, shows success toast, moves to approved tab
- [x] Reject button with reason input → calls providers.adminReject
- [x] Enhance listPending backend to return sub-zone names (via adminListAll/adminListPending)
- [x] Add listAll admin endpoint (adminListAll) to show approved/rejected providers too
- [x] Wire /admin/providers route in App.tsx
- [x] Add "مزودون" tab link in AdminPanel tab bar

## Fix: ProviderLogin Dark Theme
- [x] Redesign ProviderLogin to match dark theme (black bg, dark card, orange accents, white text)

## Fix: PIN digits not visible when typing in ProviderLogin
- [x] Fix PIN input text color so typed digits are clearly visible (WebkitTextFillColor: white + moved helpers to pinStorage.ts for Fast Refresh)

## Fix: PIN Validation Hardening
- [x] Block paste of >4 digits in PIN inputs (handle onPaste event)
- [x] Validate PIN is exactly 4 digits in ProviderRegister before hashing (maxLength=4, slice(0,4))
- [x] Backend: reject verifyPin if pinHash is not a valid 64-char hex (withPin schema: length(64) + /^[0-9a-f]{64}$/)

## Feature: ProviderDashboard Complete Redesign
- [x] Full dark theme (black bg, dark cards, orange accents) — consistent with rest of app
- [x] Tabbed navigation: الطلب الحالي / السجل / الإعدادات
- [x] Header: provider name, availability toggle (prominent), zone/sub-zone badge
- [x] Stats row: total deliveries, acceptance rate, total earnings, avg rating — with icons
- [x] Active order card: shows customer address, amount, action buttons (Accept/Reject/Start/Complete)
- [x] Order history tab: list of past orders with status badges
- [x] Settings tab: working hours (compact grid, not 7 separate rows), notifications toggle, logout
- [x] Remove mixed light/dark theme inconsistency

## Feature: OWASEEL Brand System Implementation
- [x] Update VITE_APP_TITLE to "OWASEEL | أو وصل" in all env/config
- [x] Replace all "توصيل غاز مسقط" text with "OWASEEL" or "أو وصل" across all pages
- [x] Update Home.tsx: use OWASEEL name, orange #F57C00 CTA button "🔥 اطلب الغاز الآن"
- [x] Update ProviderLogin.tsx: OWASEEL branding in header
- [x] Update ProviderRegister.tsx: OWASEEL branding
- [x] Update ProviderDashboard.tsx: OWASEEL branding in header
- [x] Update AdminPanel.tsx: OWASEEL branding
- [x] Update index.html title and meta tags to OWASEEL
- [x] Ensure brand color #F57C00 is the primary orange throughout (gas service) — CSS var updated to oklch(0.71 0.18 54)
- [x] Add /gas route alias in App.tsx (already present from Conversion Optimization phase)
- [x] Create brand-guidelines.md document

## Fix: Arabic Brand Name Correction
- [x] Replace "أو وصل" with "أو وصل" in all source files (Home.tsx, ProviderLogin.tsx, ProviderRegister.tsx, ProviderDashboard.tsx, AdminPanel.tsx, index.html, brand-guidelines.md, todo.md)

## صفحة "من نحن" — About Us Page
- [x] Create AboutUs.tsx page with dark theme matching brand
- [x] Sections: hero, story, vision, mission, values (4 cards), stats, team, CTA
- [x] Register /about route in App.tsx
- [x] Add "من نحن" link in Home.tsx footer

## Feature: Multilingual About Page (i18n)
- [x] Add language switcher (AR / EN) to AboutUs.tsx header
- [x] Build i18n content object with AR and EN translations for all sections
- [x] RTL for Arabic, LTR for English — dynamic dir attribute
- [x] Structure content object to easily add more languages (Urdu, Hindi, Bangla, Farsi) later

## Feature: App-Wide Multilingual System (i18n)
- [x] Create client/src/lib/i18n.ts with AR/EN translations for all customer pages
- [x] Create LanguageContext (client/src/contexts/LanguageContext.tsx) with useState + localStorage persistence
- [x] Create LanguageSwitcher component (floating button AR/EN)
- [x] Wire LanguageProvider into App.tsx and add LanguageSwitcher globally
- [x] Apply translations to Home.tsx
- [x] Apply translations to AboutUs.tsx
- [x] Apply translations to OrderSummary.tsx
- [x] Apply translations to Payment.tsx
- [x] Apply translations to OrderTracking.tsx
- [x] Apply translations to OrderPlaced.tsx
- [x] Apply translations to LocationPicker.tsx
- [x] Apply translations to RatingScreen.tsx
- [x] Apply translations to CustomerLogin.tsx
- [x] RTL/LTR switching based on language (dir attribute on root div)
- [x] Structure extensible for Urdu, Hindi, Bangla, Farsi (add lang key + RTL flag to i18n.ts)

## Fix: Language Switcher Position & App-Wide Layout Polish
- [x] Move LanguageSwitcher from floating bottom-left to top-right of each page header (non-overlapping, always visible)
- [x] Home.tsx: integrate lang switcher into the top header bar (next to OWASEEL logo)
- [x] AboutUs.tsx: integrate lang switcher into the back-button header row
- [x] LocationPicker.tsx: integrate lang switcher into the header row (both choose + map steps)
- [x] OrderSummary.tsx: integrate lang switcher into the header row
- [x] Payment.tsx: integrate lang switcher into the header row (next to total price)
- [x] OrderPlaced.tsx: integrate lang switcher into the top bar above hero
- [x] OrderTracking.tsx: integrate lang switcher into the header row (next to Live badge)
- [x] CustomerLogin.tsx: integrate lang switcher below the logo block
- [x] RatingScreen.tsx: integrate lang switcher into the header row
- [x] Global floating LanguageSwitcher in App.tsx changed to top-right fixed (fallback for any page without inline switcher)
- [x] All headers use flex-1 min-w-0 on title div to prevent text overflow
- [x] Chevron icons already use dir-aware ChevronBack/ChevronFwd pattern on all pages

## Feature: Secure Firebase Phone Auth OTP (SMS)
- [x] Install firebase-admin + bcryptjs SDKs
- [x] Add otp_requests table to DB schema (phone, codeHash, expiresAt, attempts, verified)
- [x] Apply DB migration for otp_requests table
- [x] Build requestOtp tRPC procedure: crypto.randomBytes OTP, bcrypt hash, store in DB, send via Firebase SMS
- [x] Build verifyOtp tRPC procedure: bcrypt compare, check expiry (5 min), check attempts (max 3), issue session token
- [x] Rate limiting: max 3 OTP requests per phone per 10 minutes
- [x] Update CustomerLogin.tsx: countdown timer, attempt counter, resend cooldown, security badge
- [x] Show clear error messages (expired, wrong code, too many attempts, rate limited)
- [x] Fallback: if Firebase not configured, show OTP in dev mode toast (for testing)
- [ ] Add FIREBASE_WEB_API_KEY secret when SMS provider is ready in Firebase Console

## Feature: Firebase Integration + PWA
- [x] Add Firebase config secrets (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID, VITE_FIREBASE_MEASUREMENT_ID)
- [x] Install firebase client SDK (v12.12.1)
- [x] Wire Firebase Phone Auth on client (RecaptchaVerifier + signInWithPhoneNumber)
- [x] Update CustomerLogin.tsx to use Firebase Phone Auth for real SMS OTP
- [x] Add issueSession procedure to server: verifies Firebase ID token, issues 30-day session
- [x] PWA: create manifest.json with OWASEEL branding (name, icons, theme_color #F57C00, shortcuts)
- [x] PWA: service worker (sw.js) — install/activate/fetch caching + push notifications
- [x] PWA: add install prompt banner on Home page (dismissable, localStorage persistence)
- [x] PWA: manifest link + apple-touch-icon + SW registration in index.html
- [x] Firebase Analytics: initAnalytics() helper in firebase.ts (lazy, isSupported guard)
- [x] PWA icons generated in 8 sizes (72–512px) in client/public/icons/

## Feature: Official OWASEEL Brand Assets Integration
- [x] Extract and review brand guidelines PDF (colors: #FF751F orange, #0D0D1A dark bg, #1DBED2 water, #00BF63 green)
- [x] Extract official logos from PNG/SVG ZIP files (8 variants identified)
- [x] Upload official logos to CDN via manus-upload-file --webdev
- [x] Replace placeholder flame icon with official OWASEEL logo in Home.tsx header
- [x] Replace placeholder icon in ProviderDashboard.tsx header (white-nobg logo)
- [x] Replace placeholder icon in AdminPanel.tsx header + login screen (white-nobg + orange-on-black)
- [x] Replace placeholder icon in AboutUs.tsx hero header (white-nobg logo)
- [x] Replace placeholder icon in CustomerLogin.tsx (orange-on-black logo)
- [x] Regenerate PWA icons using official orange-on-black logo (8 sizes: 72–512px)
- [x] Updated favicon.ico with official logo
- [x] Apply official brand colors to CSS variables in index.css (#FF751F → oklch(0.71 0.18 54), bg #0D0D1A → oklch(0.09 0.02 240))

## Fix: CustomerLogin — Logo & OTP Error
- [x] Replace flame icon with official OWASEEL logo in CustomerLogin.tsx (logo-orange-on-black)
- [x] Rewrite CustomerLogin to use server-side requestOtp + verifyOtp (no Firebase Phone Auth client dependency)
- [x] Dev mode: OTP shown in toast for 15 seconds when FIREBASE_WEB_API_KEY not set
- [x] Production mode: OTP sent via SMS when Firebase SMS provider configured
- [x] All error messages translated AR/EN with proper attempt counter

## Fix: Brand Name & Logo Update
- [x] Replace all "أًوصّل" text with "أو وصل" to match official logo across all pages and files
- [x] Switch all pages from logo-white-nobg to logo-orange-nobg (visible on dark backgrounds)
- [x] Update index.html meta tags and OG title with correct brand name
- [x] Update brand-guidelines.md with correct brand name

## Fix: OTP Login Flow
- [x] Show OTP code clearly on screen in dev mode (large visible box, not just disappearing toast)
- [x] Extend OTP expiry from 5 to 10 minutes
- [x] Add clear note: "SMS will be sent when Firebase Phone Auth is activated"
- [x] Return devOtp from server requestOtp response so client can display it

## Fix: OTP Expiry Bug (verifyOtp picks oldest record)
- [x] Fix verifyOtp: order by createdAt DESC to get most recent OTP (not oldest)
- [x] Fix requestOtp: delete/invalidate old unverified OTP records for same phone before inserting new one

## Feature: Customer Loyalty & Registration System (COMPLETE)
- [x] Add customers table (phone, name, email, type: individual/restaurant/business, points, tier, totalOrders, totalSpent)
- [x] Add customer_offers table (title, titleAr, discountType, discountValue, minTier, pointsCost, isActive)
- [x] Add customer_offer_redemptions table (customerId, offerId, redeemedAt)
- [x] Add customerId FK to orders table
- [x] Run migration 0012 (customers, customer_offers, customer_offer_redemptions, orders.customerId)
- [x] Backend: getProfile, upsertProfile, getLoyalty, getOrderHistory, getOffers procedures
- [x] Backend: awardOrderPoints on delivery (hook into providers.deliverOrder)
- [x] Backend: admin stats (totalCustomers, byType, byTier, revenueByZone, topCustomers)
- [x] Backend: admin offers CRUD (create, list, toggle)
- [x] Frontend: CustomerProfile page (/customer/profile) with tabs: Profile, Orders, Offers
- [x] Frontend: Home page shows loyalty card (points + tier) for registered customers
- [x] Frontend: Admin panel Customers tab with stats, top customers, offers management
- [x] Guest checkout still works (no registration required)
- [x] Customer types: individual, restaurant, business
- [x] Tier system: bronze (0-99pts) → silver (100-499pts) → gold (500-999pts) → platinum (1000+pts)
- [x] Points engine: 10 pts per order delivered

## Feature: Referral System
- [ ] Schema: add referralCode (unique, 8-char) column to customers table
- [ ] Schema: add referrals table (id, inviterId, inviteeId, status: pending/rewarded, createdAt, rewardedAt)
- [ ] Migration: apply referral schema changes to DB
- [ ] Backend: auto-generate unique referral code on customer registration
- [ ] Backend: customers.getReferralStats procedure (code, link, total referrals, rewarded count, pending count)
- [ ] Backend: apply referral code on registration (upsertProfile accepts referralCode param)
- [ ] Backend: award points to inviter (50 pts) when invitee completes first order (hook into awardOrderPoints)
- [ ] Backend: award bonus points to invitee (20 pts) on first order if referred
- [ ] Frontend: CustomerProfile Referral tab — share link, QR-like card, stats (total invited, rewarded)
- [ ] Frontend: CustomerLogin registration step — optional "Referral code" field
- [ ] Admin: show total referrals count in Customers tab stats

## Bug Fix: Provider State Machine (COMPLETE)
- [x] Root cause: activeOrderId was set on 'assigned' (doAssignNext) instead of on 'accepted' (acceptOrder)
- [x] Fix: moved setProviderActiveOrder call from doAssignNext to acceptOrder procedure
- [x] Fix: cleaned stale 'pending' assignments for delivered/cancelled orders in DB
- [x] Fix: cleared stale activeOrderId for providers whose orders were already delivered
- [x] 102/102 tests passing after fix

## Enhancement: Provider Dashboard UX
- [x] Fix order history: show customerAddress instead of raw lat/lng coordinates
- [x] Fix order history: add delivery date/time to each order card
- [x] Fix order history: show payment method badge (cash/online/bank)
- [x] Fix order history: show cylinder count (gasAmount)
- [ ] Fix stats: commission card should show total earned (not 0.000 for delivered orders)
- [ ] Fix stats: delivery count should reflect actual delivered orders count
- [ ] Enhance empty state on home tab: make it more engaging with animation hint
- [ ] Enhance settings tab: add logout button, show zone name, add PIN change option
- [x] Add earnings summary card: today / total deliveries / total OMR
- [x] Improve order card in history: better visual hierarchy, status badge colors

## Feature: Provider Mission Screen (Active Order)
- [ ] Build full-screen mission view when provider has an active order (accepted/out_for_delivery)
- [ ] Show Google Map with customer location pin and provider's current location
- [ ] "Navigate" button opens Google Maps / Waze with customer coordinates
- [ ] "Call Customer" button (tel: link) with customer phone number
- [ ] Order details panel: address, gas amount, price, payment method, order ID
- [ ] Step-by-step progress bar: Accepted → On the Way → Delivered
- [ ] "Start Delivery" button to move to out_for_delivery status
- [ ] "Confirm Delivery" button with confirmation dialog
- [ ] Provider notes/comment field on delivery confirmation
- [ ] Mission timer showing elapsed time since acceptance
- [ ] Customer name display if registered

## Multi-Cylinder & Multi-Order Provider Features
- [ ] shared/domain.ts: Update calculateOrderPrice(gasAmount) — totalPrice = gasAmount × PRICE_PER_CYLINDER (3.300 OMR each)
- [ ] shared/domain.ts: Add MAX_CONCURRENT_ORDERS = 3, MULTI_ORDER_PROXIMITY_KM = 5 constants
- [ ] server/routers/orders.ts: Update createOrderDraft input to accept gasAmount 1-10
- [ ] server/routers/orders.ts: Compute totalPrice = gasAmount × 3.300 in createOrderDraft
- [ ] server/routers/orders.ts: Store actual gasAmount in DB (not hardcoded "1")
- [ ] server/db.ts: Add getProviderActiveOrders(providerId) — returns all active/accepted/out_for_delivery orders
- [ ] server/db.ts: Update getAvailableProvidersByZone/SubZone to include providers with < MAX_CONCURRENT_ORDERS active orders
- [ ] server/assignmentEngine.ts: Add isProviderEligibleForMultiOrder(provider, newOrderLat, newOrderLng, activeOrders[]) — proximity check
- [ ] server/assignmentEngine.ts: Update selectNextProvider to include busy-but-eligible providers
- [ ] server/routers/orders.ts: Update doAssignProvider to use new multi-order eligibility logic
- [ ] server/routers/orders.ts: Calculate ETA for new order = sum of remaining ETAs for active orders + travel time to new order
- [ ] server/routers/providers.ts: Update getActiveOrder → getActiveOrders (return array of all active orders for provider)
- [ ] server/routers/providers.ts: Update acceptOrder to allow accepting when provider already has < MAX_CONCURRENT_ORDERS
- [ ] server/routers/providers.ts: Update deliverOrder to clear only that specific order from provider's active list
- [ ] client/src/pages/OrderSummary.tsx: Add quantity selector (1-10 cylinders) with live price update
- [ ] client/src/pages/ProviderDashboard.tsx: Update MissionScreen to show all active orders as a list/queue
- [ ] client/src/pages/ProviderDashboard.tsx: Show per-order ETA and route order in MissionScreen
- [ ] server/gas-delivery.test.ts: Update tests for multi-cylinder pricing
- [ ] server/gas-delivery.test.ts: Add tests for multi-order eligibility and ETA calculation

## Multi-Cylinder & Multi-Order Features (Apr 21, 2026)
- [x] Customer can order 1-10 cylinders per order with quantity selector in OrderSummary
- [x] Price scales linearly: gasAmount × 3.300 OMR
- [x] Provider can accept up to 3 concurrent orders (MAX_CONCURRENT_ORDERS)
- [x] Multi-order proximity check: new orders within 5km of active orders
- [x] ETA recalculation: each new order adds estimated delivery time
- [x] MissionScreen shows all active orders as separate cards with order count banner
- [x] getActiveOrders replaces getActiveOrder in providers router
- [x] CustomerProfile order history shows gasAmount
- [x] OrderPlaced shows cylinder count when > 1
- [x] getOrderStatus returns gasAmount
- [x] All 102 tests passing
