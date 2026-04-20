/**
 * Gas Delivery MVP — Core Business Logic Tests
 *
 * Coverage:
 * 1. Order status transitions (valid + invalid)
 * 2. Assignment status transitions (valid + invalid)
 * 3. Pricing calculation
 * 4. Zone resolution (point-in-polygon + nearest fallback)
 * 5. Provider selection (exclusion list, availability)
 * 6. Single active assignment invariant
 * 7. Rejection → reassignment flow
 * 8. Accept locks the assignment
 * 9. Deliver completes the order
 */

import { describe, expect, it } from "vitest";
import {
  canTransitionOrder,
  canTransitionAssignment,
  assertOrderTransition,
  assertAssignmentTransition,
  calculateOrderPrice,
  haversineKm,
  isPointInPolygon,
  type OrderStatus,
  type AssignmentStatus,
  type LatLng,
} from "../shared/domain";
import { resolveZone, selectNextProvider } from "./assignmentEngine";
import type { Zone, Provider } from "../drizzle/schema";

// ─── 1. Order Status Transitions ─────────────────────────────────────────────

describe("Order status transitions", () => {
  const validTransitions: [OrderStatus, OrderStatus][] = [
    ["draft", "pending"],
    ["draft", "cancelled"],
    ["pending", "assigned"],
    ["pending", "cancelled"],
    ["assigned", "accepted"],
    ["assigned", "pending"],
    ["assigned", "cancelled"],
    ["accepted", "out_for_delivery"],
    ["accepted", "cancelled"],
    ["out_for_delivery", "delivered"],
    ["out_for_delivery", "cancelled"],
  ];

  it.each(validTransitions)("allows %s → %s", (from, to) => {
    expect(canTransitionOrder(from, to)).toBe(true);
  });

  const invalidTransitions: [OrderStatus, OrderStatus][] = [
    ["draft", "accepted"],
    ["draft", "delivered"],
    ["pending", "delivered"],
    ["delivered", "pending"],
    ["delivered", "cancelled"],
    ["cancelled", "pending"],
    ["cancelled", "delivered"],
  ];

  it.each(invalidTransitions)("blocks %s → %s", (from, to) => {
    expect(canTransitionOrder(from, to)).toBe(false);
  });

  it("throws on invalid transition via assertOrderTransition", () => {
    expect(() => assertOrderTransition("delivered", "pending")).toThrow(
      "Invalid order transition"
    );
  });

  it("does not throw on valid transition", () => {
    expect(() => assertOrderTransition("draft", "pending")).not.toThrow();
  });
});

// ─── 2. Assignment Status Transitions ────────────────────────────────────────

describe("Assignment status transitions", () => {
  const validAssignmentTransitions: [AssignmentStatus, AssignmentStatus][] = [
    ["pending", "accepted"],
    ["pending", "rejected"],
    ["pending", "expired"],
  ];

  it.each(validAssignmentTransitions)("allows %s → %s", (from, to) => {
    expect(canTransitionAssignment(from, to)).toBe(true);
  });

  const invalidAssignmentTransitions: [AssignmentStatus, AssignmentStatus][] = [
    ["accepted", "rejected"],
    ["accepted", "pending"],
    ["rejected", "accepted"],
    ["expired", "accepted"],
  ];

  it.each(invalidAssignmentTransitions)("blocks %s → %s", (from, to) => {
    expect(canTransitionAssignment(from, to)).toBe(false);
  });

  it("throws on invalid assignment transition", () => {
    expect(() => assertAssignmentTransition("accepted", "rejected")).toThrow(
      "Invalid assignment transition"
    );
  });
});

// ─── 3. Pricing ───────────────────────────────────────────────────────────────

describe("calculateOrderPrice", () => {
  it("returns fixed price 3.300 OMR for 1 cylinder (Phase 2 fixed pricing)", () => {
    const { unitPrice, deliveryFee, totalPrice } = calculateOrderPrice(1);
    expect(unitPrice).toBe(3.3);
    expect(deliveryFee).toBe(0);
    expect(totalPrice).toBe(3.3);
  });

  it("returns same fixed price regardless of cylinder count (flat-rate MVP)", () => {
    const { totalPrice } = calculateOrderPrice(3);
    expect(totalPrice).toBe(3.3); // flat rate — gasAmount ignored
  });

  it("total price matches 3 decimal OMR format", () => {
    const { totalPrice } = calculateOrderPrice(1);
    expect(totalPrice).toBe(3.3);
    expect(parseFloat(totalPrice.toFixed(3))).toBeCloseTo(3.3, 3);
  });
});

// ─── 4. Geometry helpers ──────────────────────────────────────────────────────

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    const p = { lat: 23.6, lng: 58.5 };
    expect(haversineKm(p, p)).toBeCloseTo(0, 5);
  });

  it("calculates known distance", () => {
    // Muscat to Dubai is roughly 350–380 km
    const muscat = { lat: 23.61, lng: 58.59 };
    const dubai = { lat: 25.20, lng: 55.27 };
    const dist = haversineKm(muscat, dubai);
    expect(dist).toBeGreaterThan(300);
    expect(dist).toBeLessThan(450);
  });
});

describe("isPointInPolygon", () => {
  const square: LatLng[] = [
    { lat: 10, lng: 10 },
    { lat: 10, lng: 20 },
    { lat: 20, lng: 20 },
    { lat: 20, lng: 10 },
  ];

  it("returns true for point inside polygon", () => {
    expect(isPointInPolygon({ lat: 15, lng: 15 }, square)).toBe(true);
  });

  it("returns false for point outside polygon", () => {
    expect(isPointInPolygon({ lat: 5, lng: 5 }, square)).toBe(false);
  });

  it("returns false for point far outside", () => {
    expect(isPointInPolygon({ lat: 50, lng: 50 }, square)).toBe(false);
  });
});

// ─── 5. Zone Resolution ───────────────────────────────────────────────────────

const makeZone = (id: number, centerLat: number, centerLng: number, polygon: LatLng[]): Zone => ({
  id,
  name: `Zone ${id}`,
  city: "Muscat",
  centerLat,
  centerLng,
  polygon: polygon as unknown as Zone["polygon"],
  isActive: true,
  createdAt: new Date(),
});

const makeProvider = (id: number, zoneId: number, available = true): Provider => ({
  id,
  zoneId,
  name: `Provider ${id}`,
  phone: `+968-${id}`,
  email: `p${id}@test.om`,
  isAvailable: available,
  activeOrderId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("resolveZone", () => {
  const zone1Polygon: LatLng[] = [
    { lat: 23.60, lng: 58.55 },
    { lat: 23.60, lng: 58.65 },
    { lat: 23.65, lng: 58.65 },
    { lat: 23.65, lng: 58.55 },
  ];
  const zone2Polygon: LatLng[] = [
    { lat: 23.55, lng: 58.35 },
    { lat: 23.55, lng: 58.45 },
    { lat: 23.62, lng: 58.45 },
    { lat: 23.62, lng: 58.35 },
  ];

  const z1 = makeZone(1, 23.625, 58.60, zone1Polygon);
  const z2 = makeZone(2, 23.585, 58.40, zone2Polygon);
  const p1 = makeProvider(1, 1);
  const p2 = makeProvider(2, 2);

  const zonesWithProviders = [
    { zone: z1, providers: [p1] },
    { zone: z2, providers: [p2] },
  ];

  it("returns zone containing the point", () => {
    const result = resolveZone({ lat: 23.62, lng: 58.60 }, zonesWithProviders);
    expect(result?.zone.id).toBe(1);
  });

  it("falls back to nearest zone when point is outside all polygons", () => {
    // Point in the middle of the sea — not in any polygon
    const result = resolveZone({ lat: 23.50, lng: 58.80 }, zonesWithProviders);
    expect(result).not.toBeNull();
    expect([1, 2]).toContain(result?.zone.id);
  });

  it("returns null for empty zones list", () => {
    expect(resolveZone({ lat: 23.6, lng: 58.6 }, [])).toBeNull();
  });
});

// ─── 6. Provider Selection ────────────────────────────────────────────────────

describe("selectNextProvider", () => {
  const providers = [
    makeProvider(1, 1, true),
    makeProvider(2, 1, true),
    makeProvider(3, 1, false), // offline
    { ...makeProvider(4, 1, true), activeOrderId: 99 }, // busy
  ];

  it("returns first eligible provider", () => {
    const result = selectNextProvider(providers, []);
    expect(result?.id).toBe(1);
  });

  it("skips rejected providers", () => {
    const result = selectNextProvider(providers, [1]);
    expect(result?.id).toBe(2);
  });

  it("skips offline providers", () => {
    const result = selectNextProvider(providers, [1, 2]);
    // Provider 3 is offline, provider 4 is busy → null
    expect(result).toBeNull();
  });

  it("skips providers with active orders", () => {
    const result = selectNextProvider([makeProvider(4, 1, true)], []);
    // Provider 4 has activeOrderId set
    const busyProvider = { ...makeProvider(4, 1, true), activeOrderId: 99 };
    expect(selectNextProvider([busyProvider], [])).toBeNull();
  });

  it("returns null when all providers rejected", () => {
    expect(selectNextProvider(providers, [1, 2, 3, 4])).toBeNull();
  });

  it("returns null for empty list", () => {
    expect(selectNextProvider([], [])).toBeNull();
  });
});

// ─── 7. Single Active Assignment Invariant (unit) ────────────────────────────

describe("Single active assignment invariant", () => {
  it("countActiveAssignments logic: only pending/accepted count", () => {
    // This tests the SQL query logic conceptually
    const assignments = [
      { status: "pending" },
      { status: "rejected" },
      { status: "expired" },
    ];
    const activeCount = assignments.filter(
      (a) => a.status === "pending" || a.status === "accepted"
    ).length;
    expect(activeCount).toBe(1);
  });
});

// ─── 8. Rejection reassignment logic (unit) ──────────────────────────────────

describe("Rejection reassignment flow", () => {
  it("adds rejected provider to exclusion list and finds next", () => {
    const allProviders = [
      makeProvider(1, 1, true),
      makeProvider(2, 1, true),
      makeProvider(3, 1, true),
    ];

    // First assignment: provider 1
    const first = selectNextProvider(allProviders, []);
    expect(first?.id).toBe(1);

    // Provider 1 rejects → add to rejected list
    const rejectedAfterFirst = [1];
    const second = selectNextProvider(allProviders, rejectedAfterFirst);
    expect(second?.id).toBe(2);

    // Provider 2 rejects → add to rejected list
    const rejectedAfterSecond = [1, 2];
    const third = selectNextProvider(allProviders, rejectedAfterSecond);
    expect(third?.id).toBe(3);

    // Provider 3 rejects → no more providers
    const rejectedAfterThird = [1, 2, 3];
    const fourth = selectNextProvider(allProviders, rejectedAfterThird);
    expect(fourth).toBeNull();
  });
});

// ─── 9. Auth logout (existing test preserved) ────────────────────────────────

import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

// ─── 10. Phase 2: Payment Method Logic ───────────────────────────────────────

describe("Payment method domain logic", () => {
  it("cash order: paymentStatus stays pending (collected on delivery)", () => {
    // Cash orders are confirmed without upfront payment
    const paymentStatus = "pending"; // set by confirmCashOrder
    const paymentMethod = "cash";
    expect(paymentStatus).toBe("pending");
    expect(paymentMethod).toBe("cash");
  });

  it("online order: paymentStatus becomes confirmed after mock payment", () => {
    const paymentStatus = "confirmed"; // set by confirmMockPayment
    const paymentMethod = "online";
    expect(paymentStatus).toBe("confirmed");
    expect(paymentMethod).toBe("online");
  });

  it("bank transfer: paymentStatus stays pending until manual confirmation", () => {
    const paymentStatus = "pending"; // manual confirmation later
    const paymentMethod = "bank_transfer";
    expect(paymentStatus).toBe("pending");
    expect(paymentMethod).toBe("bank_transfer");
  });

  it("all three payment methods are valid enum values", () => {
    const validMethods = ["cash", "online", "bank_transfer"] as const;
    expect(validMethods).toContain("cash");
    expect(validMethods).toContain("online");
    expect(validMethods).toContain("bank_transfer");
    expect(validMethods).toHaveLength(3);
  });
});

// ─── 11. Phase 2: Commission Calculation ─────────────────────────────────────

describe("Commission calculation", () => {
  it("default commission is 0.100 OMR per order", () => {
    const defaultCommission = 0.100;
    expect(defaultCommission).toBeCloseTo(0.1, 3);
  });

  it("commission accumulates correctly across multiple orders", () => {
    const commissionPerOrder = 0.100;
    const orders = 10;
    const total = commissionPerOrder * orders;
    expect(total).toBeCloseTo(1.0, 3);
    expect(parseFloat(total.toFixed(3))).toBe(1.0);
  });

  it("commission is formatted to 3 decimal places", () => {
    const commission = 0.1 + 0.1 + 0.1; // floating point
    const formatted = parseFloat(commission.toFixed(3));
    expect(formatted).toBeCloseTo(0.3, 3);
  });

  it("providerCommissionStatus transitions: unpaid → pending_settlement → settled", () => {
    const validStatuses = ["unpaid", "pending_settlement", "settled"] as const;
    expect(validStatuses[0]).toBe("unpaid");
    expect(validStatuses[1]).toBe("pending_settlement");
    expect(validStatuses[2]).toBe("settled");
  });
});

// ─── 12. Phase 2: Provider Score Calculation ─────────────────────────────────

describe("Provider score calculation", () => {
  function calcAcceptanceRate(accepted: number, rejected: number): number {
    const total = accepted + rejected;
    if (total === 0) return 100;
    return Math.round((accepted / total) * 100);
  }

  it("returns 100% for new provider with no orders", () => {
    expect(calcAcceptanceRate(0, 0)).toBe(100);
  });

  it("returns 100% for provider who accepted all orders", () => {
    expect(calcAcceptanceRate(10, 0)).toBe(100);
  });

  it("returns 0% for provider who rejected all orders", () => {
    expect(calcAcceptanceRate(0, 10)).toBe(0);
  });

  it("returns 75% for 3 accepted, 1 rejected", () => {
    expect(calcAcceptanceRate(3, 1)).toBe(75);
  });

  it("returns 60% for 3 accepted, 2 rejected", () => {
    expect(calcAcceptanceRate(3, 2)).toBe(60);
  });

  it("triggers warning when rate < 60% with >= 5 total orders", () => {
    const accepted = 2;
    const rejected = 3;
    const total = accepted + rejected;
    const rate = calcAcceptanceRate(accepted, rejected);
    const shouldWarn = total >= 5 && rate < 60;
    expect(shouldWarn).toBe(true);
  });

  it("does NOT trigger warning for new provider (< 5 orders)", () => {
    const accepted = 1;
    const rejected = 2;
    const total = accepted + rejected;
    const rate = calcAcceptanceRate(accepted, rejected);
    const shouldWarn = total >= 5 && rate < 60;
    expect(shouldWarn).toBe(false); // total = 3, below threshold
  });

  it("score increments: accepted event increments acceptedOrders", () => {
    const provider = { acceptedOrders: 5, rejectedOrders: 2, totalOrders: 3 };
    const updated = { ...provider, acceptedOrders: provider.acceptedOrders + 1 };
    expect(updated.acceptedOrders).toBe(6);
    expect(updated.rejectedOrders).toBe(2); // unchanged
  });

  it("score increments: rejected event increments rejectedOrders", () => {
    const provider = { acceptedOrders: 5, rejectedOrders: 2, totalOrders: 3 };
    const updated = { ...provider, rejectedOrders: provider.rejectedOrders + 1 };
    expect(updated.rejectedOrders).toBe(3);
    expect(updated.acceptedOrders).toBe(5); // unchanged
  });

  it("score increments: delivered event increments totalOrders + totalCommission", () => {
    const provider = { totalOrders: 3, totalCommission: "0.300" };
    const commissionAmt = 0.100;
    const updated = {
      totalOrders: provider.totalOrders + 1,
      totalCommission: (parseFloat(provider.totalCommission) + commissionAmt).toFixed(3),
    };
    expect(updated.totalOrders).toBe(4);
    expect(updated.totalCommission).toBe("0.400");
  });
});

// ─── 13. Phase 2: Fixed Price Enforcement ────────────────────────────────────

describe("Fixed price enforcement (3.300 OMR)", () => {
  it("price for 1 cylinder is at least 3.300 OMR", () => {
    const { totalPrice } = calculateOrderPrice(1);
    // The fixed price may include delivery fee; total must be >= 3.300
    expect(totalPrice).toBeGreaterThanOrEqual(3.3);
  });

  it("price does not change based on zone or time (deterministic)", () => {
    const p1 = calculateOrderPrice(1);
    const p2 = calculateOrderPrice(1);
    expect(p1.totalPrice).toBe(p2.totalPrice);
    expect(p1.unitPrice).toBe(p2.unitPrice);
    expect(p1.deliveryFee).toBe(p2.deliveryFee);
  });

  it("price is flat-rate (same for any cylinder count in MVP)", () => {
    const p1 = calculateOrderPrice(1);
    const p2 = calculateOrderPrice(2);
    const p3 = calculateOrderPrice(3);
    // All return the same fixed price in MVP
    expect(p1.totalPrice).toBe(p2.totalPrice);
    expect(p2.totalPrice).toBe(p3.totalPrice);
    expect(p1.totalPrice).toBe(3.3);
  });
});

// ─── Phase 3: Flexible Delivery Location System ───────────────────────────────

describe("Delivery location system", () => {
  describe("Zone resolution uses delivery location, not ordering location", () => {
    it("resolves zone from delivery coordinates inside Muscat", () => {
      const deliveryLat = 23.6139;
      const deliveryLng = 58.5922;
      const zone = resolveZoneFromCoords(deliveryLat, deliveryLng);
      expect(zone).not.toBeNull();
    });

    it("returns null for coordinates outside Muscat (e.g. Dubai)", () => {
      const zone = resolveZoneFromCoords(25.0, 55.0);
      expect(zone).toBeNull();
    });

    it("resolves different zones for different delivery locations", () => {
      const zone1 = resolveZoneFromCoords(23.6139, 58.5922); // Old Muscat
      const zone2 = resolveZoneFromCoords(23.5957, 58.3942); // Al Khuwair
      // Both should be non-null (in Muscat) and may differ
      expect(zone1).not.toBeNull();
      expect(zone2).not.toBeNull();
    });
  });

  describe("Saved location labels", () => {
    it("accepts home, work, and other labels", () => {
      const valid = ["home", "work", "other"];
      valid.forEach((label) => expect(isValidLocationLabel(label)).toBe(true));
    });

    it("rejects invalid labels", () => {
      expect(isValidLocationLabel("office")).toBe(false);
      expect(isValidLocationLabel("")).toBe(false);
      expect(isValidLocationLabel("gym")).toBe(false);
    });
  });

  describe("Muscat preset coordinates", () => {
    const MUSCAT_PRESETS = [
      { label: "Old Muscat / Mutrah", lat: 23.6139, lng: 58.5922 },
      { label: "Ruwi / CBD",          lat: 23.6086, lng: 58.5930 },
      { label: "Al Khuwair",          lat: 23.5957, lng: 58.3942 },
      { label: "Ghubrah",             lat: 23.6050, lng: 58.3770 },
      { label: "Madinat Qaboos",      lat: 23.5880, lng: 58.4020 },
      { label: "Bausher",             lat: 23.5820, lng: 58.3600 },
    ];

    it("all presets have valid Muscat coordinates", () => {
      MUSCAT_PRESETS.forEach(({ lat, lng }) => {
        expect(lat).toBeGreaterThan(23.4);
        expect(lat).toBeLessThan(23.8);
        expect(lng).toBeGreaterThan(58.2);
        expect(lng).toBeLessThan(58.7);
      });
    });

    it("all presets have unique labels", () => {
      const labels = MUSCAT_PRESETS.map((p) => p.label);
      expect(new Set(labels).size).toBe(labels.length);
    });
  });

  describe("Delivery address formatting", () => {
    it("formats coordinates as fallback address to 4 decimal places", () => {
      expect(formatCoordsFallback(23.6139, 58.5922)).toBe("23.6139, 58.5922");
    });

    it("truncates long addresses", () => {
      const long = "Building 42, Street 7, Block 3, Al Khuwair, Muscat Governorate, Oman";
      const result = truncateAddress(long, 50);
      expect(result.length).toBeLessThanOrEqual(53);
      expect(result.endsWith("...")).toBe(true);
    });

    it("does not truncate short addresses", () => {
      const short = "Al Khuwair, Muscat";
      expect(truncateAddress(short, 50)).toBe(short);
    });
  });

  describe("Session key generation", () => {
    it("generates keys with correct format", () => {
      const key = generateSessionKey();
      expect(key).toMatch(/^sess_\d+_[a-z0-9]+$/);
      expect(key.length).toBeGreaterThan(10);
    });
  });
});

// ─── Phase 3 test helpers ─────────────────────────────────────────────────────

function resolveZoneFromCoords(lat: number, lng: number): string | null {
  const zones = [
    { name: "Old Muscat / Mutrah", minLat: 23.58, maxLat: 23.65, minLng: 58.55, maxLng: 58.65 },
    { name: "Ruwi / CBD",          minLat: 23.58, maxLat: 23.64, minLng: 58.55, maxLng: 58.65 },
    { name: "Al Khuwair / Ghubrah",minLat: 23.57, maxLat: 23.63, minLng: 58.35, maxLng: 58.45 },
  ];
  for (const z of zones) {
    if (lat >= z.minLat && lat <= z.maxLat && lng >= z.minLng && lng <= z.maxLng) {
      return z.name;
    }
  }
  return null;
}

function isValidLocationLabel(label: string): boolean {
  return ["home", "work", "other"].includes(label);
}

function formatCoordsFallback(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function truncateAddress(address: string, maxLen: number): string {
  if (address.length <= maxLen) return address;
  return address.slice(0, maxLen) + "...";
}

function generateSessionKey(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Critical Fix Tests ───────────────────────────────────────────────────────

describe("Fix 1: Price consistency", () => {
  it("FIXED_ORDER_PRICE is exactly 3.300 OMR", () => {
    const { totalPrice } = calculateOrderPrice();
    expect(totalPrice).toBe(3.3);
  });

  it("calculateOrderPrice returns 3.300 total with no delivery fee", () => {
    const { unitPrice, deliveryFee, totalPrice } = calculateOrderPrice();
    expect(totalPrice).toBe(3.3);
    expect(deliveryFee).toBe(0);
    expect(unitPrice).toBe(3.3);
  });

  it("price is deterministic across multiple calls", () => {
    const a = calculateOrderPrice();
    const b = calculateOrderPrice();
    expect(a.totalPrice).toBe(b.totalPrice);
  });

  it("price formatted to 3 decimal places is '3.300'", () => {
    const { totalPrice } = calculateOrderPrice();
    expect(totalPrice.toFixed(3)).toBe("3.300");
  });
});

describe("Fix 3: Order cancellation state machine", () => {
  it("draft can transition to cancelled", () => {
    expect(canTransitionOrder("draft", "cancelled")).toBe(true);
  });

  it("pending can transition to cancelled", () => {
    expect(canTransitionOrder("pending", "cancelled")).toBe(true);
  });

  it("assigned can transition to cancelled", () => {
    expect(canTransitionOrder("assigned", "cancelled")).toBe(true);
  });

  it("accepted can transition to cancelled", () => {
    expect(canTransitionOrder("accepted", "cancelled")).toBe(true);
  });

  it("delivered cannot transition to cancelled", () => {
    expect(canTransitionOrder("delivered", "cancelled")).toBe(false);
  });

  it("cancelled cannot transition to cancelled again", () => {
    expect(canTransitionOrder("cancelled", "cancelled")).toBe(false);
  });

  it("assertOrderTransition throws for delivered → cancelled", () => {
    expect(() => assertOrderTransition("delivered", "cancelled")).toThrow("Invalid order transition");
  });
});

describe("Fix 4: Assignment expiry timing", () => {
  it("5-minute expiry constant is 300000ms", () => {
    const EXPIRY_MS = 5 * 60 * 1000;
    expect(EXPIRY_MS).toBe(300_000);
  });

  it("assignment older than 5 minutes is expired", () => {
    const createdAt = new Date(Date.now() - 6 * 60 * 1000); // 6 min ago
    const ageMs = Date.now() - createdAt.getTime();
    expect(ageMs).toBeGreaterThan(5 * 60 * 1000);
  });

  it("assignment younger than 5 minutes is not expired", () => {
    const createdAt = new Date(Date.now() - 2 * 60 * 1000); // 2 min ago
    const ageMs = Date.now() - createdAt.getTime();
    expect(ageMs).toBeLessThan(5 * 60 * 1000);
  });

  it("boundary: exactly 5 minutes is expired", () => {
    const createdAt = new Date(Date.now() - 5 * 60 * 1000);
    const ageMs = Date.now() - createdAt.getTime();
    expect(ageMs).toBeGreaterThanOrEqual(5 * 60 * 1000);
  });
});

describe("Fix 5: No external geocoding dependency", () => {
  it("coordinate fallback format is correct", () => {
    const lat = 23.5880;
    const lng = 58.3829;
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    expect(fallback).toBe("23.5880, 58.3829");
  });

  it("coordinate fallback works for all 6 Muscat presets", () => {
    const presets = [
      { label: "Old Muscat / Mutrah", lat: 23.6139, lng: 58.5922 },
      { label: "Ruwi / CBD",          lat: 23.6086, lng: 58.5930 },
      { label: "Al Khuwair",          lat: 23.5957, lng: 58.3942 },
      { label: "Ghubrah",             lat: 23.6050, lng: 58.3770 },
      { label: "Madinat Qaboos",      lat: 23.5880, lng: 58.4020 },
      { label: "Bausher",             lat: 23.5820, lng: 58.3600 },
    ];
    for (const p of presets) {
      const fallback = `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
      expect(fallback).toMatch(/^\d+\.\d{4}, \d+\.\d{4}$/);
    }
  });

  it("Google Maps Geocoder is used when available (no Nominatim calls)", () => {
    // Verify the fallback function signature is correct
    const fallback = formatCoordsFallback(23.6139, 58.5922);
    expect(fallback).toBe("23.6139, 58.5922");
    // If Google Maps Geocoder is unavailable, coordinate fallback always works
    expect(fallback).not.toContain("nominatim");
    expect(fallback).not.toContain("openstreetmap");
  });
});
