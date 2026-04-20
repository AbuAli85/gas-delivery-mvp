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

- [ ] [POST-MVP] Real Stripe card collection (requires STRIPE_SECRET_KEY secret; mock is current fallback)
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
