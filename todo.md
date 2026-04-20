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

## Deferred (Post-MVP — Not in current scope)
- [ ] Stripe.js client-side card collection (real Stripe requires STRIPE_SECRET_KEY; mock payment is the MVP fallback)
- [ ] Browser Web Push notifications to providers/customers (owner notifyOwner() is the MVP fallback)
- [ ] Live map with customer location + provider zone overlay
- [ ] Phone OTP auth for customers (no login wall per requirements; phone field is optional on order)
- [ ] Admin panel for order management

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
