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
- [ ] [POST-MVP] Browser Web Push to providers/customers (notifyOwner() is current server-side fallback)
- [ ] [POST-MVP] Live customer map with provider zone overlay (LocationPicker map handles delivery selection only)
- [ ] [POST-MVP] Phone OTP auth for customers (no login wall per requirements; phone is optional field)
- [ ] [POST-MVP] Admin panel for order management

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
